import { test } from '@jest/globals';
import { verifyMongoRepository } from './mongo.integration.mjs';

test(
  'MongoDB concurrent upserts, persistence and offline errors',
  verifyMongoRepository,
  30_000,
);
