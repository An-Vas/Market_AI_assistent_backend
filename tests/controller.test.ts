import express from 'express';
import jwt from 'jsonwebtoken';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import 'reflect-metadata';
import { SupportController } from '../src/api/support/support.controller';

const SSO_SECRET = 'controller-test-sso-secret';
process.env.SSO_SHARED_SECRET = SSO_SECRET;

function tokenFor(userId: number): string {
  return jwt.sign({ sub: userId }, SSO_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
}

function authHeader(userId: number): Record<string, string> {
  return { authorization: `Bearer ${tokenFor(userId)}` };
}

async function withServer(
  run: (base: string, calls: unknown[]) => Promise<void>,
) {
  const calls: unknown[] = [];

  const service = {
    handleSupportRequest: async (body: unknown) => {
      calls.push(body);
      return { type: 1, text: 'answer' };
    },

    getOrdersForUser: async (ssoToken: string) => {
      calls.push(ssoToken);

      return [
        {
          id: 1,
          userId: 7,
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

test('HTTP support requires a valid SSO token and validates the body before invoking the service', async () => {
  await withServer(async (base, calls) => {
    const noToken = await fetch(`${base}/support`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'hello', userId: 1, sessionId: 2 }),
    });
    assert.equal(noToken.status, 401);
    assert.equal(calls.length, 0);

    const invalidBodies = [
      {},
      { message: 'ab', userId: 1, sessionId: 2 },
      { message: 'hello', userId: 1, sessionId: '2' },
      { message: 'a'.repeat(301), userId: 1, sessionId: 2 },
    ];

    for (const body of invalidBodies) {
      const response = await fetch(`${base}/support`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeader(1) },
        body: JSON.stringify(body),
      });

      assert.equal(response.status, 400, JSON.stringify(body));
      assert.ok((await response.json() as any).errors.length);
    }

    assert.equal(calls.length, 0);

    const response = await fetch(`${base}/support`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeader(1) },
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

test('HTTP orders requires a valid SSO token, forwards it to the service and returns only selected fields', async () => {
  await withServer(async (base, calls) => {
    const noToken = await fetch(`${base}/orders`);
    assert.equal(noToken.status, 401);

    const badToken = await fetch(`${base}/orders`, {
      headers: { authorization: 'Bearer not-a-jwt' },
    });
    assert.equal(badToken.status, 401);

    assert.equal(calls.length, 0);

    const token = tokenFor(7);
    const response = await fetch(`${base}/orders`, {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [
      {
        id: 1,
        orderComposition: 'book',
        status: 'created',
        deliveryDate: '2026-01-01',
      },
    ]);
    assert.deepEqual(calls, [token]);
  });
});