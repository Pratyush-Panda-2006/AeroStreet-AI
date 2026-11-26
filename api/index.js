/**
 * @file api/index.js
 * @description Vercel Serverless Function entrypoint for AeroStreet-AI.
 * Exports the main Express application handler without duplicating routing logic.
 * @module api
 */
import app from '../server/index.js';

export default app;
