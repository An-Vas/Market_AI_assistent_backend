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

test('requireSsoAuth rejects a request with no Authorization header', () => {
  const { res, nextCalled } = run(undefined);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireSsoAuth rejects a non-Bearer Authorization header', () => {
  const { res, nextCalled } = run('Basic dXNlcjpwYXNz');
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireSsoAuth rejects an expired token', () => {
  const expired = jwt.sign(
    { sub: 501 },
    SECRET,
    { algorithm: 'HS256', expiresIn: -10 },
  );
  const { res, nextCalled } = run(`Bearer ${expired}`);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireSsoAuth rejects a token signed with the wrong secret', () => {
  const forged = jwt.sign(
    { sub: 501 },
    'a-completely-different-secret',
    { algorithm: 'HS256', expiresIn: '1h' },
  );
  const { res, nextCalled } = run(`Bearer ${forged}`);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireSsoAuth rejects a token signed with a different algorithm', () => {
  const wrongAlg = jwt.sign(
    { sub: 501 },
    SECRET,
    { algorithm: 'HS384', expiresIn: '1h' },
  );
  const { res, nextCalled } = run(`Bearer ${wrongAlg}`);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireSsoAuth rejects a forged alg:none token', () => {
  const base64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const forged = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub: 501 })}.`;
  const { res, nextCalled } = run(`Bearer ${forged}`);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireSsoAuth rejects a token with a non-positive or non-numeric sub claim', () => {
  for (const sub of [0, -1, 'five', undefined]) {
    const token = jwt.sign({ sub }, SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    const { res, nextCalled } = run(`Bearer ${token}`);
    assert.equal(res.statusCode, 401, `sub=${String(sub)}`);
    assert.equal(nextCalled, false, `sub=${String(sub)}`);
  }
});

test('requireSsoAuth accepts a validly signed, current token and sets req.userId from it', () => {
  const token = jwt.sign({ sub: 501 }, SECRET, { algorithm: 'HS256', expiresIn: '1h' });
  const { req, res, nextCalled } = run(`Bearer ${token}`);
  assert.equal(res.statusCode, undefined);
  assert.equal(nextCalled, true);
  assert.equal(req.userId, 501);
  assert.equal(req.ssoToken, token);
});
