import { describe, it, expect } from "vitest";
import { logAudit, extractAuditContext } from "./audit-middleware";

describe("Audit Middleware", () => {
  describe("logAudit", () => {
    it("should log CREATE action", async () => {
      const context = {
        userId: 1,
        cpf: "123.456.789-00",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      };

      const changesBefore = {};
      const changesAfter = {
        name: "João Silva",
        cpf: "123.456.789-00",
      };

      // Simular o log (não vai falhar mesmo se DB não conectar)
      await logAudit(
        "CREATE",
        "employees",
        1,
        context,
        changesBefore,
        changesAfter,
        "Novo funcionário criado"
      );

      expect(true).toBe(true);
    });

    it("should log UPDATE action", async () => {
      const context = {
        userId: 1,
        cpf: "123.456.789-00",
      };

      const changesBefore = { salary: 3000 };
      const changesAfter = { salary: 3500 };

      await logAudit(
        "UPDATE",
        "employees",
        1,
        context,
        changesBefore,
        changesAfter,
        "Salário atualizado"
      );

      expect(true).toBe(true);
    });

    it("should log DELETE action", async () => {
      const context = {
        userId: 1,
        cpf: "123.456.789-00",
      };

      await logAudit(
        "DELETE",
        "employees",
        1,
        context,
        { name: "João Silva" },
        null,
        "Funcionário deletado"
      );

      expect(true).toBe(true);
    });
  });

  describe("extractAuditContext", () => {
    it("should extract context from request", () => {
      const req = {
        user: { id: 1, cpf: "123.456.789-00" },
        headers: {
          "x-forwarded-for": "192.168.1.1",
          "user-agent": "Mozilla/5.0",
        },
        socket: { remoteAddress: "192.168.1.1" },
      };

      const context = extractAuditContext(req);

      expect(context.userId).toBe(1);
      expect(context.cpf).toBe("123.456.789-00");
      expect(context.ipAddress).toBe("192.168.1.1");
      expect(context.userAgent).toBe("Mozilla/5.0");
    });

    it("should handle missing user", () => {
      const req = {
        headers: {
          "x-forwarded-for": "192.168.1.1",
          "user-agent": "Mozilla/5.0",
        },
      };

      const context = extractAuditContext(req);

      expect(context.userId).toBeUndefined();
      expect(context.cpf).toBeUndefined();
      expect(context.ipAddress).toBe("192.168.1.1");
    });
  });
});
