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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment variable validation error:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Invalid environment variables. Please check your configuration.');
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
