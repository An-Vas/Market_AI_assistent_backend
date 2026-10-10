import { performance } from 'node:perf_hooks';
import { RequestCategory } from "../common/ml.enums";
import {
    ClassificationResult,
    GeneratedAnswer,
    IGatewayService,
    PreprocessedText,
} from "./gateway.service.interface";
import axios from 'axios';
import 'dotenv/config';

export class GatewayService implements IGatewayService{
    async getAIResponse(
        context: string,
        intent: string,
        orderContext?: string,
    ): Promise<GeneratedAnswer>{
        try {
            const started = performance.now();
            console.log('Запрос на генерацию на ' + `${process.env.FASTAPI_HOST}/assistant/generate-answer`);
            const response = await axios.post(`${process.env.FASTAPI_HOST}/assistant/generate-answer`, {
                text: context,
                intent,
                order_context: orderContext,
            });
            const requestMs = performance.now() - started;
            
            const answer = response.data?.content;
            if (typeof answer !== 'string' || !answer.trim()) {
                throw new Error('ML service returned an empty answer');
            }
            console.log('Ответ на запрос генерации:');
            console.log(response.data);
            return {
                content: answer,
                model: response.data.model,
                durationMs: response.data.duration_ms,
                knowledgeLookupMs: response.data.knowledge_lookup_ms,
                llmDurationMs: response.data.llm_duration_ms,
                requestMs,
            };
            
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.log('Ошибка запроса:');
                console.log('Status:', error.response?.status);
                console.log('Data:', error.response?.data);
            } else {
                console.log(error);
            }
            throw error;
        }
    }

    async getAICategory(context: string): Promise<ClassificationResult>{

        try {
            const started = performance.now();
            console.log('Запрос на классификацию на ' + `${process.env.FASTAPI_HOST}/assistant/classify`);
            const response = await axios.post(`${process.env.FASTAPI_HOST}/assistant/classify`, {
                text: context,
            });
            const requestMs = performance.now() - started;
            
            const foundIntent = response.data?.intent;
            const confidence = response.data?.confidence;
            if (
                typeof foundIntent !== 'string'
                || typeof confidence !== 'number'
                || !Number.isFinite(confidence)
                || confidence < 0
                || confidence > 1
            ) {
                throw new Error('ML service returned invalid classifier metadata');
            }
            const category = RequestCategory[foundIntent as keyof typeof RequestCategory];
            const recognizedCategory = typeof category === 'number' ? category : null;
            return {
                category: recognizedCategory,
                categoryName: response.data.category,
                intent: foundIntent,
                confidence,
                model: response.data.model,
                durationMs: response.data.duration_ms,
                requestMs,
            };
            
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.log('Ошибка запроса:');
                console.log('Status:', error.response?.status);
                console.log('Data:', error.response?.data);
            } else {
                console.log(error);
            }
            throw error;
        }
    }

    async fixSpelling(text: string): Promise<PreprocessedText>{
        try {
            const started = performance.now();
             console.log('Запрос на исправление орфографии на ' + `${process.env.FASTAPI_HOST}/assistant/process`);
            const response = await axios.post(`${process.env.FASTAPI_HOST}/assistant/process`, {
                text: text,
            });
            const requestMs = performance.now() - started;

            console.log('Ответ на запрос исправления орфографии:');
            console.log(response.data);
            
            if (typeof response.data?.processed !== 'string') {
                throw new Error('ML service returned invalid preprocessing result');
            }
            return {
                text: response.data.processed,
                durationMs: response.data.duration_ms,
                requestMs,
            };
            
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.log('Ошибка запроса:');
                console.log('Status:', error.response?.status);
                console.log('Data:', error.response?.data);
            } else {
                console.log(error);
            }
            throw error;
        }
    }

    async sendToOperator(): Promise<void>{
        console.log("Передано оператору")
    }

}