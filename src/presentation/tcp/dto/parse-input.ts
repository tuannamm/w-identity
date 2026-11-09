import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ApplicationError } from '../../../application/errors/application-error';

export function parseInput<T extends object>(
  dto: ClassConstructor<T>,
  plain: unknown,
): T {
  const invalid = (message: string): never => {
    throw new ApplicationError('VALIDATION_ERROR', message);
  };
  if (!plain || typeof plain !== 'object' || Array.isArray(plain))
    invalid('JSON object is required');
  // class-transformer silently skips these keys; reject them before transformation.
  if (
    Object.keys(plain as object).some((key) =>
      ['__proto__', 'constructor', 'prototype', '_atLeastOneField'].includes(
        key,
      ),
    )
  )
    invalid('Unknown input field');
  const instance = plainToInstance(dto, plain);
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  });
  if (errors.length) {
    if (errors.some((error) => error.constraints?.whitelistValidation))
      invalid('Unknown input field');
    const field = errors[0].property;
    invalid(
      field === '_atLeastOneField'
        ? 'At least one field is required'
        : `Invalid ${field}`,
    );
  }
  return instance;
}
