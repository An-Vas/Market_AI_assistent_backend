import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { test } from 'node:test';
import 'reflect-metadata';
import { requireSsoAuth } from '../src/api/common/auth.middleware';

const SECRET = 'auth-test-sso-secret';
process.env.SSO_SHARED_SECRET = SECRET;

function run(authorizationHeader: string | undefined) {
  const req: any = {
    header: (name: string) =>
      name.toLowerCase() === 'authorization' ? authorizationHeader : undefined,
    traceId: 'test-trace',
  };
  const res: any = {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  requireSsoAuth(req, res, next);

  return { req, res, nextCalled };
}

test('requireSsoAuth отклоняет запрос без заголовка Authorization', () => {
  const { res, nextCalled } = run(undefined);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireSsoAuth отклоняет заголовок Authorization не типа Bearer', () => {
  const { res, nextCalled } = run('Basic dXNlcjpwYXNz');
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireSsoAuth отклоняет просроченный токен', () => {
  const expired = jwt.sign(
    { sub: 501 },
    SECRET,
    { algorithm: 'HS256', expiresIn: -10 },
  );
  const { res, nextCalled } = run(`Bearer ${expired}`);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireSsoAuth отклоняет токен, подписанный другим секретом', () => {
  const forged = jwt.sign(
    { sub: 501 },
    'a-completely-different-secret',
    { algorithm: 'HS256', expiresIn: '1h' },
  );
  const { res, nextCalled } = run(`Bearer ${forged}`);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireSsoAuth отклоняет токен, подписанный другим алгоритмом', () => {
  const wrongAlg = jwt.sign(
    { sub: 501 },
    SECRET,
    { algorithm: 'HS384', expiresIn: '1h' },
  );
  const { res, nextCalled } = run(`Bearer ${wrongAlg}`);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireSsoAuth отклоняет подделанный токен с alg:none', () => {
  const base64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const forged = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub: 501 })}.`;
  const { res, nextCalled } = run(`Bearer ${forged}`);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireSsoAuth отклоняет токен с неположительным или нечисловым sub', () => {
  for (const sub of [0, -1, 'five', undefined]) {
    const token = jwt.sign({ sub }, SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    const { res, nextCalled } = run(`Bearer ${token}`);
    assert.equal(res.statusCode, 401, `sub=${String(sub)}`);
    assert.equal(nextCalled, false, `sub=${String(sub)}`);
  }
});

test('requireSsoAuth принимает валидный токен и берёт req.userId из него', () => {
  const token = jwt.sign({ sub: 501 }, SECRET, { algorithm: 'HS256', expiresIn: '1h' });
  const { req, res, nextCalled } = run(`Bearer ${token}`);
  assert.equal(res.statusCode, undefined);
  assert.equal(nextCalled, true);
  assert.equal(req.userId, 501);
  assert.equal(req.ssoToken, token);
});
