import { Controller, Get, Header } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../auth/roles.decorator';

@Controller('dashboard')
@Roles('ADMIN')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  summary() {
    return this.dashboard.summary();
  }
}
