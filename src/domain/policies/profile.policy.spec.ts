import { assertActiveAccount, validateProfilePatch } from './profile.policy';
import { DomainError } from '../errors/domain-error';
import type { ProfilePatch } from '../models/user';

describe('profile business rules', () => {
  it('permits active accounts and rejects disabled accounts', () => {
    expect(() => assertActiveAccount({ enabled: true })).not.toThrow();
    expect(() => assertActiveAccount({ enabled: false })).toThrow(DomainError);
    try {
      assertActiveAccount({ enabled: false });
    } catch (error) {
      expect(error).toMatchObject({ code: 'ACCOUNT_DISABLED' });
    }
  });

  it('accepts valid partial patches and returns a separate object', () => {
    const patch = Object.freeze({
      avatarUrl: 'https://example.test/avatar.png',
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi-VN',
      phoneNumber: '+84901234567',
    });
    expect(validateProfilePatch(patch)).toEqual(patch);
    expect(validateProfilePatch(patch)).not.toBe(patch);
    expect(validateProfilePatch({ locale: 'vi' })).toEqual({ locale: 'vi' });
  });

  it.each([
    {},
    null,
    [],
    { locale: undefined },
    { locale: 1 },
    { locale: '' },
    { phoneNumber: '   ' },
    { phoneNumber: 'a'.repeat(101) },
    { avatarUrl: 'https://example.test/' + 'a'.repeat(2048) },
    { avatarUrl: 'javascript:alert(1)' },
    { avatarUrl: 'https://private:secret@example.test/avatar' },
    { avatarUrl: 'invalid' },
    { timezone: 'Not/AZone' },
    { locale: 'not_a_locale' },
    { userId: 'other' },
  ])('rejects invalid profile input %#', (patch) => {
    try {
      validateProfilePatch(patch as unknown as ProfilePatch);
      throw new Error('Expected profile validation failure');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toMatchObject({ code: 'INVALID_PROFILE' });
      expect((error as Error).message).not.toMatch(/private|secret/);
    }
  });
});
