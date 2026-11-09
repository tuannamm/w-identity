import { IsString, MaxLength } from 'class-validator';
import {
  IsNonBlank,
  OptionalField,
  AtLeastOneField,
  IsSafeAvatarUrl,
  IsTimezone,
  IsLocaleTag,
} from './validators';
export class UpdateMyProfileDto {
  @OptionalField()
  @IsString()
  @IsNonBlank()
  @MaxLength(2048)
  @IsSafeAvatarUrl()
  declare avatarUrl?: string;
  @OptionalField()
  @IsString()
  @IsNonBlank()
  @MaxLength(100)
  declare phoneNumber?: string;
  @OptionalField()
  @IsString()
  @IsNonBlank()
  @MaxLength(100)
  @IsTimezone()
  declare timezone?: string;
  @OptionalField()
  @IsString()
  @IsNonBlank()
  @MaxLength(100)
  @IsLocaleTag()
  declare locale?: string;
  @AtLeastOneField(['avatarUrl', 'phoneNumber', 'timezone', 'locale'])
  declare private readonly _atLeastOneField?: never;
}
