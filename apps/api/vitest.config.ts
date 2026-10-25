import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: 'test-secret-that-is-at-least-32-characters-long',
      BCRYPT_ROUNDS: '4',
    },
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
