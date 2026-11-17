import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { PaymentsService } from './payments.service';
import { Roles } from '../auth/roles.decorator';

@Controller('payments')
@Roles('ADMIN')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() payment: CreatePaymentDto) {
    return this.paymentsService.create(payment);
  }

  @Get()
  list(@Query() pagination: ListPaymentsQueryDto) {
    return this.paymentsService.findAll(pagination);
  }
}
