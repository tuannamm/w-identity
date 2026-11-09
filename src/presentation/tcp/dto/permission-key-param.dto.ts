import { IsString, MaxLength } from 'class-validator';
import { IsNonBlank } from './validators';
export class PermissionKeyParamDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(100)
  declare key: string;
}
