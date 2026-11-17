import { MembershipStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateMembershipDto {
  @IsUUID('4')
  @IsNotEmpty()
  userId!: string;

  @IsUUID('4')
  @IsNotEmpty()
  planId!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsEnum(MembershipStatus)
  status!: MembershipStatus;
}
