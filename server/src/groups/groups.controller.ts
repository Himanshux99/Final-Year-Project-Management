import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { GroupsService } from './groups.service';
import { JoinGroupDto } from './dto/join-group.dto';
import { SetMeetLinkDto } from './dto/set-meet-link.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Department } from '@prisma/client';

@Controller('groups')
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async create(@Request() req: ExpressRequest) {
    return this.groupsService.create(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('join')
  async join(
    @Request() req: ExpressRequest,
    @Body() joinGroupDto: JoinGroupDto,
  ) {
    return this.groupsService.joinByTeamCode(
      req.user.userId,
      joinGroupDto.teamCode,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-group')
  async getMyGroup(@Request() req: ExpressRequest) {
    return this.groupsService.getMyGroup(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-id/:id')
  async getById(@Param('id') id: string) {
    return this.groupsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-team-code/:teamCode')
  async getByTeamCode(@Param('teamCode') teamCode: string) {
    return this.groupsService.findByTeamCode(teamCode);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-department/:department')
  async getByDepartment(@Param('department') department: Department) {
    return this.groupsService.findByDepartment(department);
  }

  @UseGuards(JwtAuthGuard)
  @Get('with-details/:department')
  async getGroupsWithDetails(@Param('department') department: Department) {
    return this.groupsService.getGroupsWithDetails(department);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('meet-link')
  async setMeetLink(
    @Request() req: ExpressRequest,
    @Body() dto: SetMeetLinkDto,
  ) {
    return this.groupsService.setMeetLink(req.user.userId, dto.meetLink);
  }
}
