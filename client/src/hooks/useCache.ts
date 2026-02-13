import { useCallback, useRef } from 'react';

/**
 * Hook de cache para otimizar performance
 * Evita re-fetches desnecessários de dados
 */
export function useCache<T>(
  fetcher: () => Promise<T>,
  cacheTime: number = 5 * 60 * 1000 // 5 minutos padrão
) {
  const cacheRef = useRef<{
    data: T | null;
    timestamp: number;
  }>({ data: null, timestamp: 0 });

  const isCacheValid = useCallback(() => {
    const now = Date.now();
    return (
      cacheRef.current.data !== null &&
      now - cacheRef.current.timestamp < cacheTime
    );
  }, [cacheTime]);

  const getCachedData = useCallback(async (): Promise<T> => {
    if (isCacheValid()) {
      return cacheRef.current.data as T;
    }

    const data = await fetcher();
    cacheRef.current = {
      data,
      timestamp: Date.now(),
    };
    return data;
  }, [fetcher, isCacheValid]);

  const invalidateCache = useCallback(() => {
    cacheRef.current = { data: null, timestamp: 0 };
  }, []);

  return { getCachedData, invalidateCache, isCacheValid };
}
