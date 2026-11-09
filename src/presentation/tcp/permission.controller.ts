import { Controller, Logger, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { GatewayRequest } from './contracts/gateway.contracts';
import * as Commands from '../../application/commands/permission.commands';
import * as Queries from '../../application/queries/permission.queries';
import { actorOf } from './dto/actor.mapper';
import { parseInput } from './dto/parse-input';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { PermissionKeyParamDto } from './dto/permission-key-param.dto';
import { IdentityErrorFilter } from './filters/identity-error.filter';

@Controller()
@UseFilters(IdentityErrorFilter)
export class PermissionController {
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
        target: req.params?.key,
        result: 'success',
      }),
    );
    return result;
  }
  @MessagePattern('identity.permissions.create')
  create(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.commands.execute(
        new Commands.CreatePermissionCommand(
          { ...parseInput(CreatePermissionDto, req.body) },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.permissions.list')
  list(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.queries.execute(new Queries.ListPermissionsQuery(actorOf(req))),
    );
  }
  @MessagePattern('identity.permissions.get')
  get(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.queries.execute(
        new Queries.GetPermissionQuery(
          { key: parseInput(PermissionKeyParamDto, req.params).key },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.permissions.delete')
  delete(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.commands.execute(
        new Commands.DeletePermissionCommand(
          { key: parseInput(PermissionKeyParamDto, req.params).key },
          actorOf(req),
        ),
      ),
    );
  }
}
