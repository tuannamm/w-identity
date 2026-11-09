import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';
import { IsNonBlank, OptionalField } from './validators';
export class CreateRoleDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(50)
  declare name: string;
  @OptionalField()
  @IsString()
  @IsNonBlank()
  @MaxLength(255)
  declare description?: string;
  @OptionalField()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  declare permissionKeys?: string[];
}
