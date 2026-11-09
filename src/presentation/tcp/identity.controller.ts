import { GetMyAccessQuery } from '../../application/queries/access.queries';
import { Controller, Logger, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { GatewayRequest } from './contracts/gateway.contracts';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import * as Commands from '../../application/commands/identity.commands';
import * as Queries from '../../application/queries/identity.queries';
import { actorOf } from './dto/actor.mapper';
import { parseInput } from './dto/parse-input';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserIdParamDto } from './dto/user-id-param.dto';
import { SetUserStatusDto } from './dto/set-user-status.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
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
      const input = { ...parseInput(CreateUserDto, req.body) };
      return this.commands.execute(
        new Commands.CreateUserCommand(input, actor),
      );
    });
  }
  @MessagePattern('identity.users.list')
  list(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.queries.execute(
        new Queries.ListUsersQuery(
          { ...parseInput(ListUsersQueryDto, req.query) },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.users.get')
  get(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.queries.execute(
        new Queries.GetUserQuery(
          { userId: parseInput(UserIdParamDto, req.params).id },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.users.update')
  update(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.commands.execute(
        new Commands.UpdateUserCommand(
          {
            userId: parseInput(UserIdParamDto, req.params).id,
            patch: { ...parseInput(UpdateUserDto, req.body) },
          },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.users.setStatus')
  status(@Payload() req: GatewayRequest) {
    return this.run(req, () => {
      const input = parseInput(SetUserStatusDto, req.body);
      return this.commands.execute(
        new Commands.SetUserStatusCommand(
          {
            userId: parseInput(UserIdParamDto, req.params).id,
            enabled: input.enabled,
          },
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
          { userId: parseInput(UserIdParamDto, req.params).id },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.me.permissions')
  permissions(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.queries.execute(new GetMyAccessQuery(actorOf(req))),
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
          { ...parseInput(UpdateMyProfileDto, req.body) },
          actorOf(req),
        ),
      ),
    );
  }
}
