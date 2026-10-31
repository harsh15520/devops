import express from 'express';
import { getVersionInfo } from './version.js';

export function createApp() {
  const app = express();
  const startedAt = Date.now();

  app.disable('x-powered-by');

  app.get('/', (req, res) => {
    const { name, version } = getVersionInfo();
    res.status(200).json({
      name,
      version,
      status: 'ok',
    });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/version', (req, res) => {
    res.status(200).json(getVersionInfo());
  });

  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  });

  return app;
}
