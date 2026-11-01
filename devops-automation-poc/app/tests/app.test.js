import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET / returns application name, version and status', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(typeof body.name, 'string');
  assert.equal(typeof body.version, 'string');
  assert.equal(body.status, 'ok');
});

test('GET /health returns 200 with structured health information', async () => {
  const res = await fetch(`${baseUrl}/health`);
  // INTENTIONAL CI FAILURE DEMO (Milestone 2, Phase 4) — /health actually
  // returns 200; this wrong expectation is reverted before merge.
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.status, 'healthy');
  assert.equal(typeof body.uptimeSeconds, 'number');
  assert.equal(typeof body.timestamp, 'string');
});

test('GET /version returns version, commit sha and build timestamp', async () => {
  const res = await fetch(`${baseUrl}/version`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(typeof body.name, 'string');
  assert.equal(typeof body.version, 'string');
  assert.equal(typeof body.commit, 'string');
  assert.equal(typeof body.buildTimestamp, 'string');
});

test('GET /does-not-exist returns 404 with error status', async () => {
  const res = await fetch(`${baseUrl}/does-not-exist`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.status, 'error');
});

test('POST / is not allowed and falls through to 404 handling', async () => {
  const res = await fetch(`${baseUrl}/`, { method: 'POST' });
  assert.equal(res.status, 404);
});
