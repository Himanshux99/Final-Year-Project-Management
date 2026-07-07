import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { GroupsService } from '../groups/groups.service';
import { RolloutReviewDto } from './dto/rollout-review.dto';
import { SubmitProgressDto } from './dto/submit-progress.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { AddReviewMessageDto } from './dto/add-message.dto';
import { ReviewType } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService,
    private groupsService: GroupsService,
  ) {}

  // Rollout review for department
  async rolloutReview(userId: string, rolloutDto: RolloutReviewDto) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile || profile.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can rollout reviews');
    }

    // Check if already rolled out
    const existing = await this.prisma.reviewRollout.findUnique({
      where: {
        department_reviewType: {
          department: profile.department,
          reviewType: rolloutDto.reviewType,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.reviewRollout.create({
      data: {
        department: profile.department,
        reviewType: rolloutDto.reviewType,
        createdBy: profile.id,
      },
    });
  }

  // Get rollout status for department
  async getReviewRollout(userId: string, reviewType: ReviewType) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    return this.prisma.reviewRollout.findUnique({
      where: {
        department_reviewType: {
          department: profile.department,
          reviewType,
        },
      },
    });
  }

  // Submit or update progress
  async submitProgress(
    userId: string,
    reviewType: ReviewType,
    submitDto: SubmitProgressDto,
  ) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile || profile.role !== 'student') {
      throw new ForbiddenException('Only students can submit progress');
    }

    const group = await this.groupsService.getMyGroup(userId);
    if (!group) {
      throw new BadRequestException('You must be in a group');
    }

    // Check if group leader
    if (group.createdBy !== profile.id) {
      throw new ForbiddenException('Only group leader can submit progress');
    }

    // Check if review is rolled out
    const rollout = await this.prisma.reviewRollout.findUnique({
      where: {
        department_reviewType: {
          department: profile.department,
          reviewType,
        },
      },
    });

    if (!rollout) {
      throw new BadRequestException('This review has not been rolled out yet');
    }

    // Check for existing session
    const existing = await this.prisma.reviewSession.findUnique({
      where: {
        groupId_reviewType: {
          groupId: group.id,
          reviewType,
        },
      },
    });

    if (existing) {
      // Update existing
      return this.prisma.reviewSession.update({
        where: { id: existing.id },
        data: {
          progressPercentage: submitDto.progressPercentage,
          progressDescription: submitDto.progressDescription,
          status: 'submitted',
          submittedBy: profile.id,
          submittedAt: new Date(),
        },
      });
    }

    // Create new session
    return this.prisma.reviewSession.create({
      data: {
        groupId: group.id,
        reviewType,
        progressPercentage: submitDto.progressPercentage,
        progressDescription: submitDto.progressDescription,
        status: 'submitted',
        submittedBy: profile.id,
      },
    });
  }

  // Submit feedback
  async submitFeedback(
    userId: string,
    sessionId: string,
    feedbackDto: SubmitFeedbackDto,
  ) {
    const profile = await this.profilesService.findByUserId(userId);
    if (
      !profile ||
      (profile.role !== 'faculty' && profile.role !== 'super_admin')
    ) {
      throw new ForbiddenException('Only faculty can submit feedback');
    }

    const session = await this.prisma.reviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Review session not found');
    }

    return this.prisma.reviewSession.update({
      where: { id: sessionId },
      data: {
        mentorFeedback: feedbackDto.feedback,
        feedbackGivenBy: profile.id,
        feedbackGivenAt: new Date(),
        status: 'feedback_given',
      },
    });
  }

  // Mark review as complete
  async markComplete(userId: string, sessionId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (
      !profile ||
      (profile.role !== 'faculty' && profile.role !== 'super_admin')
    ) {
      throw new ForbiddenException('Only faculty can mark reviews as complete');
    }

    const session = await this.prisma.reviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Review session not found');
    }
    console.log('session:', session);
    return this.prisma.reviewSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
      },
    });
  }

  // Get review session for group
  async getMyReviewSession(userId: string, reviewType: ReviewType) {
    const group = await this.groupsService.getMyGroup(userId);
    if (!group) {
      return null;
    }

    return this.prisma.reviewSession.findUnique({
      where: {
        groupId_reviewType: {
          groupId: group.id,
          reviewType,
        },
      },
    });
  }

  // Get review session by groupId (for faculty/admin)
  async getSessionByGroupId(
    userId: string,
    groupId: string,
    reviewType: ReviewType,
  ) {
    const profile = await this.profilesService.findByUserId(userId);
    if (
      !profile ||
      (profile.role !== 'faculty' && profile.role !== 'super_admin')
    ) {
      throw new ForbiddenException('Only faculty can access group sessions');
    }

    return this.prisma.reviewSession.findUnique({
      where: {
        groupId_reviewType: {
          groupId,
          reviewType,
        },
      },
    });
  }

  // Add message to review
  async addMessage(userId: string, addMessageDto: AddReviewMessageDto) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    const session = await this.prisma.reviewSession.findUnique({
      where: { id: addMessageDto.sessionId },
    });

    if (!session) {
      throw new NotFoundException('Review session not found');
    }

    return this.prisma.reviewMessage.create({
      data: {
        sessionId: addMessageDto.sessionId,
        groupId: session.groupId,
        authorId: profile.id,
        authorName: profile.name,
        authorRole: profile.role === 'student' ? 'student' : 'faculty',
        content: addMessageDto.content,
        links: addMessageDto.links || [],
      },
    });
  }

  // Get messages for review session
  async getMessagesBySession(sessionId: string) {
    return this.prisma.reviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Get messages by group and review type
  async getMyReviewMessages(userId: string, reviewType: ReviewType) {
    const session = await this.getMyReviewSession(userId, reviewType);
    if (!session) {
      return [];
    }

    return this.getMessagesBySession(session.id);
  }

  // Set meet link for a review session
  async setMeetLink(userId: string, sessionId: string, meetLink: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile || profile.role !== 'student') {
      throw new ForbiddenException('Only students can set meet links');
    }

    const group = await this.groupsService.getMyGroup(userId);
    if (!group) {
      throw new BadRequestException('You must be in a group');
    }

    if (group.createdBy !== profile.id) {
      throw new ForbiddenException(
        'Only the group leader can set the meet link',
      );
    }

    const session = await this.prisma.reviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Review session not found');
    }

    if (session.groupId !== group.id) {
      throw new ForbiddenException(
        'This session does not belong to your group',
      );
    }

    return this.prisma.reviewSession.update({
      where: { id: sessionId },
      data: { meetLink },
    });
  }

  async getSessionsByGroupIds(
    userId: string,
    groupIds: string[],
  ) {
    const profile = await this.profilesService.findByUserId(userId);

    if (
      !profile ||
      (profile.role !== 'faculty' && profile.role !== 'super_admin')
    ) {
      throw new ForbiddenException(
        'Only faculty can access group sessions',
      );
    }

    return this.prisma.reviewSession.findMany({
      where: {
        groupId: {
          in: groupIds,
        },
      },
    });
  }
}
