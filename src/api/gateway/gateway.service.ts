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
import { log } from '../common/trace';

function describeError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return `status=${error.response?.status ?? 'none'} ${error.message}`;
    }
    return error instanceof Error ? error.message : String(error);
}

export class GatewayService implements IGatewayService{
    async getAIResponse(
        context: string,
        intent: string,
        orderContext: string | undefined,
        traceId: string,
    ): Promise<GeneratedAnswer>{
        try {
            const started = performance.now();
            const response = await axios.post(
                `${process.env.FASTAPI_HOST}/assistant/generate-answer`,
                { text: context, intent, order_context: orderContext },
                { headers: { 'X-Trace-Id': traceId } },
            );
            const requestMs = performance.now() - started;

            const answer = response.data?.content;
            if (typeof answer !== 'string' || !answer.trim()) {
                throw new Error('ML service returned an empty answer');
            }
            log(traceId, 'ML generate-answer ok', { ms: Math.round(requestMs) });
            return {
                content: answer,
                model: response.data.model,
                durationMs: response.data.duration_ms,
                knowledgeLookupMs: response.data.knowledge_lookup_ms,
                llmDurationMs: response.data.llm_duration_ms,
                requestMs,
            };

        } catch (error) {
            log(traceId, 'ML generate-answer FAILED', { error: describeError(error) });
            throw error;
        }
    }

    async getAICategory(context: string, traceId: string): Promise<ClassificationResult>{

        try {
            const started = performance.now();
            const response = await axios.post(
                `${process.env.FASTAPI_HOST}/assistant/classify`,
                { text: context },
                { headers: { 'X-Trace-Id': traceId } },
            );
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
            log(traceId, 'ML classify ok', {
                intent: foundIntent,
                confidence: confidence.toFixed(2),
                ms: Math.round(requestMs),
            });
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
            log(traceId, 'ML classify FAILED', { error: describeError(error) });
            throw error;
        }
    }

    async fixSpelling(text: string, traceId: string): Promise<PreprocessedText>{
        try {
            const started = performance.now();
            const response = await axios.post(
                `${process.env.FASTAPI_HOST}/assistant/process`,
                { text: text },
                { headers: { 'X-Trace-Id': traceId } },
            );
            const requestMs = performance.now() - started;

            if (typeof response.data?.processed !== 'string') {
                throw new Error('ML service returned invalid preprocessing result');
            }
            log(traceId, 'ML process ok', { ms: Math.round(requestMs) });
            return {
                text: response.data.processed,
                durationMs: response.data.duration_ms,
                requestMs,
            };

        } catch (error) {
            log(traceId, 'ML process FAILED', { error: describeError(error) });
            throw error;
        }
    }

    async sendToOperator(traceId: string): Promise<void>{
        log(traceId, 'operator notified');
    }

}
