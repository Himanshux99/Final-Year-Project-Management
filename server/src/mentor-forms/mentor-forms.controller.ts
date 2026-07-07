import { Controller, Post, Body, Get, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { MentorFormsService } from './mentor-forms.service';
import { CreateMentorFormDto } from './dto/create-mentor-form.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Department } from '@prisma/client';

@Controller('mentor-forms')
export class MentorFormsController {
  constructor(private mentorFormsService: MentorFormsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req: ExpressRequest, @Body() createFormDto: CreateMentorFormDto) {
    return this.mentorFormsService.create(req.user.userId, createFormDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('active')
  async getActiveFormForUser(@Request() req: ExpressRequest) {
    return this.mentorFormsService.getActiveFormForUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('active/:department')
  async getActiveForm(@Param('department') department: Department) {
    return this.mentorFormsService.getActiveForm(department);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.mentorFormsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/deactivate')
  async deactivate(@Request() req: ExpressRequest, @Param('id') id: string) {
    return this.mentorFormsService.deactivateForm(req.user.userId, id);
  }
}
