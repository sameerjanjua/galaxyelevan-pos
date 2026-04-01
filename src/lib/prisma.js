import { PrismaClient } from "../generated/prisma";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Use the DATABASE_URL from your environment
const connectionString = process.env.DATABASE_URL;

// Create a PostgreSQL connection pool
const pool = new Pool({ connectionString });

// Create a Prisma adapter using that pool
const adapter = new PrismaPg(pool);

let prismaGlobal = global.prisma || undefined;

export const prisma =
  prismaGlobal ??
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
