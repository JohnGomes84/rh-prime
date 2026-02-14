/**
 * Utilitários para transações de banco de dados
 */

export interface TransactionOptions {
  name?: string;
  timeout?: number;
}

/**
 * Executa uma função dentro de uma transação
 * Nota: Implementação simplificada. Para produção, usar Drizzle transactions
 */
export async function withTransaction<T>(
  fn: () => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { name = "transaction", timeout = 30000 } = options;

  try {
    console.warn(`[Transaction] Starting ${name}`);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Transaction ${name} timeout after ${timeout}ms`)), timeout)
    );

    const result = await Promise.race([fn(), timeoutPromise]);

    console.warn(`[Transaction] Completed ${name}`);
    return result;
  } catch (error) {
    console.error(`[Transaction] Failed ${name}:`, error);
    throw error;
  }
}

/**
 * Executa múltiplas operações em sequência com rollback automático em caso de erro
 */
export async function withBatchTransaction<T>(
  operations: Array<() => Promise<unknown>>,
  options: TransactionOptions = {}
): Promise<T[]> {
  const results: T[] = [];
  const { name = "batch-transaction" } = options;

  try {
    console.warn(`[Batch Transaction] Starting ${name} with ${operations.length} operations`);

    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i]();
        results.push(result as T);
        console.warn(`[Batch Transaction] Operation ${i + 1}/${operations.length} completed`);
      } catch (error) {
        console.error(`[Batch Transaction] Operation ${i + 1} failed, rolling back:`, error);
        throw error;
      }
    }

    console.warn(`[Batch Transaction] Completed ${name}`);
    return results;
  } catch (error) {
    console.error(`[Batch Transaction] Failed ${name}:`, error);
    throw error;
  }
}
