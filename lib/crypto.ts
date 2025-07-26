import { webcrypto } from "crypto";

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // 128 bits
const HASH_ALGORITHM = "SHA-256";
const HASH_FORMAT_PREFIX = "pbkdf2_sha256";

/**
 * Converts an ArrayBuffer to a hexadecimal string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts a hexadecimal string to an ArrayBuffer.
 */
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Hashes a token using PBKDF2 with a random salt.
 * @param token - The plain text token to hash.
 * @returns A promise that resolves to a string containing the format, salt, and hash.
 */
export async function hashToken(token: string): Promise<string> {
  if (!token || typeof token !== "string") {
    throw new Error("Token must be a non-empty string.");
  }
  const salt = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const keyMaterial = await webcrypto.subtle.importKey(
    "raw",
    encoder.encode(token),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await webcrypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    256 // 256 bits
  );

  const hash = new Uint8Array(derivedBits);
  return `${HASH_FORMAT_PREFIX}$${bufferToHex(salt.buffer)}$${bufferToHex(
    hash.buffer
  )}`;
}

/**
 * Verifies a token against a stored PBKDF2 hash.
 * @param token - The plain text token to verify.
 * @param storedHash - The stored string containing the format, salt, and hash.
 * @returns A promise that resolves to true if the token is valid, false otherwise.
 */
export async function verifyToken(
  token: string,
  storedHash: string
): Promise<boolean> {
  // Guard against empty or invalid inputs
  if (
    !token ||
    !storedHash ||
    typeof token !== "string" ||
    typeof storedHash !== "string" ||
    token.length === 0 ||
    storedHash.length === 0
  ) {
    return false;
  }

  try {
    const [format, saltHex, storedHashHex] = storedHash.split("$");
    if (format !== HASH_FORMAT_PREFIX || !saltHex || !storedHashHex) {
      // This could happen if the stored hash is in an old format (e.g., bcrypt)
      // or is corrupted. We treat it as a verification failure.
      return false;
    }

    const salt = new Uint8Array(hexToBuffer(saltHex));
    const storedHashBuffer = new Uint8Array(hexToBuffer(storedHashHex));

    const encoder = new TextEncoder();
    const keyMaterial = await webcrypto.subtle.importKey(
      "raw",
      encoder.encode(token),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await webcrypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: HASH_ALGORITHM,
      },
      keyMaterial,
      256 // 256 bits
    );

    const derivedHash = new Uint8Array(derivedBits);

    if (derivedHash.length !== storedHashBuffer.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < derivedHash.length; i++) {
      result |= derivedHash[i] ^ storedHashBuffer[i];
    }
    return result === 0;
  } catch (error) {
    console.error("Error during token verification:", error);
    return false;
  }
}
