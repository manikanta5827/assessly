import 'dotenv/config';
import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    // For CLI operations (migrations), we must use the direct connection URL
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
