import { PrismaClient } from '@prisma/client';
import { Country, State, City, ICountry } from 'country-state-city';

const BATCH_SIZE = 1000;

interface ICountryExtended extends ICountry {
  flag: string;
  phonecode: string;
  currency: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size)
    chunks.push(arr.slice(i, i + size));
  return chunks;
}

function parseCoord(value: string | null | undefined): number | null {
  if (!value) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function logProgress(label: string, current: number, total: number) {
  const pct = Math.round((current / total) * 100);
  process.stdout.write(`\r   ${label}: ${current}/${total} (${pct}%)`);
}

export async function seedCityStateCountry(
  prisma: PrismaClient,
): Promise<void> {
  const startTime = Date.now();
  console.log('📊 Dataset: 250 countries · 4,963 states · 148,038 cities\n');

  // ============================================
  // STEP 1 — COUNTRIES (1 query)
  // ============================================
  console.log('📦 Step 1/3 — Seeding countries...');

  const allCountries = Country.getAllCountries() as ICountryExtended[];

  await prisma.country.createMany({
    data: allCountries.map((c) => ({
      name: c.name,
      countryCode: c.isoCode,
      flag: c.flag,
      phoneCode: c.phonecode,
      currency: c.currency,
      latitude: parseCoord(c.latitude),
      longitude: parseCoord(c.longitude),
      isActive: true,
    })),
    skipDuplicates: true,
  });

  console.log(`✅ ${allCountries.length} countries inserted — 1 query\n`);

  // ============================================
  // STEP 2 — STATES (batched)
  // ============================================
  console.log('📦 Step 2/3 — Seeding states...');

  const dbCountries = await prisma.country.findMany({
    select: { id: true, countryCode: true },
  });
  const countryMap = new Map(dbCountries.map((c) => [c.countryCode, c.id]));

  const statesPayload: {
    name: string;
    stateCode: string;
    countryId: string;
    latitude: number | null;
    longitude: number | null;
    isActive: boolean;
  }[] = [];

  for (const country of allCountries) {
    const countryId = countryMap.get(country.isoCode);
    if (!countryId) continue;

    for (const state of State.getStatesOfCountry(country.isoCode)) {
      statesPayload.push({
        name: state.name,
        stateCode: state.isoCode,
        countryId,
        latitude: parseCoord(state.latitude),
        longitude: parseCoord(state.longitude),
        isActive: true,
      });
    }
  }

  const stateBatches = chunk(statesPayload, BATCH_SIZE);
  let statesDone = 0;

  for (const batch of stateBatches) {
    await prisma.state.createMany({ data: batch, skipDuplicates: true });
    statesDone += batch.length;
    logProgress('States', statesDone, statesPayload.length);
  }

  console.log(
    `\n✅ ${statesPayload.length} states inserted — ${stateBatches.length} queries\n`,
  );

  // ============================================
  // STEP 3 — CITIES (streamed batches)
  // ============================================
  console.log('📦 Step 3/3 — Seeding cities...');

  const dbStates = await prisma.state.findMany({
    select: { id: true, stateCode: true, countryId: true },
  });
  const stateMap = new Map(
    dbStates.map((s) => [`${s.stateCode}_${s.countryId}`, s.id]),
  );

  let cityBatch: {
    name: string;
    cityCode: string;
    stateId: string;
    countryId: string;
    latitude: number | null;
    longitude: number | null;
    isActive: boolean;
  }[] = [];

  let totalCities = 0;
  let totalQueries = 0;

  const flushCities = async () => {
    if (!cityBatch.length) return;
    await prisma.city.createMany({ data: cityBatch, skipDuplicates: true });
    totalCities += cityBatch.length;
    totalQueries += 1;
    logProgress('Cities', totalCities, 148_038);
    cityBatch = [];
  };

  for (const country of allCountries) {
    const countryId = countryMap.get(country.isoCode);
    if (!countryId) continue;

    for (const state of State.getStatesOfCountry(country.isoCode)) {
      const stateId = stateMap.get(`${state.isoCode}_${countryId}`);
      if (!stateId) continue;

      for (const city of City.getCitiesOfState(
        country.isoCode,
        state.isoCode,
      )) {
        cityBatch.push({
          name: city.name,
          cityCode: city.name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '_')
            .slice(0, 20),
          stateId,
          countryId,
          latitude: parseCoord(city.latitude),
          longitude: parseCoord(city.longitude),
          isActive: true,
        });

        if (cityBatch.length >= BATCH_SIZE) await flushCities();
      }
    }
  }

  await flushCities();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(
    `\n✅ ${totalCities} cities inserted — ${totalQueries} queries\n`,
  );
  console.log('═'.repeat(46));
  console.log('🎉 Seeding completed!');
  console.log('═'.repeat(46));
  console.log(`   Countries  :  ${allCountries.length}`);
  console.log(`   States     :  ${statesPayload.length}`);
  console.log(`   Cities     :  ${totalCities}`);
  console.log(`   Time taken :  ${elapsed}s`);
  console.log('═'.repeat(46));
}
