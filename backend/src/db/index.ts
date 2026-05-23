import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const isProd = process.env.NODE_ENV === 'production';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Limit connection pool size in serverless environments to prevent exhaustion
  max: isProd ? 2 : 10, 
  idleTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;