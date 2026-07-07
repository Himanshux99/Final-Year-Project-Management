import {
  Controller,
  Post,
  Get,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TopicApprovalService } from './topic-approval.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

@Controller('topic-approval')
@UseGuards(JwtAuthGuard)
export class TopicApprovalController {
  constructor(private readonly topicApprovalService: TopicApprovalService) {}

  /**
   * Upload signed topic approval form
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.topicApprovalService.uploadDocument(req.user.userId, file);
  }

  /**
   * Get my group's topic approval document
   */
  @Get('my-document')
  async getMyDocument(@Req() req: AuthenticatedRequest) {
    return this.topicApprovalService.getMyDocument(req.user.userId);
  }

  /**
   * Get topic approval document for a specific group (faculty/admin)
   */
  @Get('group/:groupId')
  async getDocument(@Param('groupId') groupId: string) {
    return this.topicApprovalService.getDocument(groupId);
  }

  /**
   * Check if topic approval document exists for a group
   */
  @Get('exists/:groupId')
  async hasDocument(@Param('groupId') groupId: string) {
    const exists = await this.topicApprovalService.hasDocument(groupId);
    return { exists };
  }

  /**
   * Delete topic approval document (leader only)
   */
  @Delete()
  async deleteDocument(@Req() req: AuthenticatedRequest) {
    return this.topicApprovalService.deleteDocument(req.user.userId);
  }
}
