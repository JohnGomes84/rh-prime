import { TRPCError } from "@trpc/server";

export const ALLOWED_EMAIL_DOMAINS = ["mlservicoseco.com.br"] as const;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAllowedEmailDomain(email: string | null | undefined) {
  if (!email) return false;

  const normalizedEmail = normalizeEmail(email);
  const [, domain] = normalizedEmail.split("@");

  if (!domain) return false;

  return ALLOWED_EMAIL_DOMAINS.includes(
    domain as (typeof ALLOWED_EMAIL_DOMAINS)[number]
  );
}

export function getAllowedEmailDomainsLabel() {
  return ALLOWED_EMAIL_DOMAINS.map(domain => `@${domain}`).join(", ");
}

export function assertAllowedEmailDomain(
  email: string | null | undefined,
  message = `Apenas e-mails corporativos (${getAllowedEmailDomainsLabel()}) são permitidos.`
) {
  if (!isAllowedEmailDomain(email)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message,
    });
  }
}
