/**
 * Utilitários para retry logic em operações críticas
 */

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 100,
  backoffMultiplier: 2,
  onRetry: () => {},
};

/**
 * Executa uma função com retry automático
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < opts.maxAttempts) {
        const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt - 1);
        opts.onRetry(attempt, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Retry failed");
}

/**
 * Wrapper para operações de banco de dados críticas
 */
export async function withDBRetry<T>(
  fn: () => Promise<T>,
  operation: string = "database operation"
): Promise<T> {
  return withRetry(fn, {
    maxAttempts: 3,
    delayMs: 100,
    backoffMultiplier: 2,
    onRetry: (attempt, error) => {
      console.warn(`[DB Retry] ${operation} failed (attempt ${attempt}): ${error.message}`);
    },
  });
}
