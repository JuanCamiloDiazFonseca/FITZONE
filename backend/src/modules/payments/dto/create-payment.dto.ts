import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
  Max,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsUUID('4')
  @IsNotEmpty()
  userId!: string;

  @IsUUID('4')
  @IsNotEmpty()
  membershipId!: string;

  @IsDateString()
  @IsNotEmpty()
  paidAt!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(99_999_999.99)
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
