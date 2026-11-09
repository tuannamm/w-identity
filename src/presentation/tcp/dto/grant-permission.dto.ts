import { IsString, MaxLength } from 'class-validator';
import { IsNonBlank } from './validators';
export class GrantPermissionDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(100)
  declare permissionKey: string;
}
