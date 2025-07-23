import { hashToken, verifyToken } from "@/lib/crypto";
import { describe, expect, it } from "vitest";

describe("Crypto Service", () => {
  const testToken = "my-secret-password-123";

  describe("hashToken", () => {
    it("should generate a hash in the format 'prefix$salt$hash'", async () => {
      const hashedToken = await hashToken(testToken);
      const parts = hashedToken.split("$");
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe("pbkdf2_sha256");
      expect(parts[1]).toMatch(/^[0-9a-f]{32}$/); // 16 bytes salt -> 32 hex chars
      expect(parts[2]).toMatch(/^[0-9a-f]{64}$/); // 256 bits hash -> 64 hex chars
    });
  });

  describe("verifyToken", () => {
    it("should successfully verify a correct token", async () => {
      const hashedToken = await hashToken(testToken);
      const isValid = await verifyToken(testToken, hashedToken);
      expect(isValid).toBe(true);
    });

    it("should fail to verify an incorrect token", async () => {
      const hashedToken = await hashToken(testToken);
      const isValid = await verifyToken("wrong-password", hashedToken);
      expect(isValid).toBe(false);
    });

    it("should return false for a malformed hash (not enough parts)", async () => {
      const isValid = await verifyToken(testToken, "pbkdf2_sha256$saltonly");
      expect(isValid).toBe(false);
    });

    it("should return false for a hash with an incorrect format prefix", async () => {
      const hashedToken = await hashToken(testToken);
      const malformedHash = hashedToken.replace("pbkdf2_sha256", "bcrypt");
      const isValid = await verifyToken(testToken, malformedHash);
      expect(isValid).toBe(false);
    });

    it("should return false for a completely invalid hash string", async () => {
      const isValid = await verifyToken(testToken, "invalid-hash-string");
      expect(isValid).toBe(false);
    });
  });
});
