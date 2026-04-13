import 'dotenv/config';
import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Falls back to DATABASE_URL if DIRECT_URL is missing, and to an empty string to avoid crashes during 'prisma generate' in CI
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});
