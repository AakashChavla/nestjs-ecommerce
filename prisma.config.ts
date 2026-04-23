import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seeders/seed.ts', // 👈 add this
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
