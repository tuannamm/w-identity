import { DomainError } from '../errors/domain-error';
import type { ProfilePatch } from '../models/user';

export const PROFILE_FIELDS = [
  'avatarUrl',
  'phoneNumber',
  'timezone',
  'locale',
] as const satisfies readonly (keyof ProfilePatch)[];

export function assertActiveAccount(account: { enabled: boolean }): void {
  if (!account.enabled)
    throw new DomainError('ACCOUNT_DISABLED', 'Account is disabled');
}

function invalid(field: string): never {
  throw new DomainError('INVALID_PROFILE', `Invalid ${field}`);
}

/** Applies equally to transport requests and direct use-case calls; does not mutate input. */
export function validateProfilePatch(patch: ProfilePatch): ProfilePatch {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch))
    invalid('profile');
  if (!Object.keys(patch).length) {
    throw new DomainError(
      'INVALID_PROFILE',
      'At least one profile field is required',
    );
  }
  const result: ProfilePatch = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!(PROFILE_FIELDS as readonly string[]).includes(key)) {
      throw new DomainError('INVALID_PROFILE', 'Unknown input field');
    }
    const field = key as keyof ProfilePatch;
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.length > (field === 'avatarUrl' ? 2048 : 100)
    )
      invalid(field);
    result[field] = value;
  }
  if (result.avatarUrl && !isSafeAvatarUrl(result.avatarUrl))
    invalid('avatarUrl');
  if (result.timezone && !isValidTimezone(result.timezone)) invalid('timezone');
  if (result.locale && !isValidLocaleTag(result.locale)) invalid('locale');
  return result;
}

export function isSafeAvatarUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
export function isValidLocaleTag(value: string): boolean {
  try {
    return Intl.getCanonicalLocales(value).length > 0;
  } catch {
    return false;
  }
}
