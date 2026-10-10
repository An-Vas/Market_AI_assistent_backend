import 'reflect-metadata'; // обязательно первой строкой
import express from 'express';
import path from 'node:path';

import 'dotenv/config';
import { container } from './container';
import { TYPES } from './types';
import { SupportController } from './api/support/support.controller';
import { sequelize } from './database/dbconfig';
import { BdCongigClass as BdPrepareClass } from './database/dbprepare';


const app = express();


(async () => {
  
  BdPrepareClass.prepareModels();
  await sequelize.sync();
  await BdPrepareClass.prepareStartData()
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const helloController = container.get<SupportController>(TYPES.supportController);

  app.use(helloController.router);

  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

  if (!process.env.PORT) {
    throw new Error("Не указан BACKPORT в настройках. Проверьте env файл")
  }

  app.listen(process.env.PORT, () => {
    console.log(`Сервер запущен на http://localhost:${process.env.PORT}`);
  });
})();