import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { ReviewType } from '@prisma/client';

interface StudentGradeInput {
  profileId: string;
  studentName: string;
  rollNumber: string;
  // Review 1 grades
  progressMarks?: number;
  contributionMarks?: number;
  publicationMarks?: number;
  // Review 2 grades
  techUsageMarks?: number;
  innovationMarks?: number;
  presentationMarks?: number;
  activityMarks?: number;
  synopsisMarks?: number;
}

interface CreateEvaluationDto {
  sessionId: string;
  groupId: string;
  reviewType: ReviewType;
  evaluationDate: Date;
  division: string;
  projectGuide: string;
  projectTitle: string;
  // Review 1 specific
  projectCategory?: string;
  projectType?: string;
  // Review 2 specific
  projectDomain?: string;
  qualityGrade?: string;
  projectNature?: string;
  // Common
  completionPercentage: number;
  remarks?: string;
  // Student grades
  studentGrades: StudentGradeInput[];
}

@Injectable()
export class EvaluationsService {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService,
  ) {}

  /**
   * Create a review evaluation (faculty only)
   */
  async createEvaluation(userId: string, dto: CreateEvaluationDto) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    if (profile.role !== 'faculty' && profile.role !== 'super_admin') {
      throw new ForbiddenException('Only faculty/admin can create evaluations');
    }

    // Check if evaluation already exists for this session
    const existing = await this.prisma.reviewEvaluation.findUnique({
      where: { sessionId: dto.sessionId },
    });

    if (existing) {
      throw new BadRequestException('Evaluation already exists for this session');
    }

    // Validate student grades
    const validatedGrades = dto.studentGrades.map((grade) => {
      let totalMarks = 0;
      
      if (dto.reviewType === 'review_1') {
        // Review 1: Progress(10) + Contribution(10) + Publication(5) = 25
        const progress = Math.min(Math.max(grade.progressMarks || 0, 0), 10);
        const contribution = Math.min(Math.max(grade.contributionMarks || 0, 0), 10);
        const publication = Math.min(Math.max(grade.publicationMarks || 0, 0), 5);
        totalMarks = progress + contribution + publication;
        
        return {
          ...grade,
          progressMarks: progress,
          contributionMarks: contribution,
          publicationMarks: publication,
          totalMarks,
        };
      } else {
        // Review 2: Tech(5) + Innovation(5) + Presentation(5) + Activity(5) + Synopsis(5) = 25
        const tech = Math.min(Math.max(grade.techUsageMarks || 0, 0), 5);
        const innovation = Math.min(Math.max(grade.innovationMarks || 0, 0), 5);
        const presentation = Math.min(Math.max(grade.presentationMarks || 0, 0), 5);
        const activity = Math.min(Math.max(grade.activityMarks || 0, 0), 5);
        const synopsis = Math.min(Math.max(grade.synopsisMarks || 0, 0), 5);
        totalMarks = tech + innovation + presentation + activity + synopsis;
        
        return {
          ...grade,
          techUsageMarks: tech,
          innovationMarks: innovation,
          presentationMarks: presentation,
          activityMarks: activity,
          synopsisMarks: synopsis,
          totalMarks,
        };
      }
    });

    // Create evaluation with student grades
    const evaluation = await this.prisma.reviewEvaluation.create({
      data: {
        sessionId: dto.sessionId,
        groupId: dto.groupId,
        reviewType: dto.reviewType,
        evaluationDate: dto.evaluationDate,
        division: dto.division,
        projectGuide: dto.projectGuide,
        projectTitle: dto.projectTitle,
        projectCategory: dto.projectCategory,
        projectType: dto.projectType,
        projectDomain: dto.projectDomain,
        qualityGrade: dto.qualityGrade,
        projectNature: dto.projectNature,
        completionPercentage: dto.completionPercentage,
        remarks: dto.remarks,
        filledBy: profile.id,
        studentGrades: {
          create: validatedGrades,
        },
      },
      include: {
        studentGrades: true,
        mentor: {
          select: { id: true, name: true, email: true },
        },
        group: {
          select: { id: true, groupId: true, teamCode: true },
        },
      },
    });

    return evaluation;
  }

  /**
   * Get evaluation by session ID
   */
  async getBySessionId(sessionId: string) {
    const evaluation = await this.prisma.reviewEvaluation.findUnique({
      where: { sessionId },
      include: {
        studentGrades: {
          include: {
            student: {
              select: { id: true, name: true, email: true, rollNumber: true },
            },
          },
        },
        mentor: {
          select: { id: true, name: true, email: true },
        },
        group: {
          select: { id: true, groupId: true, teamCode: true },
        },
      },
    });

    return evaluation;
  }

  /**
   * Get all evaluations for a group
   */
  async getByGroupId(groupId: string) {
    const evaluations = await this.prisma.reviewEvaluation.findMany({
      where: { groupId },
      include: {
        studentGrades: {
          include: {
            student: {
              select: { id: true, name: true, email: true, rollNumber: true },
            },
          },
        },
        mentor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { filledAt: 'desc' },
    });

    return evaluations;
  }

  /**
   * Get all evaluations for admin dashboard
   */
  async getAllEvaluations(filters?: { reviewType?: ReviewType; department?: string }) {
    const where: any = {};
    
    if (filters?.reviewType) {
      where.reviewType = filters.reviewType;
    }

    const evaluations = await this.prisma.reviewEvaluation.findMany({
      where,
      include: {
        studentGrades: {
          include: {
            student: {
              select: { id: true, name: true, email: true, rollNumber: true },
            },
          },
        },
        mentor: {
          select: { id: true, name: true, email: true },
        },
        group: {
          select: { 
            id: true, 
            groupId: true, 
            teamCode: true,
            department: true,
            members: {
              include: {
                profile: {
                  select: { id: true, name: true, rollNumber: true, semester: true },
                },
              },
            },
          },
        },
      },
      orderBy: { filledAt: 'desc' },
    });

    // Filter by department if specified
    if (filters?.department) {
      return evaluations.filter(e => e.group.department === filters.department);
    }

    return evaluations;
  }

  /**
   * Get pre-fill data for evaluation form
   */
  async getPreFillData(sessionId: string) {
    const session = await this.prisma.reviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: session.groupId },
      include: {
        members: {
          include: {
            profile: {
              select: { 
                id: true, 
                name: true, 
                email: true, 
                rollNumber: true,
                semester: true,
              },
            },
          },
        },
        topics: {
          where: { status: 'approved' },
        },
        allocations: {
          where: { status: 'accepted' },
          include: {
            mentor: {
              select: { id: true, name: true, email: true, domains: true },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const mentor = group.allocations[0]?.mentor;
    const approvedTopic = group.topics[0];

    return {
      sessionId,
      groupId: group.id,
      groupDisplayId: group.groupId,
      teamCode: group.teamCode,
      reviewType: session.reviewType,
      projectGuide: mentor?.name || '',
      projectTitle: approvedTopic?.title || '',
      completionPercentage: session.progressPercentage,
      members: group.members.map((m) => ({
        profileId: m.profile.id,
        name: m.profile.name,
        email: m.profile.email,
        rollNumber: m.profile.rollNumber || '',
        semester: m.profile.semester,
      })),
    };
  }
}
