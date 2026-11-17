import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { ListMembershipsQueryDto } from './dto/list-memberships-query.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { MembershipsService } from './memberships.service';
import { Roles } from '../auth/roles.decorator';

@Controller('memberships')
@Roles('ADMIN')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post()
  create(@Body() membership: CreateMembershipDto) {
    return this.membershipsService.create(membership);
  }

  @Get()
  list(@Query() query: ListMembershipsQueryDto) {
    return this.membershipsService.findAll(query);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() membership: UpdateMembershipDto,
  ) {
    return this.membershipsService.update(id, membership);
  }
}
