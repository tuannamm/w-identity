import { IsString, MaxLength } from 'class-validator';
import { IsNonBlank } from './validators';
export class AssignRoleDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(50)
  declare roleName: string;
}
