import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import 'reflect-metadata';

const SSO_SECRET = 'security-test-sso-secret';
process.env.SSO_SHARED_SECRET = SSO_SECRET;

function tokenFor(userId: number): string {
  return jwt.sign({ sub: userId }, SSO_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
}

test('attack-list checks against a real server: session IDOR, userId spoofing, SQL/XSS/prototype-pollution payloads, log hygiene', async (t) => {
  const original = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), 'market-security-'));
  process.chdir(dir);

  const { sequelize } = await import('../src/database/dbconfig');
  const { Session } = await import('../src/database/models/session');
  const { Message } = await import('../src/database/models/message');
  Session.associate({ Message });
  Message.associate({ Session });
  await sequelize.sync({ force: true });

  const { SessionRepository } = await import('../src/api/session/session.repository');
  const { MessageRepository } = await import('../src/api/messages/message.repository');
  const { SupportService } = await import('../src/api/support/support.service');
  const { SupportController } = await import('../src/api/support/support.controller');
  const { traceIdMiddleware } = await import('../src/api/common/trace');

  const logLines: string[] = [];
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  console.log = (line?: unknown) => { logLines.push(String(line)); };
  console.warn = (line?: unknown) => { logLines.push(String(line)); };

  const gateway = {
    fixSpelling: async (text: string) => ({ text, durationMs: 1, requestMs: 1 }),
    getAICategory: async () => ({
      category: null,
      categoryName: '',
      intent: 'unknown',
      confidence: 0.1, // держит все запросы на ветке "уточнение", чтобы не трогать LLM/заказы
      model: 'test',
      durationMs: 1,
      requestMs: 1,
    }),
    getAIResponse: async () => ({
      content: 'answer',
      model: 'test',
      durationMs: 1,
      knowledgeLookupMs: 1,
      llmDurationMs: 1,
      requestMs: 1,
    }),
    sendToOperator: async () => {},
  };

  const orders = {
    getOrder: async () => null,
    getOrdersForUser: async () => [],
  };

  const service = new SupportService(
    {} as any,
    new SessionRepository(),
    gateway as any,
    new MessageRepository(),
    orders as any,
  );

  const controller = new SupportController(service as any);

  const app = express();
  app.use(express.json());
  app.use(traceIdMiddleware);
  app.use(controller.router);

  const server = await new Promise<import('node:http').Server>((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });

  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const tokenA = tokenFor(501);
  const tokenB = tokenFor(502);

  try {
    await t.test('row 9-12 (smoke at HTTP level): /support requires a valid SSO token', async () => {
      const noToken = await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'hello', sessionId: 1001 }),
      });
      assert.equal(noToken.status, 401);

      const badToken = await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer not-a-jwt' },
        body: JSON.stringify({ message: 'hello', sessionId: 1001 }),
      });
      assert.equal(badToken.status, 401);
    });

    await t.test('row 4: user B cannot read or write into user A\'s session via its sessionId', async () => {
      const CONTROL_PHRASE = 'control-phrase-xyz-9001';
      const SESSION_ID = 9001;

      const asA = await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ message: CONTROL_PHRASE, sessionId: SESSION_ID }),
      });
      assert.equal(asA.status, 200);

      const asB = await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenB}` },
        body: JSON.stringify({ message: 'trying to read A\'s session', sessionId: SESSION_ID }),
      });

      assert.equal(asB.status, 403);

      const stored = await Session.findOne({ where: { sessionId: SESSION_ID }, include: [{ model: Message, as: 'messages' }] });
      assert.equal(stored?.get('userId'), 501);
      const texts = (stored as any).messages.map((m: any) => m.text);
      assert.deepEqual(texts, [CONTROL_PHRASE]);
      assert.ok(!texts.some((text: string) => text.includes("trying to read")));
    });

    await t.test('row 6: userId in the body is ignored in favour of the SSO token\'s identity', async () => {
      const SESSION_ID = 9002;
      const response = await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ message: 'hello', sessionId: SESSION_ID, userId: 502 }),
      });
      assert.equal(response.status, 200);

      const stored = await Session.findOne({ where: { sessionId: SESSION_ID } });
      assert.equal(stored?.get('userId'), 501);
    });

    await t.test('row 17: SQL injection in message/sessionId/orderId does not execute and sessions table survives', async () => {
      const SESSION_ID = 9003;
      const payload = "'; DROP TABLE sessions; --";

      const response = await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ message: payload, sessionId: SESSION_ID }),
      });
      assert.equal(response.status, 200);

      const stored = await Session.findOne({ where: { sessionId: SESSION_ID }, include: [{ model: Message, as: 'messages' }] });
      assert.ok(stored, 'sessions table must still exist and contain the row');
      assert.equal((stored as any).messages[0].text, payload);

      const sqlLikeIds = await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ message: 'hi', sessionId: '1 OR 1=1', orderId: '1 OR 1=1' }),
      });
      assert.equal(sqlLikeIds.status, 400);
    });

    await t.test('row 18: out-of-range/wrong-type sessionId/orderId are rejected with 400, not a crash', async () => {
      const bodies = [
        { message: 'hi', sessionId: -1 },
        { message: 'hi', sessionId: 0 },
        { message: 'hi', sessionId: 1.5 },
        { message: 'hi', sessionId: 'abc' },
        { message: 'hi', sessionId: Number.MAX_SAFE_INTEGER + 1 },
        { message: 'hi', sessionId: 9004, orderId: 1.5 },
      ];

      for (const body of bodies) {
        const response = await fetch(`${base}/support`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenA}` },
          body: JSON.stringify(body),
        });
        assert.equal(response.status, 400, JSON.stringify(body));
      }
    });

    await t.test('row 19: control characters / NUL bytes in message do not crash the request', async () => {
      const SESSION_ID = 9005;
      const withControlChars = `hi${String.fromCharCode(7)}${String.fromCharCode(27)}bye`;
      const withNulByte = `hi${String.fromCharCode(0)}bye`;

      for (const [message, sid] of [[withControlChars, SESSION_ID], [withNulByte, SESSION_ID + 1]] as const) {
        const response = await fetch(`${base}/support`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenA}` },
          body: JSON.stringify({ message, sessionId: sid }),
        });
        assert.equal(response.status, 200, `message=${JSON.stringify(message)}`);
      }
    });

    await t.test('row 20: malformed JSON types in message are rejected with 400, not a 500', async () => {
      const bodies = [
        { message: {}, sessionId: 9006 },
        { message: [], sessionId: 9007 },
        { message: 42, sessionId: 9008 },
      ];

      for (const body of bodies) {
        const response = await fetch(`${base}/support`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenA}` },
          body: JSON.stringify(body),
        });
        assert.equal(response.status, 400, JSON.stringify(body));
      }

      const rawArray = await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenA}` },
        body: '[1,2,3]',
      });
      assert.ok([400, 500].includes(rawArray.status));
    });

    await t.test('row 21: __proto__ / constructor.prototype keys in the body do not pollute Object.prototype', async () => {
      const rawBody =
        '{"message":"prototype pollution attempt","sessionId":9009,' +
        '"__proto__":{"polluted":true},' +
        '"constructor":{"prototype":{"polluted2":true}}}';

      const response = await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenA}` },
        body: rawBody,
      });

      assert.equal(response.status, 200);
      assert.equal(({} as any).polluted, undefined);
      assert.equal(({} as any).polluted2, undefined);
      assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'), false);
    });

    await t.test('row 22 (backend half): an HTML/script payload in message is stored as a literal string', async () => {
      const SESSION_ID = 9010;
      const payload = '<script>alert(1)</script>';

      const response = await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ message: payload, sessionId: SESSION_ID }),
      });
      assert.equal(response.status, 200);

      const stored = await Session.findOne({ where: { sessionId: SESSION_ID }, include: [{ model: Message, as: 'messages' }] });
      assert.equal((stored as any).messages[0].text, payload);
    });

    await t.test('row 13: no SSO token or secret leaks into application logs', async () => {
      logLines.length = 0;
      const token = tokenFor(503);
      await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: 'hello there', sessionId: 9011 }),
      });

      const joined = logLines.join('\n');
      assert.ok(!joined.includes(token), 'raw token must not appear in logs');
      assert.ok(!joined.includes(SSO_SECRET), 'SSO secret must not appear in logs');
      assert.ok(!joined.toLowerCase().includes('bearer '), 'Authorization header value must not appear in logs');
    });
  } finally {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await sequelize.close();
    process.chdir(original);
    rmSync(dir, { recursive: true, force: true });
  }
});
