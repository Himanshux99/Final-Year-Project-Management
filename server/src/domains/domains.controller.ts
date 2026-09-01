import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { DomainsService } from './domains.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('domains')
@UseGuards(JwtAuthGuard)
export class DomainsController {
  constructor(private domainsService: DomainsService) {}

  @Get()
  async findActive() {
    return this.domainsService.findActive();
  }

  @Get('all')
  async findAll(@Request() req: ExpressRequest) {
    return this.domainsService.findAll(req.user.userId);
  }

  @Post()
  async create(@Request() req: ExpressRequest, @Body() dto: CreateDomainDto) {
    return this.domainsService.create(req.user.userId, dto);
  }

  @Patch(':id')
  async update(
    @Request() req: ExpressRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDomainDto,
  ) {
    return this.domainsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  async remove(@Request() req: ExpressRequest, @Param('id') id: string) {
    return this.domainsService.remove(req.user.userId, id);
  }
}
