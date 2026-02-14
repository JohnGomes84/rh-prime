/**
 * Utilitários para tratamento de timezone
 * Padrão: Armazenar sempre em UTC no banco, converter para local na exibição
 */

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Obtém o timezone do usuário (padrão: São Paulo)
 */
export function getUserTimezone(userTimezone?: string): string {
  return userTimezone || DEFAULT_TIMEZONE;
}

/**
 * Converte uma data UTC para o timezone local do usuário
 */
export function convertUTCToLocal(utcDate: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  try {
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(utcDate);
    const dateObj: Record<string, string> = {};

    parts.forEach(({ type, value }) => {
      dateObj[type] = value;
    });

    return new Date(
      `${dateObj.year}-${dateObj.month}-${dateObj.day}T${dateObj.hour}:${dateObj.minute}:${dateObj.second}`
    );
  } catch {
    console.warn(`Invalid timezone ${timezone}, using UTC`);
    return utcDate;
  }
}

/**
 * Converte uma data local para UTC
 */
export function convertLocalToUTC(localDate: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  try {
    const utcString = localDate.toLocaleString("sv-SE", { timeZone: "UTC" });
    const localString = localDate.toLocaleString("sv-SE", { timeZone: timezone });

    const utcDate = new Date(utcString);
    const localDateObj = new Date(localString);

    const offset = utcDate.getTime() - localDateObj.getTime();
    return new Date(localDate.getTime() + offset);
  } catch {
    console.warn(`Invalid timezone ${timezone}, using UTC`);
    return localDate;
  }
}

/**
 * Formata uma data para exibição em português
 */
export function formatDateBR(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  try {
    const localDate = convertUTCToLocal(date, timezone);
    return localDate.toLocaleDateString("pt-BR");
  } catch {
    return date.toLocaleDateString("pt-BR");
  }
}

/**
 * Formata uma data e hora para exibição em português
 */
export function formatDateTimeBR(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  try {
    const localDate = convertUTCToLocal(date, timezone);
    return localDate.toLocaleString("pt-BR");
  } catch {
    return date.toLocaleString("pt-BR");
  }
}

/**
 * Obtém o início do dia em UTC (00:00:00)
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Obtém o fim do dia em UTC (23:59:59)
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
