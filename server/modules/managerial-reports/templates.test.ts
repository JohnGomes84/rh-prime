import { describe, it, expect } from "vitest";
import { REPORT_TEMPLATES, getTemplate, STORED_TEMPLATE_KEYS } from "./templates.js";

describe("REPORT_TEMPLATES", () => {
  it("tem keys únicas", () => {
    const keys = REPORT_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("todo template tem ao menos 1 item", () => {
    for (const t of REPORT_TEMPLATES) {
      expect(t.items.length).toBeGreaterThan(0);
    }
  });

  it("todo item tem label e expectedContent não vazios", () => {
    for (const t of REPORT_TEMPLATES) {
      for (const item of t.items) {
        expect(item.label.trim().length).toBeGreaterThan(0);
        expect(item.expectedContent.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("getTemplate resolve por key e retorna undefined p/ inexistente", () => {
    expect(getTemplate("rh_admin.semanal.detalhado")?.sector).toBe("rh_admin");
    expect(getTemplate("inexistente")).toBeUndefined();
  });

  it("STORED_TEMPLATE_KEYS são detalhado/mensal (nunca resumido)", () => {
    for (const key of STORED_TEMPLATE_KEYS) {
      expect(getTemplate(key)?.variant).not.toBe("resumido");
    }
  });
});
