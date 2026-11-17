import { Controller, Get } from '@nestjs/common';
import { PlansService } from './plans.service';
import { Roles } from '../auth/roles.decorator';

@Controller('plans')
@Roles('ADMIN', 'CUSTOMER')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list() {
    return this.plansService.findAll();
  }
}
