import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { Pool } from 'pg';
import { seedCityStateCountry } from './city-state-country.seeders';
import { seedCategories } from './category,seeders';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('🌱 Seeding started...\n');

  try {
    await seedCityStateCountry(prisma);
    await seedCategories(prisma);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('\n❌ Seeding failed:', e);
  process.exit(1);
});
