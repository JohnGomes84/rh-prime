import { describe, expect, it, vi } from "vitest";

import { securityHeaders } from "./controle/securityHeaders";
import {
  filterActive,
  markAsDeleted,
  restoreDeleted,
} from "./controle/softDelete";
import {
  generateUniqueFileName,
  sanitizeFileName,
  validateUpload,
} from "./controle/uploadSecurity";

describe("Upload Security", () => {
  it("accepts valid JPEG, PNG, and PDF uploads", () => {
    expect(validateUpload("image/jpeg", "photo.jpg", 1024 * 100).valid).toBe(
      true
    );
    expect(validateUpload("image/png", "image.png", 1024 * 500).valid).toBe(
      true
    );
    expect(
      validateUpload("application/pdf", "document.pdf", 1024 * 1024 * 5).valid
    ).toBe(true);
  });

  it("rejects dangerous or invalid uploads", () => {
    expect(
      validateUpload("application/x-msdownload", "malware.exe", 1024).valid
    ).toBe(false);
    expect(validateUpload("image/jpeg", "photo.exe", 1024 * 100).valid).toBe(
      false
    );
    expect(
      validateUpload("image/jpeg", "../../../etc/passwd.jpg", 1024).valid
    ).toBe(false);
    expect(
      validateUpload("image/jpeg", "huge.jpg", 1024 * 1024 * 15).valid
    ).toBe(false);
  });

  it("sanitizes and uniquifies file names", () => {
    const sanitized = sanitizeFileName("foto@#$%^&*().jpg");
    expect(sanitized).toBe("foto_________.jpg");

    const unique1 = generateUniqueFileName("documento.pdf");
    const unique2 = generateUniqueFileName("documento.pdf");
    expect(unique1).toContain("documento");
    expect(unique1).toContain(".pdf");
    expect(unique1).not.toBe(unique2);
  });
});

describe("Security Headers", () => {
  it("sets the expected hardening headers", () => {
    const setHeader = vi.fn();
    const next = vi.fn();
    const middleware = securityHeaders();

    middleware({} as any, { setHeader } as any, next);

    expect(setHeader).toHaveBeenCalledWith(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
    expect(setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
    expect(setHeader).toHaveBeenCalledWith(
      "X-Content-Type-Options",
      "nosniff"
    );
    expect(setHeader).toHaveBeenCalledWith("X-XSS-Protection", "1; mode=block");
    expect(setHeader).toHaveBeenCalledWith(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );
    expect(setHeader).toHaveBeenCalledWith(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=()"
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("Soft Delete", () => {
  const mockTable = {
    id: { name: "id" },
    deletedAt: { name: "deletedAt" },
  };

  it("builds a filter that targets active rows", () => {
    const condition = filterActive(mockTable as any);
    expect(condition).toBeTruthy();
  });

  it("marks and restores rows through the db contract", async () => {
    const updateState = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
    };
    const db = {
      update: vi.fn().mockReturnValue(updateState),
    };

    await expect(markAsDeleted(db as any, mockTable as any, 7)).resolves.toBe(
      true
    );
    expect(updateState.set).toHaveBeenCalledWith(
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );

    updateState.set.mockClear();
    await expect(restoreDeleted(db as any, mockTable as any, 7)).resolves.toBe(
      true
    );
    expect(updateState.set).toHaveBeenCalledWith({ deletedAt: null });
  });
});

describe("Minimum Secure Upload Flow", () => {
  it("validates, sanitizes, and renames a file in sequence", () => {
    const fileName = "documento@2024.pdf";
    const validation = validateUpload(
      "application/pdf",
      fileName,
      1024 * 1024 * 2
    );
    expect(validation.valid).toBe(true);

    const sanitized = sanitizeFileName(fileName);
    expect(sanitized).not.toContain("@");

    const unique = generateUniqueFileName(sanitized);
    expect(unique).toContain("documento");
    expect(unique).toContain(".pdf");
  });
});
