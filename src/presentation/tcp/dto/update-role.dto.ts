import { IsString, MaxLength } from 'class-validator';
import { IsNonBlank, OptionalField, AtLeastOneField } from './validators';
export class UpdateRoleDto {
  @OptionalField()
  @IsString()
  @IsNonBlank()
  @MaxLength(255)
  declare description?: string;
  @AtLeastOneField(['description'])
  declare private readonly _atLeastOneField?: never;
}
