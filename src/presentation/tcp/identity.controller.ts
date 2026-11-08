import { Controller, Inject, Logger, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { GatewayRequest } from './contracts/gateway.contracts';
import * as Cases from '../../application/use-cases/identity.use-cases';
import {
  accountBody,
  actorOf,
  fields,
  listQuery,
  profileBody,
  userId,
} from './dto/identity.dto';
import { ApplicationError } from '../../application/errors/application-error';
import { IdentityErrorFilter } from './filters/identity-error.filter';
export const IDENTITY_CASES = Symbol('IDENTITY_CASES');
export interface IdentityCases {
  create: Cases.CreateUser;
  list: Cases.ListUsers;
  get: Cases.GetUser;
  update: Cases.UpdateUser;
  status: Cases.SetUserStatus;
  roles: Cases.ListRoles;
  assign: Cases.AssignUserRole;
  remove: Cases.RemoveUserRole;
  reset: Cases.SendPasswordResetEmail;
  me: Cases.GetMe;
  profile: Cases.UpdateMyProfile;
}
@Controller()
@UseFilters(IdentityErrorFilter)
export class IdentityController {
  private readonly logger = new Logger('Identity');
  constructor(@Inject(IDENTITY_CASES) private readonly cases: IdentityCases) {}
  private async run(req: GatewayRequest, action: () => Promise<unknown>) {
    const result = await action();
    this.logger.log(
      JSON.stringify({
        requestId: req.meta?.requestId,
        actor: req.user?.sub,
        operation: req.meta?.operationId,
        target: req.params?.id ?? req.user?.sub,
        result: 'success',
      }),
    );
    return result;
  }
  @MessagePattern('identity.users.create')
  create(@Payload() req: GatewayRequest) {
    return this.run(req, () => {
      const actor = actorOf(req);
      const input = accountBody(req.body, true);
      return this.cases.create.execute(input, actor);
    });
  }
  @MessagePattern('identity.users.list')
  list(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.cases.list.execute(listQuery(req.query), actorOf(req)),
    );
  }
  @MessagePattern('identity.users.get')
  get(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.cases.get.execute({ userId: userId(req) }, actorOf(req)),
    );
  }
  @MessagePattern('identity.users.update')
  update(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.cases.update.execute(
        { userId: userId(req), patch: accountBody(req.body) },
        actorOf(req),
      ),
    );
  }
  @MessagePattern('identity.users.setStatus')
  status(@Payload() req: GatewayRequest) {
    return this.run(req, () => {
      const input = fields(req.body, ['enabled']);
      if (typeof input.enabled !== 'boolean')
        throw new ApplicationError(
          'VALIDATION_ERROR',
          'enabled must be boolean',
        );
      return this.cases.status.execute(
        { userId: userId(req), enabled: input.enabled },
        actorOf(req),
      );
    });
  }
  @MessagePattern('identity.roles.list')
  roles(@Payload() req: GatewayRequest) {
    return this.run(req, () => this.cases.roles.execute({}, actorOf(req)));
  }
  @MessagePattern('identity.users.assignRole')
  assign(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.cases.assign.execute(
        { userId: userId(req), role: req.params?.role },
        actorOf(req),
      ),
    );
  }
  @MessagePattern('identity.users.removeRole')
  remove(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.cases.remove.execute(
        { userId: userId(req), role: req.params?.role },
        actorOf(req),
      ),
    );
  }
  @MessagePattern('identity.users.sendPasswordReset')
  reset(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.cases.reset.execute({ userId: userId(req) }, actorOf(req)),
    );
  }
  @MessagePattern('identity.me.get')
  me(@Payload() req: GatewayRequest) {
    return this.run(req, () => this.cases.me.execute({}, actorOf(req)));
  }
  @MessagePattern('identity.me.updateProfile')
  profile(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.cases.profile.execute(profileBody(req.body), actorOf(req)),
    );
  }
}
