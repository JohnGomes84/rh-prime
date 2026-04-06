import Redis from 'ioredis';

let redis: Redis | null = null;

/**
 * Inicializar conexão Redis
 * Em desenvolvimento, usa mock; em produção, conecta ao Redis real
 */
export function initRedis(): Redis {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    redis = new Redis(redisUrl);
    redis.on('error', (err) => console.error('Redis error:', err));
    redis.on('connect', () => console.log('Redis connected'));
  } else {
    // Mock Redis para desenvolvimento local
    redis = new Redis({
      host: 'localhost',
      port: 6379,
      retryStrategy: () => null, // Desabilita retry em dev
    });
  }

  return redis;
}

/**
 * Obter instância Redis
 */
export function getRedis(): Redis | null {
  return redis;
}

/**
 * Cache wrapper com TTL
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redisClient = getRedis();
    if (!redisClient) return null;

    const cached = await redisClient.get(key);
    if (!cached) return null;

    return JSON.parse(cached) as T;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
  try {
    const redisClient = getRedis();
    if (!redisClient) return;

    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    const redisClient = getRedis();
    if (!redisClient) return;

    await redisClient.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Invalidar cache por padrão (ex: "dashboard:*")
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const redisClient = getRedis();
    if (!redisClient) return;

    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    console.error('Cache invalidate pattern error:', error);
  }
}

/**
 * Gerar chave de cache para dashboard
 */
export function getDashboardCacheKey(year: number, month: number, metric: string): string {
  return `dashboard:${year}:${month}:${metric}`;
}

/**
 * Invalidar todo cache de dashboard para um período
 */
export async function invalidateDashboardCache(year: number, month: number): Promise<void> {
  await cacheInvalidatePattern(`dashboard:${year}:${month}:*`);
}
