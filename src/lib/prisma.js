import { PrismaClient } from "../generated/prisma";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Use the DATABASE_URL from your environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma.");
}

const globalForPrisma = globalThis;

// Create a PostgreSQL connection pool
const pool = globalForPrisma.__prismaPool ?? new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX ?? 2),
});

// Create a Prisma adapter using that pool
const adapter = globalForPrisma.__prismaAdapter ?? new PrismaPg(pool);

const prismaGlobal = globalForPrisma.prisma;

export const prisma =
  prismaGlobal ??
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

globalForPrisma.prisma = prisma;
globalForPrisma.__prismaPool = pool;
globalForPrisma.__prismaAdapter = adapter;
