import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import 'reflect-metadata';

test('CategoryThresholdRepository читает порог confidence из БД по категории', async () => {
  const original = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), 'market-thresholds-'));
  process.chdir(dir);

  const { sequelize } = await import('../src/database/dbconfig');
  const { CategoryThreshold } = await import('../src/database/models/categoryThreshold');
  const { CATEGORY_THRESHOLD_SEED } = await import('../src/database/seeds/categoryThresholdSeed');
  const { CategoryThresholdRepository } = await import('../src/api/common/categoryThreshold.repository');
  const { RequestCategory } = await import('../src/api/common/ml.enums');

  try {
    await sequelize.sync({ force: true });
    await CategoryThreshold.bulkCreate(CATEGORY_THRESHOLD_SEED);

    const repo = new CategoryThresholdRepository();

    // Высокая стоимость ошибки (ORDER) -> высокий порог.
    assert.equal(await repo.getRequiredConfidence(RequestCategory.track_order), 0.85);
    // Низкая стоимость ошибки (SALES) -> низкий порог.
    assert.equal(await repo.getRequiredConfidence(RequestCategory.sales_period), 0.4);
    // Средняя стоимость ошибки (PRODUCT) -> средний порог.
    assert.equal(await repo.getRequiredConfidence(RequestCategory.product_information), 0.65);

    // Порог можно изменить прямо в БД без правки кода.
    await CategoryThreshold.update(
      { confidenceThreshold: 0.5 },
      { where: { intent: 'track_order' } },
    );
    assert.equal(await repo.getRequiredConfidence(RequestCategory.track_order), 0.5);

    // Если для категории нет строки в БД — безопасный дефолт (высокий порог),
    // а не ошибка и не "ответить всегда".
    await CategoryThreshold.destroy({ where: { intent: 'sales_period' } });
    assert.equal(await repo.getRequiredConfidence(RequestCategory.sales_period), 0.85);
  } finally {
    await sequelize.close();
    process.chdir(original);
    rmSync(dir, { recursive: true, force: true });
  }
});
