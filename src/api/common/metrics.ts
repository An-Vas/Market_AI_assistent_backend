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

export const metricsRouter = Router();
metricsRouter.get('/metrics', async (_req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});
