import express from 'express';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import 'reflect-metadata';
import { SupportController } from '../src/api/support/support.controller';

async function withServer(
  run: (base: string, calls: unknown[]) => Promise<void>,
) {
  const calls: unknown[] = [];

  const service = {
    handleSupportRequest: async (body: unknown) => {
      calls.push(body);
      return { type: 1, text: 'answer' };
    },

    getOrdersForUser: async (id: number) => {
      calls.push(id);

      return [
        {
          id: 1,
          userId: id,
          orderComposition: 'book',
          status: 'created',
          deliveryDate: '2026-01-01',
          secret: 'hidden',
        },
      ];
    },
  };

  const app = express();
  app.use(express.json());
  app.use(new SupportController(service as any).router);

  const server = await new Promise<import('node:http').Server>(
    (resolve, reject) => {
      const server = app.listen(0, '127.0.0.1', () => resolve(server));
      server.on('error', reject);
    },
  );

  try {
    const port = (server.address() as AddressInfo).port;
    await run(`http://127.0.0.1:${port}`, calls);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('HTTP hello returns the expected response', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/hello`);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'hello!');
  });
});

test('HTTP support validates requests before invoking the service', async () => {
  await withServer(async (base, calls) => {
    const invalidBodies = [
      {},
      { message: 'ab', userId: 1, sessionId: 2 },
      { message: 'hello', userId: '1', sessionId: 2 },
      { message: 'a'.repeat(301), userId: 1, sessionId: 2 },
    ];

    for (const body of invalidBodies) {
      const response = await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      assert.equal(response.status, 400);
      assert.ok((await response.json() as any).errors.length);
    }

    assert.equal(calls.length, 0);

    const response = await fetch(`${base}/support`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: 'hello',
        userId: 1,
        sessionId: 2,
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { type: 1, text: 'answer' });
    assert.equal(calls.length, 1);
  });
});

test('HTTP orders validates userId and returns only selected fields', async () => {
  await withServer(async (base, calls) => {
    const invalidQueries = [
      '',
      '?userId=0',
      '?userId=-1',
      '?userId=1.5',
      '?userId=abc',
      '?userId=1%20OR%201%3D1',
      '?userId=9007199254740992',
    ];

    for (const query of invalidQueries) {
      const response = await fetch(`${base}/orders${query}`);
      assert.equal(response.status, 400, query);
    }

    assert.equal(calls.length, 0);

    const response = await fetch(`${base}/orders?userId=7`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [
      {
        id: 1,
        orderComposition: 'book',
        status: 'created',
        deliveryDate: '2026-01-01',
      },
    ]);
    assert.deepEqual(calls, [7]);
  });
});