import { parseInput } from './parse-input';
import { CreatePermissionDto } from './create-permission.dto';
import { CreateRoleDto } from './create-role.dto';
import { UpdateRoleDto } from './update-role.dto';
import { GrantPermissionDto } from './grant-permission.dto';
import { AssignRoleDto } from './assign-role.dto';
import {
  RoleNameParamDto,
  RolePermissionParamDto,
} from './role-name-param.dto';
import { PermissionKeyParamDto } from './permission-key-param.dto';
import { rpcError } from '../filters/identity-error.filter';
import { DomainError } from '../../../domain/errors/domain-error';

describe('RBAC DTOs', () => {
  it('accepts valid payloads', () => {
    expect(
      parseInput(CreatePermissionDto, { key: 'a:b', description: 'd' }),
    ).toEqual({
      key: 'a:b',
      description: 'd',
    });
    expect(
      parseInput(CreateRoleDto, { name: 'editor', permissionKeys: ['a:b'] }),
    ).toEqual({ name: 'editor', permissionKeys: ['a:b'] });
    expect(parseInput(UpdateRoleDto, { description: 'x' })).toEqual({
      description: 'x',
    });
    expect(
      parseInput(GrantPermissionDto, { permissionKey: 'a:b' }).permissionKey,
    ).toBe('a:b');
    expect(parseInput(AssignRoleDto, { roleName: 'editor' }).roleName).toBe(
      'editor',
    );
    expect(
      parseInput(RolePermissionParamDto, { name: 'r', key: 'a:b' }),
    ).toEqual({
      name: 'r',
      key: 'a:b',
    });
  });
  it.each([
    [CreatePermissionDto, { key: 'a:b', system: true }],
    [CreatePermissionDto, {}],
    [CreateRoleDto, { name: 'editor', system: true }],
    [CreateRoleDto, { name: 'editor', permissionKeys: 'a:b' }],
    [CreateRoleDto, { name: 'editor', permissionKeys: [1] }],
    [UpdateRoleDto, {}],
    [UpdateRoleDto, { name: 'other' }],
    [GrantPermissionDto, { permissionKey: 5 }],
    [AssignRoleDto, { roleName: ['a', 'b'] }],
    [AssignRoleDto, { roleName: 'r', userId: 'victim' }],
    [RoleNameParamDto, {}],
    [PermissionKeyParamDto, { key: ' ' }],
  ])('rejects malformed input %#', (dto, input) => {
    expect(() => parseInput(dto as never, input)).toThrow();
  });
  it('maps RBAC domain errors', () => {
    expect(rpcError(new DomainError('SYSTEM_ROLE_PROTECTED', 'm'))).toEqual({
      statusCode: 403,
      code: 'SYSTEM_ROLE_PROTECTED',
      message: 'm',
    });
    expect(rpcError(new DomainError('INVALID_ROLE', 'm')).statusCode).toBe(400);
    expect(rpcError(new DomainError('INVALID_PERMISSION', 'm')).code).toBe(
      'VALIDATION_ERROR',
    );
  });
});
