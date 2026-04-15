import { describe, expect, it } from "vitest";
import {
  ALLOWED_EMAIL_DOMAINS,
  assertAllowedEmailDomain,
  getAllowedEmailDomainsLabel,
  isAllowedEmailDomain,
} from "./auth-domain";

describe("auth-domain", () => {
  it("accepts the configured corporate domain", () => {
    expect(isAllowedEmailDomain(`user@${ALLOWED_EMAIL_DOMAINS[0]}`)).toBe(true);
    expect(isAllowedEmailDomain(`USER@${ALLOWED_EMAIL_DOMAINS[0]}`)).toBe(true);
  });

  it("rejects external domains and missing emails", () => {
    expect(isAllowedEmailDomain("user@gmail.com")).toBe(false);
    expect(isAllowedEmailDomain(undefined)).toBe(false);
    expect(isAllowedEmailDomain(null)).toBe(false);
    expect(isAllowedEmailDomain("")).toBe(false);
  });

  it("builds a readable label", () => {
    expect(getAllowedEmailDomainsLabel()).toContain(`@${ALLOWED_EMAIL_DOMAINS[0]}`);
  });

  it("throws for invalid domains", () => {
    expect(() => assertAllowedEmailDomain("user@gmail.com")).toThrow(
      /Apenas e-mails corporativos/
    );
  });
});
