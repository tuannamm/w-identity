import { IsString, MaxLength } from 'class-validator';
import { IsNonBlank, OptionalField, IsLegacyEmail } from './validators';
export class CreateUserDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(255)
  declare username: string;
  @IsString()
  @IsNonBlank()
  @MaxLength(255)
  @IsLegacyEmail()
  declare email: string;
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
}
