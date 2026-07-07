import { Controller, Post, Get, Param, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { MentorAllocationsService } from './mentor-allocations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mentor-allocations')
export class MentorAllocationsController {
  constructor(private mentorAllocationsService: MentorAllocationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('for-mentor')
  async getAllocationsForMentor(@Request() req: ExpressRequest) {
    return this.mentorAllocationsService.getAllocationsForMentor(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('for-group')
  async getAllocationsForGroup(@Request() req: ExpressRequest) {
    return this.mentorAllocationsService.getAllocationsForGroup(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('accepted-mentor')
  async getAcceptedMentor(@Request() req: ExpressRequest) {
    return this.mentorAllocationsService.getAcceptedMentor(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getMentorStatus(@Request() req: ExpressRequest) {
    return this.mentorAllocationsService.getMentorStatus(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('accepted-teams')
  async getAcceptedTeams(@Request() req: ExpressRequest) {
    return this.mentorAllocationsService.getAcceptedTeams(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/accept')
  async accept(@Request() req: ExpressRequest, @Param('id') id: string) {
    return this.mentorAllocationsService.acceptAllocation(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reject')
  async reject(@Request() req: ExpressRequest, @Param('id') id: string) {
    return this.mentorAllocationsService.rejectAllocation(req.user.userId, id);
  }
}
