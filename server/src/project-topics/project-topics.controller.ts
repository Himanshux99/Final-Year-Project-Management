import { Controller, Post, Body, Get, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ProjectTopicsService } from './project-topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { ReviewTopicDto } from './dto/review-topic.dto';
import { AddTopicMessageDto } from './dto/add-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('project-topics')
export class ProjectTopicsController {
  constructor(private projectTopicsService: ProjectTopicsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req: ExpressRequest, @Body() createTopicDto: CreateTopicDto) {
    return this.projectTopicsService.createTopic(req.user.userId, createTopicDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-group')
  async getMyGroupTopics(@Request() req: ExpressRequest) {
    return this.projectTopicsService.getTopicsByGroup(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('group/:groupId')
  async getTopicsByGroupId(@Request() req: ExpressRequest, @Param('groupId') groupId: string) {
    return this.projectTopicsService.getTopicsByGroupId(req.user.userId, groupId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/approve')
  async approve(@Request() req: ExpressRequest, @Param('id') id: string) {
    return this.projectTopicsService.approveTopic(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  async reject(@Request() req: ExpressRequest, @Param('id') id: string) {
    return this.projectTopicsService.rejectTopic(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/request-revision')
  async requestRevision(
    @Request() req: ExpressRequest,
    @Param('id') id: string,
    @Body() reviewTopicDto: ReviewTopicDto,
  ) {
    return this.projectTopicsService.requestRevision(req.user.userId, id, reviewTopicDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('messages')
  async addMessage(@Request() req: ExpressRequest, @Body() addMessageDto: AddTopicMessageDto) {
    return this.projectTopicsService.addMessage(req.user.userId, addMessageDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('messages/topic/:topicId')
  async getMessagesByTopic(@Param('topicId') topicId: string) {
    return this.projectTopicsService.getMessagesByTopic(topicId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('messages/my-group')
  async getMyGroupMessages(@Request() req: ExpressRequest) {
    return this.projectTopicsService.getMessagesByGroup(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('messages/group/:groupId')
  async getMessagesByGroupId(@Request() req: ExpressRequest, @Param('groupId') groupId: string) {
    return this.projectTopicsService.getMessagesByGroupId(req.user.userId, groupId);
  }
}
