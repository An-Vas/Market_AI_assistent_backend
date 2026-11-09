import { Message } from "./models/message";
import { Session } from "./models/session";
import { CategoryThreshold } from "./models/categoryThreshold";
import { Sequelize } from 'sequelize';
import { injectable } from 'inversify';
import { Umzug, SequelizeStorage } from 'umzug';
import fs from 'fs';
import path from 'path';
import { sequelize } from './dbconfig';
import { CATEGORY_THRESHOLD_SEED } from './seeds/categoryThresholdSeed';

export class BdCongigClass {
    static prepareModels() {
          const models = { Session, Message, CategoryThreshold };

          Object.values(models).forEach((model: any) => {
            if (typeof model.associate === 'function') {
              model.associate(models);
            }
          });
    }

    static async prepareStartData() {
    try {
      const umzug = new Umzug({
        migrations: {
          glob: ['migrations/*.ts', { cwd: __dirname }],
        },
        context: sequelize,
        storage: new SequelizeStorage({ sequelize }),
        logger: console,
      });

      await umzug.up();
      console.log('Миграции применены');
    } catch (error) {
      console.error('Ошибка миграций:', error);
    }

    if (await CategoryThreshold.count() === 0) {
      await CategoryThreshold.bulkCreate(CATEGORY_THRESHOLD_SEED);
      console.log('Пороги уверенности по категориям засеяны');
    }
  }
}
