import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root if not already loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

const isTestEnv = process.env.NODE_ENV === 'test';
const connectionUrl = isTestEnv
  ? (process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/coffee_ninja_test')
  : process.env.DATABASE_URL;

const connectionConfig = connectionUrl
  ? { connectionString: connectionUrl }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: isTestEnv ? 'coffee_ninja_test' : (process.env.DB_NAME || 'coffee_ninja'),
    };

export const pool = new Pool(connectionConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const query = (text, params) => pool.query(text, params);
