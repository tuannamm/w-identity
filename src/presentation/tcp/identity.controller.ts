import { Controller, Logger, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { GatewayRequest } from './contracts/gateway.contracts';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import * as Commands from '../../application/commands/identity.commands';
import * as Queries from '../../application/queries/identity.queries';
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
@Controller()
@UseFilters(IdentityErrorFilter)
export class IdentityController {
  private readonly logger = new Logger('Identity');
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

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
      return this.commands.execute(
        new Commands.CreateUserCommand(input, actor),
      );
    });
  }
  @MessagePattern('identity.users.list')
  list(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.queries.execute(
        new Queries.ListUsersQuery(listQuery(req.query), actorOf(req)),
      ),
    );
  }
  @MessagePattern('identity.users.get')
  get(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.queries.execute(
        new Queries.GetUserQuery({ userId: userId(req) }, actorOf(req)),
      ),
    );
  }
  @MessagePattern('identity.users.update')
  update(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.commands.execute(
        new Commands.UpdateUserCommand(
          { userId: userId(req), patch: accountBody(req.body) },
          actorOf(req),
        ),
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
      return this.commands.execute(
        new Commands.SetUserStatusCommand(
          { userId: userId(req), enabled: input.enabled },
          actorOf(req),
        ),
      );
    });
  }
  @MessagePattern('identity.users.sendPasswordReset')
  reset(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.commands.execute(
        new Commands.SendPasswordResetEmailCommand(
          { userId: userId(req) },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.me.get')
  me(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.queries.execute(new Queries.GetMeQuery(actorOf(req))),
    );
  }
  @MessagePattern('identity.me.updateProfile')
  profile(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.commands.execute(
        new Commands.UpdateMyProfileCommand(
          profileBody(req.body),
          actorOf(req),
        ),
      ),
    );
  }
}
