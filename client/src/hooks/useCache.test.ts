import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCache } from "./useCache";

describe("useCache Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve cachear dados e retornar do cache na segunda chamada", async () => {
    const fetcher = vi.fn(async () => ({ data: "test" }));

    const { result } = renderHook(() => useCache(fetcher, 5000));

    // Primeira chamada
    const data1 = await result.current.getCachedData();
    expect(data1).toEqual({ data: "test" });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Segunda chamada (deve vir do cache)
    const data2 = await result.current.getCachedData();
    expect(data2).toEqual({ data: "test" });
    expect(fetcher).toHaveBeenCalledTimes(1); // Não chamou novamente
  });

  it("deve invalidar cache quando solicitado", async () => {
    const fetcher = vi.fn(async () => ({ data: "test" }));

    const { result } = renderHook(() => useCache(fetcher, 5000));

    // Primeira chamada
    await result.current.getCachedData();
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Invalidar cache
    result.current.invalidateCache();

    // Segunda chamada (deve buscar novamente)
    await result.current.getCachedData();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("deve respeitar tempo de expiração do cache", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => ({ data: "test" }));

    const { result } = renderHook(() => useCache(fetcher, 1000)); // 1 segundo

    // Primeira chamada
    await result.current.getCachedData();
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Avançar 500ms (cache ainda válido)
    vi.advanceTimersByTime(500);
    await result.current.getCachedData();
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Avançar mais 600ms (cache expirado)
    vi.advanceTimersByTime(600);
    await result.current.getCachedData();
    expect(fetcher).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("deve verificar se cache é válido", async () => {
    const fetcher = vi.fn(async () => ({ data: "test" }));

    const { result } = renderHook(() => useCache(fetcher, 5000));

    // Inicialmente cache é inválido
    expect(result.current.isCacheValid()).toBe(false);

    // Após buscar dados
    await result.current.getCachedData();
    expect(result.current.isCacheValid()).toBe(true);

    // Após invalidar
    result.current.invalidateCache();
    expect(result.current.isCacheValid()).toBe(false);
  });

  it("deve usar TTL padrão de 5 minutos", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => ({ data: "test" }));

    const { result } = renderHook(() => useCache(fetcher)); // Sem TTL especificado

    await result.current.getCachedData();
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Avançar 4 minutos (cache ainda válido)
    vi.advanceTimersByTime(4 * 60 * 1000);
    await result.current.getCachedData();
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Avançar mais 2 minutos (cache expirado)
    vi.advanceTimersByTime(2 * 60 * 1000);
    await result.current.getCachedData();
    expect(fetcher).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
