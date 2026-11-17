import { MembershipStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class UpdateMembershipDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID('4')
  planId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString()
  startDate?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}
