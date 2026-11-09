import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import 'reflect-metadata';

test('SQLite stores sessions and messages and updates session status', async () => {
  const original = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), 'market-session-'));

  process.chdir(dir);

  const { sequelize } = await import('../src/database/dbconfig');
  const { Session } = await import('../src/database/models/session');
  const { Message } = await import('../src/database/models/message');
  const { SessionRepository } = await import(
    '../src/api/session/session.repository'
  );
  const { MessageRepository } = await import(
    '../src/api/messages/message.repository'
  );
  const { SessionStatus } = await import(
    '../src/api/session/entity/session.entity'
  );

  try {
    Session.associate({ Message });
    await sequelize.sync({ force: true });

    const sessions = new SessionRepository();
    const messages = new MessageRepository();

    assert.equal(await sessions.getSession(101, 5), null);

    const created = await sessions.createSession(101, 5);
    assert.equal(created.userId, 5);

    const saved = await messages.saveMessage({
      sessionId: created.id,
      text: 'hello',
      senderType: 1,
    } as any);

    assert.equal(saved.text, 'hello');

    const loaded = await sessions.getSession(101, 5);
    assert.equal(loaded?.messages.length, 1);
    assert.equal(loaded?.messages[0].text, 'hello');

    assert.equal(await sessions.getSession(101, 7), null);
    await sessions.updateStatus(101, 7, SessionStatus.OPERATOR);
    assert.equal((await sessions.getSession(101, 5))?.status, SessionStatus.OPEN);

    await sessions.updateStatus(101, 5, SessionStatus.OPERATOR);

    assert.equal(
      (await sessions.getSession(101, 5))?.status,
      SessionStatus.OPERATOR,
    );
  } finally {
    await sequelize.close();
    process.chdir(original);
    rmSync(dir, { recursive: true, force: true });
  }
});