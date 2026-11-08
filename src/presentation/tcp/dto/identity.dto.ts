import type {
  CreateUser,
  UpdateUser,
} from '../../../application/use-cases/identity.use-cases';
import { ApplicationError } from '../../../application/errors/application-error';
import type { Actor } from '../../../application/security/actor';
import type { GatewayRequest } from '../contracts/gateway.contracts';
function invalid(message: string): never {
  throw new ApplicationError('VALIDATION_ERROR', message);
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return invalid('JSON object is required');
  return value as Record<string, unknown>;
}
export function fields(
  value: unknown,
  allowed: string[],
): Record<string, unknown> {
  const record = object(value);
  if (Object.keys(record).some((key) => !allowed.includes(key)))
    invalid('Unknown input field');
  return record;
}
export function string(value: unknown, field: string, max = 255): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    return invalid(`Invalid ${field}`);
  return value;
}
export function accountBody(
  value: unknown,
  create: true,
): Parameters<CreateUser['execute']>[0];
export function accountBody(
  value: unknown,
  create?: false,
): Parameters<UpdateUser['execute']>[0]['patch'];
export function accountBody(
  value: unknown,
  create = false,
):
  | Parameters<CreateUser['execute']>[0]
  | Parameters<UpdateUser['execute']>[0]['patch'] {
  const record = fields(
    value,
    create
      ? ['username', 'email', 'firstName', 'lastName']
      : ['email', 'firstName', 'lastName'],
  );
  if (!Object.keys(record).length)
    invalid('At least one account field is required');
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(record))
    result[key] = string(val, key);
  if (create) {
    string(record.username, 'username');
    string(record.email, 'email');
  }
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))
    invalid('Invalid email');
  return create
    ? {
        ...result,
        username: string(record.username, 'username'),
        email: string(record.email, 'email'),
      }
    : result;
}
export function profileBody(value: unknown) {
  const record = fields(value, [
    'avatarUrl',
    'phoneNumber',
    'timezone',
    'locale',
  ]);
  if (!Object.keys(record).length)
    invalid('At least one profile field is required');
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(record))
    result[key] = string(val, key, key === 'avatarUrl' ? 2048 : 100);
  if (result.avatarUrl) {
    try {
      const url = new URL(result.avatarUrl);
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password
      )
        invalid('Invalid avatarUrl');
    } catch {
      invalid('Invalid avatarUrl');
    }
  }
  if (result.timezone) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: result.timezone });
    } catch {
      invalid('Invalid timezone');
    }
  }
  if (result.locale) {
    try {
      if (!Intl.getCanonicalLocales(result.locale).length)
        invalid('Invalid locale');
    } catch {
      invalid('Invalid locale');
    }
  }
  return result;
}
export function listQuery(value: unknown) {
  const q = fields(value, ['search', 'enabled', 'offset', 'limit']);
  const integer = (key: string, fallback: number) => {
    if (q[key] === undefined) return fallback;
    const raw = string(q[key], key, 10);
    if (!/^\d+$/.test(raw)) return invalid(`Invalid ${key}`);
    return Number(raw);
  };
  if (q.enabled !== undefined && q.enabled !== 'true' && q.enabled !== 'false')
    invalid('Invalid enabled');
  return {
    offset: integer('offset', 0),
    limit: integer('limit', 20),
    ...(q.search !== undefined ? { search: string(q.search, 'search') } : {}),
    ...(q.enabled !== undefined ? { enabled: q.enabled === 'true' } : {}),
  };
}
export function actorOf(req: GatewayRequest): Actor {
  const user = req?.user;
  if (
    !user ||
    typeof user.sub !== 'string' ||
    typeof user.iss !== 'string' ||
    !Array.isArray(user.roles) ||
    user.roles.some((r) => typeof r !== 'string')
  )
    throw new ApplicationError(
      'UNAUTHENTICATED',
      'Authenticated identity is required',
    );
  return { userId: user.sub, issuer: user.iss, roles: user.roles };
}
export function userId(req: GatewayRequest) {
  return string(req?.params?.id, 'user id', 128);
}
