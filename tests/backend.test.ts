import axios from 'axios';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import 'reflect-metadata';
import { RequestCategory } from '../src/api/common/ml.enums';
import { GatewayService } from '../src/api/gateway/gateway.service';
import { SupportRequestDto } from '../src/api/support/dto/supportRequest.dto';
import { ResponseType } from '../src/api/support/dto/supportResponse.dto';
import { SupportService } from '../src/api/support/support.service';

const valid = { message: 'hello', userId: 5, sessionId: 10 };

test('DTO validates required fields, types and message length', async () => {
  const invalidCases = [
    {},
    { ...valid, userId: '5' },
    { ...valid, sessionId: 1.5 },
    { ...valid, orderId: '1' },
    { ...valid, message: '' },
    { ...valid, message: 'ab' },
    { ...valid, message: 'a'.repeat(301) },
    { ...valid, message: 42 },
  ];

  for (const data of invalidCases) {
    const errors = await validate(plainToInstance(SupportRequestDto, data));
    assert.ok(errors.length, JSON.stringify(data));
  }

  for (const message of ['abc', 'a'.repeat(300)]) {
    const dto = plainToInstance(SupportRequestDto, { ...valid, message });
    assert.equal((await validate(dto)).length, 0);
  }
});

function setup(
  category: RequestCategory | null,
  confidence: number,
  order: any = null,
  messages: any[] = [],
) {
  const calls: any[] = [];

  const gateway = {
    fixSpelling: async (text: string) => ({
      text,
      durationMs: 1,
      requestMs: 1,
    }),

    getAICategory: async () => ({
      category,
      confidence,
      intent: 'track_order',
      categoryName: 'ORDER',
      model: 'test',
      durationMs: 1,
      requestMs: 1,
    }),

    getAIResponse: async (...args: any[]) => {
      calls.push(['generate', ...args]);

      return {
        content: 'answer',
        model: 'test',
        durationMs: 1,
        knowledgeLookupMs: 1,
        llmDurationMs: 1,
        requestMs: 1,
      };
    },

    sendToOperator: async () => {
      calls.push(['operator']);
    },
  };

  const sessions = {
    getSession: async () => ({ id: 1, messages }),
    createSession: async () => ({ id: 1, messages: [] }),

    updateStatus: async (...args: any[]) => {
      calls.push(['status', ...args]);
    },
  };

  const orders = {
    getOrder: async (...args: any[]) => {
      calls.push(['order', ...args]);
      return order;
    },

    getOrdersForUser: async () => [],
  };

  const service = new SupportService(
    {} as any,
    sessions as any,
    gateway as any,
    { saveMessage: async () => {} } as any,
    orders as any,
  );

  return { service, calls };
}

test('low confidence requests clarification without generation', async () => {
  const { service, calls } = setup(RequestCategory.track_order, 0.3);

  const result = await service.handleSupportRequest({ ...valid } as any);

  assert.equal(result.type, ResponseType.DETAILSREQUEST);
  assert.ok(!calls.some((call) => call[0] === 'generate'));
});

test('order intent requires an order and checks ownership before generation', async () => {
  const missing = setup(RequestCategory.track_order, 0.9);

  assert.equal(
    (await missing.service.handleSupportRequest({ ...valid } as any, 'trace-1', 'token-1')).type,
    ResponseType.ORDERINFOREQUEST,
  );

  const foreign = setup(RequestCategory.track_order, 0.9);

  assert.equal(
    (
      await foreign.service.handleSupportRequest({
        ...valid,
        orderId: 9,
      } as any, 'trace-1', 'token-1')
    ).type,
    ResponseType.ORDERINFOREQUEST,
  );

  assert.deepEqual(
    foreign.calls.find((call) => call[0] === 'order'),
    ['order', 9, 'token-1', 'trace-1'],
  );

  assert.ok(!foreign.calls.some((call) => call[0] === 'generate'));

  const own = setup(RequestCategory.track_order, 0.9, {
    orderComposition: 'book',
    status: 'created',
    deliveryDate: 'tomorrow',
  });

  assert.equal(
    (
      await own.service.handleSupportRequest({
        ...valid,
        orderId: 9,
      } as any, 'trace-1', 'token-1')
    ).type,
    ResponseType.ANSWER,
  );

  assert.match(
    own.calls.find((call) => call[0] === 'generate')[3],
    /book/,
  );
});

test('order ownership check gives identical responses for a foreign order and a non-existent one', async () => {
  const foreign = setup(RequestCategory.track_order, 0.9);
  const nonexistent = setup(RequestCategory.track_order, 0.9);

  const foreignResponse = await foreign.service.handleSupportRequest({
    ...valid,
    orderId: 9,
  } as any);
  const nonexistentResponse = await nonexistent.service.handleSupportRequest({
    ...valid,
    orderId: 999999,
  } as any);

  assert.deepEqual(foreignResponse, nonexistentResponse);
});

test('human agent and message threshold send to operator', async () => {
  const fixtures = [
    setup(RequestCategory.human_agent, 0.9),
    setup(RequestCategory.track_order, 0.9, null, [
      { text: 'one' },
      { text: 'two' },
      { text: 'three' },
    ]),
  ];

  for (const fixture of fixtures) {
    const result = await fixture.service.handleSupportRequest({
      ...valid,
    } as any);

    assert.equal(result.type, ResponseType.OPERATOR);
    assert.ok(fixture.calls.some((call) => call[0] === 'operator'));
  }
});

test('ML gateway rejects malformed responses and propagates failures', async () => {
  const original = axios.post;

  try {
    const gateway = new GatewayService();

    axios.post = async () => ({ data: { processed: 42 } }) as any;
    await assert.rejects(
      gateway.fixSpelling('hello'),
      /invalid preprocessing/,
    );

    axios.post = async () =>
      ({ data: { intent: 'track_order', confidence: 2 } }) as any;
    await assert.rejects(
      gateway.getAICategory('hello'),
      /invalid classifier/,
    );

    axios.post = async () => ({ data: { content: '' } }) as any;
    await assert.rejects(
      gateway.getAIResponse('hello', 'test'),
      /empty answer/,
    );

    axios.post = async () => {
      throw new Error('timeout');
    };
    await assert.rejects(gateway.fixSpelling('hello'), /timeout/);
  } finally {
    axios.post = original;
  }
});

test('classification confidence boundaries follow current routing rules', async () => {
  const cases = [
    [0, ResponseType.DETAILSREQUEST],
    [0.3, ResponseType.DETAILSREQUEST],
    [0.3001, ResponseType.ANSWER],
    [0.85, ResponseType.ANSWER],
    [0.8501, ResponseType.ORDERINFOREQUEST],
  ] as const;

  for (const [confidence, expected] of cases) {
    const { service } = setup(RequestCategory.track_order, confidence);
    const result = await service.handleSupportRequest({ ...valid } as any);

    assert.equal(result.type, expected, `confidence=${confidence}`);
  }

  const unknown = setup(null, 0.9);
  const result = await unknown.service.handleSupportRequest({
    ...valid,
  } as any);

  assert.equal(result.type, ResponseType.DETAILSREQUEST);
});

test('session creation and reopening use the supplied identifiers', async () => {
  const { SessionStatus } = await import(
    '../src/api/session/entity/session.entity'
  );

  const calls: any[] = [];

  const session: any = {
    getSession: async () => null,

    createSession: async (...args: any[]) => {
      calls.push(['create', ...args]);
      return { id: 1 };
    },

    updateStatus: async (...args: any[]) => {
      calls.push(['update', ...args]);
    },
  };

  const service = new SupportService(
    {} as any,
    session,
    {} as any,
    {} as any,
    {} as any,
  );

  await service.handleSession({ ...valid } as any);
  assert.deepEqual(calls, [['create', 10, 5]]);

  session.getSession = async () => ({
    id: 1,
    status: SessionStatus.CLOSED,
  });

  await service.handleSession({ ...valid } as any);
  assert.deepEqual(calls[1], ['update', 10, 5, SessionStatus.OPEN]);

  session.getSession = async () => ({
    id: 1,
    status: SessionStatus.OPEN,
  });

  await service.handleSession({ ...valid } as any);
  assert.equal(calls.length, 2);
});

test('ML gateway sends expected payloads and maps successful responses', async () => {
  const original = axios.post;
  const previous = process.env.FASTAPI_HOST;
  const calls: any[] = [];

  process.env.FASTAPI_HOST = 'http://127.0.0.1:12345';

  try {
    axios.post = async (url: any, body: any) => {
      calls.push([url, body]);

      if (url.endsWith('/process')) {
        return { data: { processed: 'fixed', duration_ms: 2 } } as any;
      }

      if (url.endsWith('/classify')) {
        return {
          data: {
            intent: 'track_order',
            category: 'ORDER',
            confidence: 0.9,
            model: 'm',
            duration_ms: 3,
          },
        } as any;
      }

      return {
        data: {
          content: 'answer',
          model: 'g',
          duration_ms: 4,
          knowledge_lookup_ms: 1,
          llm_duration_ms: 2,
        },
      } as any;
    };

    const gateway = new GatewayService();

    assert.equal((await gateway.fixSpelling('helo')).text, 'fixed');

    assert.equal(
      (await gateway.getAICategory('fixed')).category,
      RequestCategory.track_order,
    );

    assert.equal(
      (await gateway.getAIResponse('context', 'track_order', 'order')).content,
      'answer',
    );

    assert.deepEqual(calls, [
      [
        'http://127.0.0.1:12345/assistant/process',
        { text: 'helo' },
      ],
      [
        'http://127.0.0.1:12345/assistant/classify',
        { text: 'fixed' },
      ],
      [
        'http://127.0.0.1:12345/assistant/generate-answer',
        {
          text: 'context',
          intent: 'track_order',
          order_context: 'order',
        },
      ],
    ]);
  } finally {
    axios.post = original;

    if (previous === undefined) {
      delete process.env.FASTAPI_HOST;
    } else {
      process.env.FASTAPI_HOST = previous;
    }
  }
});