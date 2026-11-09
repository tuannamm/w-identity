import { IsString, MaxLength } from 'class-validator';
import { IsNonBlank } from './validators';
export class RoleNameParamDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(50)
  declare name: string;
}
// `:name/permissions/:key` (revoke)
export class RolePermissionParamDto extends RoleNameParamDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(100)
  declare key: string;
}
