import axios from 'axios';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import 'reflect-metadata';
import { RequestCategory } from '../src/api/common/ml.enums';
import { GatewayService } from '../src/api/gateway/gateway.service';
import { SupportRequestDto } from '../src/api/support/dto/supportRequest.dto';
import { ResponseType } from '../src/api/support/dto/supportResponse.dto';
import { SupportService } from '../src/api/support/support.service';

const valid = {message:'hello', userId:5, sessionId:10};
test('DTO validates required fields, types and message length', async () => {
  for (const data of [{}, {...valid, userId:'5'}, {...valid, sessionId:1.5}, {...valid, orderId:'1'}, {...valid, message:''}, {...valid, message:'ab'}, {...valid, message:'a'.repeat(301)}, {...valid, message:42}]) {
    assert.ok((await validate(plainToInstance(SupportRequestDto, data))).length, JSON.stringify(data));
  }
  for (const message of ['abc', 'a'.repeat(300)]) assert.equal((await validate(plainToInstance(SupportRequestDto, {...valid,message}))).length,0);
});

function setup(category: RequestCategory | null, confidence: number, order: any = null, messages: any[] = []) {
  const calls: any[] = [];
  const gateway = {
    fixSpelling: async (text:string) => ({text,durationMs:1,requestMs:1}),
    getAICategory: async () => ({category,confidence,intent:'track_order',categoryName:'ORDER',model:'test',durationMs:1,requestMs:1}),
    getAIResponse: async (...args:any[]) => { calls.push(['generate',...args]); return {content:'answer',model:'test',durationMs:1,knowledgeLookupMs:1,llmDurationMs:1,requestMs:1}; },
    sendToOperator: async () => {calls.push(['operator']);}
  };
  const sessions = {getSession:async()=>({id:1,messages}), createSession:async()=>({id:1,messages:[]}), updateStatus:async (...args:any[])=>{calls.push(['status',...args]);}};
  const orders = {getOrder: async (...args:any[])=>{calls.push(['order',...args]); return order;},getOrdersForUser:async()=>[]};
  const service = new SupportService({} as any,sessions as any,gateway as any,{saveMessage:async()=>{}} as any,orders as any);
  return {service,calls};
}

test('low confidence requests clarification without generation', async()=>{
 const {service,calls}=setup(RequestCategory.track_order,0.3); const result=await service.handleSupportRequest({...valid} as any);
 assert.equal(result.type,ResponseType.DETAILSREQUEST);assert.ok(!calls.some(c=>c[0]==='generate'));
});

test('order intent requires an order and checks ownership before generation', async()=>{
 const missing=setup(RequestCategory.track_order,0.9);assert.equal((await missing.service.handleSupportRequest({...valid} as any)).type,ResponseType.ORDERINFOREQUEST);
 const foreign=setup(RequestCategory.track_order,0.9);assert.equal((await foreign.service.handleSupportRequest({...valid,orderId:9} as any)).type,ResponseType.ORDERINFOREQUEST);
 assert.deepEqual(foreign.calls.find(c=>c[0]==='order'),['order',9,5]);assert.ok(!foreign.calls.some(c=>c[0]==='generate'));
 const own=setup(RequestCategory.track_order,0.9,{orderComposition:'book',status:'created',deliveryDate:'tomorrow'});assert.equal((await own.service.handleSupportRequest({...valid,orderId:9} as any)).type,ResponseType.ANSWER);assert.match(own.calls.find(c=>c[0]==='generate')[3],/book/);
});

test('human agent and message threshold send to operator', async()=>{
 for(const fixture of [setup(RequestCategory.human_agent,0.9),setup(RequestCategory.track_order,0.9,null,[{text:'one'},{text:'two'},{text:'three'}])]) {
 assert.equal((await fixture.service.handleSupportRequest({...valid} as any)).type,ResponseType.OPERATOR);assert.ok(fixture.calls.some(c=>c[0]==='operator'));
 }
});

test('ML gateway rejects malformed responses and propagates failures', async () => {
 const original=axios.post;
 try {
  const gateway=new GatewayService();
  axios.post=async()=>({data:{processed:42}}) as any;await assert.rejects(gateway.fixSpelling('hello'),/invalid preprocessing/);
  axios.post=async()=>({data:{intent:'track_order',confidence:2}}) as any;await assert.rejects(gateway.getAICategory('hello'),/invalid classifier/);
  axios.post=async()=>({data:{content:''}}) as any;await assert.rejects(gateway.getAIResponse('hello','test'),/empty answer/);
  axios.post=async()=>{throw new Error('timeout')};await assert.rejects(gateway.fixSpelling('hello'),/timeout/);
 } finally {axios.post=original;}
});
