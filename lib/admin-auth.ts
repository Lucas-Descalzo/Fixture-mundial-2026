import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "fwc26-admin-session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "";
}

function digestValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function isAdminConfigured() {
  return Boolean(getAdminPassword());
}

export function verifyAdminPassword(candidate: string) {
  const expected = getAdminPassword();
  if (!expected) {
    return false;
  }

  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  if (candidateBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidateBuffer, expectedBuffer);
}

export function createAdminSessionToken() {
  const password = getAdminPassword();
  if (!password) {
    return "";
  }

  return digestValue(`fwc26-admin:${password}`);
}

export function isValidAdminSession(token: string | undefined) {
  if (!token || !isAdminConfigured()) {
    return false;
  }

  const expectedToken = createAdminSessionToken();
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, expectedBuffer);
}

export function shouldUseSecureAdminCookie() {
  return process.env.NODE_ENV === "production";
}
