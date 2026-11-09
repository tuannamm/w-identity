import { IsString, MaxLength } from 'class-validator';
import { IsNonBlank, OptionalField } from './validators';
export class CreatePermissionDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(100)
  declare key: string;
  @OptionalField()
  @IsString()
  @IsNonBlank()
  @MaxLength(255)
  declare description?: string;
}
