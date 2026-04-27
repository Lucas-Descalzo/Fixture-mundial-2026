import { randomBytes } from "node:crypto";

import { knockoutMatchOrder } from "@/data/world-cup-2026";
import { normalizeFixtureState } from "@/lib/world-cup-fixture";
import type { FixtureState } from "@/lib/world-cup-types";

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";
const ARGENTINA_UTC_OFFSET_HOURS = 3;
const GROUP_SLUG_MAX_LENGTH = 48;
const GROUP_SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizePersonNamePart(value: string) {
  return collapseWhitespace(value);
}

export function formatDisplayName(firstName: string, lastName: string) {
  return [normalizePersonNamePart(firstName), normalizePersonNamePart(lastName)]
    .filter(Boolean)
    .join(" ");
}

export function normalizeFullName(firstName: string, lastName: string) {
  return stripAccents(formatDisplayName(firstName, lastName).toLocaleLowerCase("es-AR"));
}

export function slugifyGroupName(name: string) {
  const collapsed = stripAccents(collapseWhitespace(name).toLocaleLowerCase("es-AR"));
  const sanitized = collapsed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, GROUP_SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");

  return sanitized || "grupo";
}

export function createRandomGroupSuffix() {
  const bytes = randomBytes(4);
  let output = "";

  for (let index = 0; index < 4; index += 1) {
    output += GROUP_SUFFIX_ALPHABET[bytes[index] % GROUP_SUFFIX_ALPHABET.length];
  }

  return output;
}

export function createGroupSlug(name: string, suffix = createRandomGroupSuffix()) {
  return `${slugifyGroupName(name)}-${suffix.toLowerCase()}`;
}

export function parseArgentinaDateTimeToUtc(input: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);

  if (
    monthNumber < 1 ||
    monthNumber > 12 ||
    dayNumber < 1 ||
    dayNumber > 31 ||
    hourNumber < 0 ||
    hourNumber > 23 ||
    minuteNumber < 0 ||
    minuteNumber > 59
  ) {
    return null;
  }

  const utcTimestamp = Date.UTC(
    yearNumber,
    monthNumber - 1,
    dayNumber,
    hourNumber + ARGENTINA_UTC_OFFSET_HOURS,
    minuteNumber,
    0,
    0,
  );

  const localValidationDate = new Date(
    Date.UTC(yearNumber, monthNumber - 1, dayNumber, hourNumber, minuteNumber, 0, 0),
  );

  if (
    localValidationDate.getUTCFullYear() !== yearNumber ||
    localValidationDate.getUTCMonth() !== monthNumber - 1 ||
    localValidationDate.getUTCDate() !== dayNumber ||
    localValidationDate.getUTCHours() !== hourNumber ||
    localValidationDate.getUTCMinutes() !== minuteNumber
  ) {
    return null;
  }

  return new Date(utcTimestamp).toISOString();
}

export function formatArgentinaDateTime(isoString: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(new Date(isoString));
}

export function toArgentinaDateTimeInputValue(isoString: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: ARGENTINA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(isoString));

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function isDeadlineReached(deadlineAtUtc: string, now = new Date()) {
  return new Date(deadlineAtUtc).getTime() <= now.getTime();
}

export function getRemainingKnockoutMatchesCount(source: Partial<FixtureState> | FixtureState) {
  const normalized = normalizeFixtureState(source);

  return knockoutMatchOrder.filter((matchId) => !normalized.knockoutWinners[matchId]).length;
}

export function isFixtureComplete(source: Partial<FixtureState> | FixtureState) {
  return getRemainingKnockoutMatchesCount(source) === 0;
}

export function resolveGroupLinkInput(input: string) {
  const value = input.trim();

  if (!value) {
    return "";
  }

  if (value.startsWith("/grupos/")) {
    return value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return "";
    }
  }

  return `/grupos/${value}`;
}
