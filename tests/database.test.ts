import assert from 'node:assert/strict';
import axios from 'axios';
import { test } from 'node:test';
import 'reflect-metadata';
import { OrderRepository } from '../src/api/order/order.repository';

test('OrderRepository передаёт токен вызывающего в маркетплейс и превращает 404 в null', async () => {
  const originalGet = axios.get;
  const previousBase = process.env.MARKETPLACE_BASE_URL;
  process.env.MARKETPLACE_BASE_URL = 'http://127.0.0.1:54321';

  const calls: Array<[string, unknown]> = [];

  try {
    axios.get = (async (url: string, config: unknown) => {
      calls.push([url, config]);

      if (url === 'http://127.0.0.1:54321/api/orders/1') {
        return { data: { id: 1, orderComposition: 'book', status: 'created', deliveryDate: '2026-01-01' } };
      }

      if (url === 'http://127.0.0.1:54321/api/orders') {
        return { data: [{ id: 1, orderComposition: 'book', status: 'created', deliveryDate: '2026-01-01' }] };
      }

      const notFound: any = new Error('Not Found');
      notFound.isAxiosError = true;
      notFound.response = { status: 404 };
      throw notFound;
    }) as typeof axios.get;

    const repo = new OrderRepository();

    const own = await repo.getOrder(1, 'token-A', 'trace-1');
    assert.equal(own?.orderComposition, 'book');

    const foreign = await repo.getOrder(2, 'token-A', 'trace-1');
    assert.equal(foreign, null);

    const nonexistent = await repo.getOrder(999, 'token-A', 'trace-1');
    assert.equal(nonexistent, null);

    assert.deepEqual(
      (await repo.getOrdersForUser('token-A', 'trace-1')).map((order) => order.orderComposition),
      ['book'],
    );

    assert.deepEqual(calls[0], [
      'http://127.0.0.1:54321/api/orders/1',
      { headers: { Authorization: 'Bearer token-A', 'X-Trace-Id': 'trace-1' } },
    ]);
  } finally {
    axios.get = originalGet;
    if (previousBase === undefined) {
      delete process.env.MARKETPLACE_BASE_URL;
    } else {
      process.env.MARKETPLACE_BASE_URL = previousBase;
    }
  }
});
