/**
 * Re-export do módulo de dinheiro compartilhado. Server importa daqui para manter
 * convenção de path (`../_core/money`), mas a lógica vive em shared/money.ts para que
 * client e server usem a mesma implementação.
 */
export * from "@shared/money";
