import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

export async function getCache(key: string): Promise<any> {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCache(
  key: string,
  value: any,
  ttlSeconds: number
): Promise<void> {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

