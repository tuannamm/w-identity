import { IsString, MaxLength } from 'class-validator';
import {
  IsNonBlank,
  OptionalField,
  AtLeastOneField,
  IsLegacyEmail,
} from './validators';
export class UpdateUserDto {
  @OptionalField()
  @IsString()
  @IsNonBlank()
  @MaxLength(255)
  @IsLegacyEmail()
  declare email?: string;
  @OptionalField()
  @IsString()
  @IsNonBlank()
  @MaxLength(255)
  declare firstName?: string;
  @OptionalField()
  @IsString()
  @IsNonBlank()
  @MaxLength(255)
  declare lastName?: string;
  @AtLeastOneField(['email', 'firstName', 'lastName'])
  declare private readonly _atLeastOneField?: never;
}
