import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GITHUB_TOKEN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
