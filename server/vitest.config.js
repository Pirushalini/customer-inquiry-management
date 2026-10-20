import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      TEST_DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/coffee_ninja_test',
      SESSION_SECRET: 'test_session_secret_coffee_ninja_2026',
    },
    testTimeout: 15000,
    hookTimeout: 15000,
    fileParallelism: false,
  },
});
