import { Controller, Post, Body, Get, Param, Patch, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectTopicsService } from './project-topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { ReviewTopicDto } from './dto/review-topic.dto';
import { AddTopicMessageDto } from './dto/add-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Controller('project-topics')
export class ProjectTopicsController {
  constructor(private projectTopicsService: ProjectTopicsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async create(
    @Request() req: ExpressRequest,
    @Body() createTopicDto: CreateTopicDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.projectTopicsService.createTopic(req.user.userId, createTopicDto, file);
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
  
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async update(
    @Request() req: ExpressRequest,
    @Param('id') id: string,
    @Body() updateTopicDto: UpdateTopicDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.projectTopicsService.updateTopic(
      req.user.userId,
      id,
      updateTopicDto,
      file,
    );
  }
}
