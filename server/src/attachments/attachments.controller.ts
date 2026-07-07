import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
      },
    }),
  )
  async uploadAttachment(
    @Request() req: ExpressRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.attachmentsService.uploadAttachment(
      req.user.userId,
      file,
    );
  }

  @Get('my-group')
  async getMyGroupAttachments(@Request() req: ExpressRequest) {
    return this.attachmentsService.getMyGroupAttachments(req.user.userId);
  }

  @Get('group/:groupId')
  async getAttachmentsByGroup(@Param('groupId') groupId: string) {
    return this.attachmentsService.getAttachmentsByGroup(groupId);
  }

  @Delete(':id')
  async deleteAttachment(
    @Request() req: ExpressRequest,
    @Param('id') id: string,
  ) {
    return this.attachmentsService.deleteAttachment(req.user.userId, id);
  }
}
