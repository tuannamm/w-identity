import 'reflect-metadata';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { AuthzController } from './authz.controller';
import { ResolveUserAccessHandler } from '../../application/queries/access-query.handlers';
import { ResolveUserAccessQuery } from '../../application/queries/access.queries';
import type { GatewayRequest } from './contracts/gateway.contracts';

// Load the actual gateway resolver contract, not a copy of its pattern or parser.
const {
  AUTHZ_PATTERN,
  parsePermissions,
} = require('../../../../api-gateway/src/gateway/auth/permission-resolver');

describe('AuthzController contract', () => {
  const execute = jest.fn();
  const controller = new AuthzController({ execute } as never);
  const request = (params: unknown) => ({ params }) as GatewayRequest;
  beforeEach(() => execute.mockReset());
  it.each([undefined, {}, { id: '' }, { id: 123 }, { id: 'u', extra: true }])(
    'rejects invalid params %p',
    (params) => {
      expect(() => controller.resolve(request(params))).toThrow();
      expect(execute).not.toHaveBeenCalled();
    },
  );
  it('matches the gateway RPC pattern and its response parser', async () => {
    expect(
      Reflect.getMetadata(PATTERN_METADATA, AuthzController.prototype.resolve),
    ).toContain(AUTHZ_PATTERN);
    const handler = new ResolveUserAccessHandler({
      resolve: async () => ({ permissions: ['users:read'] }),
    } as never);
    execute.mockImplementation((query: ResolveUserAccessQuery) =>
      handler.execute(query),
    );
    const response = await controller.resolve(request({ id: 'u1' }));
    expect(execute).toHaveBeenCalledWith(new ResolveUserAccessQuery('u1'));
    expect([...parsePermissions(response)]).toEqual(['users:read']);
  });
});
