import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { MentorPreferencesService } from './mentor-preferences.service';
import { SubmitPreferencesDto } from './dto/submit-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mentor-preferences')
export class MentorPreferencesController {
  constructor(private mentorPreferencesService: MentorPreferencesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async submit(@Request() req: ExpressRequest, @Body() submitDto: SubmitPreferencesDto) {
    return this.mentorPreferencesService.submitPreferences(req.user.userId, submitDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-preferences')
  async getMyPreferences(@Request() req: ExpressRequest) {
    return this.mentorPreferencesService.getMyPreferences(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('has-submitted')
  async hasSubmitted(@Request() req: ExpressRequest) {
    const hasSubmitted = await this.mentorPreferencesService.hasSubmittedPreferences(req.user.userId);
    return { hasSubmitted };
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-group/:groupId')
  async getByGroup(@Param('groupId') groupId: string) {
    return this.mentorPreferencesService.getByGroup(groupId);
  }
}
