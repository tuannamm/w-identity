import { IsBoolean } from 'class-validator';
export class SetUserStatusDto {
  @IsBoolean()
  declare enabled: boolean;
}
