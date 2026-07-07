import { Controller, Post, Body, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Department, Role } from '@prisma/client';

@Controller('profiles')
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req: ExpressRequest, @Body() createProfileDto: CreateProfileDto) {
    return this.profilesService.create(req.user.userId, createProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@Request() req: ExpressRequest) {
    return this.profilesService.findByUserId(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-id/:id')
  async getById(@Param('id') id: string) {
    return this.profilesService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-role/:role')
  async getByRole(@Param('role') role: Role) {
    return this.profilesService.findByRole(role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-department/:department')
  async getByDepartment(@Param('department') department: Department) {
    return this.profilesService.findByDepartment(department);
  }

  @UseGuards(JwtAuthGuard)
  @Get('faculty/:department')
  async getFacultyByDepartment(@Param('department') department: Department) {
    return this.profilesService.getFacultyByDepartment(department);
  }

  @UseGuards(JwtAuthGuard)
  @Post('batch')
  async getManyByIds(@Body() body: { ids: string[] }) {
    return this.profilesService.findManyByIds(body.ids);
  }
}
