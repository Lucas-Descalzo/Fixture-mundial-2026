import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_BYTES = 64;

export function normalizeEditKey(value: string) {
  return value.trim();
}

export function hashEditKey(editKey: string) {
  const normalized = normalizeEditKey(editKey);
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(normalized, salt, HASH_BYTES).toString("hex");

  return { salt, hash };
}

export function verifyEditKey(
  editKey: string,
  expectedSalt: string,
  expectedHash: string,
) {
  const normalized = normalizeEditKey(editKey);
  const derivedHash = scryptSync(normalized, expectedSalt, HASH_BYTES);
  const storedHash = Buffer.from(expectedHash, "hex");

  if (derivedHash.length !== storedHash.length) {
    return false;
  }

  return timingSafeEqual(derivedHash, storedHash);
}
