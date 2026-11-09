import {
  registerDecorator,
  ValidateIf,
  type ValidationArguments,
} from 'class-validator';
import {
  isSafeAvatarUrl,
  isValidTimezone,
  isValidLocaleTag,
} from '../../../domain/policies/profile.policy';

function rule(
  name: string,
  check: (value: unknown, args: ValidationArguments) => boolean,
): PropertyDecorator {
  return (target, propertyKey) =>
    registerDecorator({
      name,
      target: target.constructor,
      propertyName: String(propertyKey),
      validator: { validate: check },
    });
}
export const IsSafeAvatarUrl = () =>
  rule('safeAvatarUrl', (v) => typeof v === 'string' && isSafeAvatarUrl(v));
export const IsTimezone = () =>
  rule('timezone', (v) => typeof v === 'string' && isValidTimezone(v));
export const IsLocaleTag = () =>
  rule('localeTag', (v) => typeof v === 'string' && isValidLocaleTag(v));
export const IsLegacyEmail = () =>
  rule(
    'legacyEmail',
    (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  );
export const IsNonBlank = () =>
  rule('nonBlank', (v) => typeof v === 'string' && !!v.trim());
// Null and explicitly supplied undefined remain invalid, as with the original parsers.
export function OptionalField(): PropertyDecorator {
  return (target, key) =>
    ValidateIf((object) => Object.prototype.hasOwnProperty.call(object, key))(
      target,
      key as string,
    );
}
export const AtLeastOneField = (fields: readonly string[]) =>
  rule('atLeastOneField', (_, args) =>
    fields.some((key) =>
      Object.prototype.hasOwnProperty.call(args.object, key),
    ),
  );
