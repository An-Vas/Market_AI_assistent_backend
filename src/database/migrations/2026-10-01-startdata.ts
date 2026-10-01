import type { MigrationParams } from 'umzug';
import type { Sequelize } from 'sequelize';

type Ctx = MigrationParams<Sequelize>;

export const up = async ({ context: sequelize }: Ctx): Promise<void> => {
  await sequelize.getQueryInterface().bulkInsert('orders', [
    { orderComposition: '1 red book', status: 'created', deliveryDate: new Date(), userId: '5' },
    { orderComposition: 'white table lamp', status: 'created', deliveryDate: new Date(), userId: '6' },
    { orderComposition: 'plates with cat pictures', status: 'delivered', deliveryDate: new Date(), userId: '7' },
    { orderComposition: 'pillow', status: 'created', deliveryDate: new Date(), userId: '7' },
  ]);
};
