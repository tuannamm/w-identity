import { Controller, Logger, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { GatewayRequest } from './contracts/gateway.contracts';
import * as Commands from '../../application/commands/role.commands';
import * as Queries from '../../application/queries/role.queries';
import { actorOf } from './dto/actor.mapper';
import { parseInput } from './dto/parse-input';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  RoleNameParamDto,
  RolePermissionParamDto,
} from './dto/role-name-param.dto';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UserIdParamDto } from './dto/user-id-param.dto';
import { IdentityErrorFilter } from './filters/identity-error.filter';

@Controller()
@UseFilters(IdentityErrorFilter)
export class RoleController {
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
        target: req.params?.name ?? req.params?.id,
        result: 'success',
      }),
    );
    return result;
  }
  @MessagePattern('identity.roles.create')
  create(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.commands.execute(
        new Commands.CreateRoleCommand(
          { ...parseInput(CreateRoleDto, req.body) },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.roles.list')
  list(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.queries.execute(new Queries.ListRolesQuery(actorOf(req))),
    );
  }
  @MessagePattern('identity.roles.get')
  get(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.queries.execute(
        new Queries.GetRoleQuery(
          { name: parseInput(RoleNameParamDto, req.params).name },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.roles.update')
  update(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.commands.execute(
        new Commands.UpdateRoleCommand(
          {
            name: parseInput(RoleNameParamDto, req.params).name,
            patch: { ...parseInput(UpdateRoleDto, req.body) },
          },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.roles.delete')
  delete(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.commands.execute(
        new Commands.DeleteRoleCommand(
          { name: parseInput(RoleNameParamDto, req.params).name },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.roles.grantPermission')
  grant(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.commands.execute(
        new Commands.GrantPermissionToRoleCommand(
          {
            name: parseInput(RoleNameParamDto, req.params).name,
            permissionKey: parseInput(GrantPermissionDto, req.body)
              .permissionKey,
          },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.roles.revokePermission')
  revoke(@Payload() req: GatewayRequest) {
    return this.run(req, () => {
      const params = parseInput(RolePermissionParamDto, req.params);
      return this.commands.execute(
        new Commands.RevokePermissionFromRoleCommand(
          { name: params.name, permissionKey: params.key },
          actorOf(req),
        ),
      );
    });
  }
  @MessagePattern('identity.users.getRole')
  getUserRole(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.queries.execute(
        new Queries.GetUserRoleQuery(
          { userId: parseInput(UserIdParamDto, req.params).id },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.users.assignRole')
  assignRole(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.commands.execute(
        new Commands.AssignRoleToUserCommand(
          {
            userId: parseInput(UserIdParamDto, req.params).id,
            roleName: parseInput(AssignRoleDto, req.body).roleName,
          },
          actorOf(req),
        ),
      ),
    );
  }
  @MessagePattern('identity.users.getPermissions')
  getUserPermissions(@Payload() req: GatewayRequest) {
    return this.run(req, () =>
      this.queries.execute(
        new Queries.GetUserPermissionsQuery(
          { userId: parseInput(UserIdParamDto, req.params).id },
          actorOf(req),
        ),
      ),
    );
  }
}
