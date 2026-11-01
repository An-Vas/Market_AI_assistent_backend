import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import 'reflect-metadata';

test('SQLite order repository isolates users and binds SQL parameters', async () => {
 const original = process.cwd(); const dir=mkdtempSync(join(tmpdir(),'market-test-')); process.chdir(dir);
 const {sequelize}=await import('../src/database/dbconfig');
 const {Order}=await import('../src/database/models/order');
 const {OrderRepository}=await import('../src/api/order/order.repository');
 try {
  await sequelize.sync({force:true});
  await Order.bulkCreate([{id:1,userId:5,orderComposition:'book',status:'created',deliveryDate:new Date()}, {id:2,userId:7,orderComposition:'lamp',status:'created',deliveryDate:new Date()}]);
  const repo=new OrderRepository();
  assert.equal((await repo.getOrder(1,5))?.orderComposition,'book');
  assert.equal(await repo.getOrder(1,7),null);
  assert.equal(await repo.getOrder(999,5),null);
  assert.equal(await repo.getOrder('1 OR 1=1' as any,5),null);
  assert.deepEqual((await repo.getOrdersForUser(7)).map(x=>x.orderComposition),['lamp']);
  assert.equal((await Order.count()),2);
 } finally {await sequelize.close();process.chdir(original);rmSync(dir,{recursive:true,force:true});}
});