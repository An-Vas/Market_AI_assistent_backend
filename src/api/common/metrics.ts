import { Router } from 'express';
import client from 'prom-client';

client.collectDefaultMetrics();

export const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'HTTP requests by route, method and status',
    labelNames: ['route', 'method', 'status'],
});

export const authFailuresTotal = new client.Counter({
    name: 'auth_failures_total',
    help: 'Rejected SSO tokens (missing/invalid/expired)',
});

export const classificationConfidence = new client.Histogram({
    name: 'classification_confidence',
    help: 'Confidence score returned by the ML classifier for each request',
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1],
});

export const supportResponsesTotal = new client.Counter({
    name: 'support_responses_total',
    help: 'Support requests resolved, by response type (ANSWER/DETAILSREQUEST/ORDERINFOREQUEST/OPERATOR)',
    labelNames: ['type'],
});

export const escalationsTotal = new client.Counter({
    name: 'escalations_total',
    help: 'Requests escalated to a human operator, by reason',
    labelNames: ['reason'],
});

export const metricsRouter = Router();
metricsRouter.get('/metrics', async (_req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});
