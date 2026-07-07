import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { IsString, IsNotEmpty } from 'class-validator';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class AllocateMentorDto {
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsString()
  @IsNotEmpty()
  mentorId: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('mentor-overview')
  async getMentorOverview(@Request() req: ExpressRequest) {
    return this.adminService.getMentorOverview(req.user.userId);
  }

  @Get('unassigned-groups')
  async getUnassignedGroups(@Request() req: ExpressRequest) {
    return this.adminService.getUnassignedGroups(req.user.userId);
  }

  @Get('available-mentors')
  async getAvailableMentors(@Request() req: ExpressRequest) {
    return this.adminService.getAvailableMentors(req.user.userId);
  }

  @Post('allocate-mentor')
  async allocateMentor(
    @Request() req: ExpressRequest,
    @Body() body: AllocateMentorDto,
  ) {
    return this.adminService.allocateMentor(
      req.user.userId,
      body.groupId,
      body.mentorId,
    );
  }
}
