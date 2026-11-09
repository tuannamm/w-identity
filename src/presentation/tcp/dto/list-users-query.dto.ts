import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsNonBlank } from './validators';
const integer = (value: unknown) =>
  typeof value === 'string' && value.length <= 10 && /^\d+$/.test(value)
    ? Number(value)
    : Number.NaN;
export class ListUsersQueryDto {
  @Transform(({ value }) => integer(value))
  @IsInt()
  @Min(0)
  offset = 0;
  @Transform(({ value }) => integer(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNonBlank()
  @MaxLength(255)
  declare search?: string;
  @Transform(({ value }) =>
    value === 'true'
      ? true
      : value === 'false'
        ? false
        : value === undefined
          ? undefined
          : null,
  )
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  declare enabled?: boolean;
}
