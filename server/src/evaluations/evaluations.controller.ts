import {
  Controller,
  Post,
  Get,
  UseGuards,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EvaluationsService } from './evaluations.service';
import { ReviewType } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

interface CreateEvaluationBody {
  sessionId: string;
  groupId: string;
  reviewType: ReviewType;
  evaluationDate: string;
  division: string;
  projectGuide: string;
  projectTitle: string;
  projectCategory?: string;
  projectType?: string;
  projectDomain?: string;
  qualityGrade?: string;
  projectNature?: string;
  completionPercentage: number;
  remarks?: string;
  studentGrades: Array<{
    profileId: string;
    studentName: string;
    rollNumber: string;
    progressMarks?: number;
    contributionMarks?: number;
    publicationMarks?: number;
    techUsageMarks?: number;
    innovationMarks?: number;
    presentationMarks?: number;
    activityMarks?: number;
    synopsisMarks?: number;
  }>;
}

@Controller('evaluations')
@UseGuards(JwtAuthGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  /**
   * Create a review evaluation
   */
  @Post()
  async createEvaluation(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateEvaluationBody,
  ) {
    return this.evaluationsService.createEvaluation(req.user.userId, {
      ...body,
      evaluationDate: new Date(body.evaluationDate),
    });
  }

  /**
   * Get pre-fill data for evaluation form
   */
  @Get('prefill/:sessionId')
  async getPreFillData(@Param('sessionId') sessionId: string) {
    return this.evaluationsService.getPreFillData(sessionId);
  }

  /**
   * Get evaluation by session ID
   */
  @Get('session/:sessionId')
  async getBySessionId(@Param('sessionId') sessionId: string) {
    return this.evaluationsService.getBySessionId(sessionId);
  }

  /**
   * Get all evaluations for a group
   */
  @Get('group/:groupId')
  async getByGroupId(@Param('groupId') groupId: string) {
    return this.evaluationsService.getByGroupId(groupId);
  }

  /**
   * Get all evaluations (admin dashboard)
   */
  @Get('admin')
  async getAllEvaluations(
    @Query('reviewType') reviewType?: ReviewType,
    @Query('department') department?: string,
  ) {
    return this.evaluationsService.getAllEvaluations({ reviewType, department });
  }
}
