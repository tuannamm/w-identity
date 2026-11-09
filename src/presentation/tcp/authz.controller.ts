import { Controller, UseFilters } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ResolveUserAccessQuery } from '../../application/queries/access.queries';
import type { GatewayRequest } from './contracts/gateway.contracts';
import { parseInput } from './dto/parse-input';
import { UserIdParamDto } from './dto/user-id-param.dto';
import { IdentityErrorFilter } from './filters/identity-error.filter';
@Controller()
@UseFilters(IdentityErrorFilter)
export class AuthzController {
  constructor(private readonly queries: QueryBus) {}
  @MessagePattern('identity.authz.permissions')
  resolve(@Payload() req: GatewayRequest) {
    return this.queries.execute(
      new ResolveUserAccessQuery(parseInput(UserIdParamDto, req.params).id),
    );
  }
}
