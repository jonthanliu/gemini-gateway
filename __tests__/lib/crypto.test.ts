import { hashToken, verifyToken } from "@/lib/crypto";
import { describe, expect, it } from "vitest";

describe("Crypto Functions", () => {
  it("should correctly verify a valid token against its hash", async () => {
    const password = "my-secret-password";
    const hash = await hashToken(password);

    // The hash should not be the same as the password
    expect(hash).not.toBe(password);

    // Verification with the correct password should succeed
    const isValid = await verifyToken(password, hash);
    expect(isValid).toBe(true);
  });

  it("should correctly reject an invalid token", async () => {
    const password = "my-secret-password";
    const wrongPassword = "not-my-password";
    const hash = await hashToken(password);

    // Verification with the wrong password should fail
    const isInvalid = await verifyToken(wrongPassword, hash);
    expect(isInvalid).toBe(false);
  });

  it("should return false when verifying against an empty hash", async () => {
    const password = "my-secret-password";
    const isValid = await verifyToken(password, "");
    expect(isValid).toBe(false);
  });

  it("should return false when verifying an empty password", async () => {
    const hash = await hashToken("any-password");
    const isValid = await verifyToken("", hash);
    expect(isValid).toBe(false);
  });
});
