import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env configuration
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .default('3001')
    .transform((val) => parseInt(val, 10))
    .pipe(
      z.number().int().positive().max(65535, { message: 'PORT must be a valid TCP port (1-65535)' })
    ),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, { message: 'DATABASE_URL is required' }),
  SESSION_SECRET: z
    .string()
    .min(32, { message: 'SESSION_SECRET must be at least 32 characters long' })
    .default('mediledger_super_secure_dev_session_secret_key_64_characters_min_length_2026'),
  KEYSTORE_DIR: z.string().default('.keystore'),
  STORAGE_DIR: z.string().default('storage/private_files'),
  MAX_FILE_SIZE_BYTES: z
    .string()
    .default('10485760') // 10MB
    .transform((val) => parseInt(val, 10)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment variable validation error:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Invalid environment variables. Please check your configuration.');
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
