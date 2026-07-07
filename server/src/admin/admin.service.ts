import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { Department } from '@prisma/client';

export interface MentorWithGroups {
  id: string;
  name: string;
  email: string;
  department: Department;
  domains: string | null;
  assignedGroups: {
    id: string;
    groupId: string;
    teamCode: string;
    leaderName: string;
    memberCount: number;
    members: { id: string; name: string; email: string; rollNumber: string | null }[];
    topicStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'revision_requested';
    approvedTopicTitle: string | null;
    review1Status: string | null;
    review1Progress: number | null;
    review2Status: string | null;
    review2Progress: number | null;
    finalReviewStatus: string | null;
    finalReviewProgress: number | null;
  }[];
  totalGroups: number;
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService,
  ) {}

  private async verifyAdmin(userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }
    if (profile.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can access this resource');
    }
    return profile;
  }

  async getMentorOverview(userId: string): Promise<MentorWithGroups[]> {
    const admin = await this.verifyAdmin(userId);

    // Get all mentors (faculty and super_admin) in the department who have accepted groups
    const mentorsWithAllocations = await this.prisma.profile.findMany({
      where: {
        department: admin.department,
        role: { in: ['faculty', 'super_admin'] },
        mentorAllocations: {
          some: {
            status: 'accepted',
          },
        },
      },
      include: {
        mentorAllocations: {
          where: { status: 'accepted' },
          include: {
            group: {
              include: {
                members: {
                  include: {
                    profile: true,
                  },
                },
                creator: true,
                topics: {
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    // Get review sessions for all groups
    const groupIds = mentorsWithAllocations.flatMap((m) =>
      m.mentorAllocations.map((a) => a.groupId),
    );

    const reviewSessions = await this.prisma.reviewSession.findMany({
      where: {
        groupId: { in: groupIds },
      },
    });

    // Build the response
    const result: MentorWithGroups[] = mentorsWithAllocations.map((mentor) => {
      const assignedGroups = mentor.mentorAllocations.map((allocation) => {
        const group = allocation.group;
        const approvedTopic = group.topics.find((t) => t.status === 'approved');
        const latestTopic = group.topics[0];

        // Get review sessions for this group
        const r1 = reviewSessions.find(
          (r) => r.groupId === group.id && r.reviewType === 'review_1',
        );
        const r2 = reviewSessions.find(
          (r) => r.groupId === group.id && r.reviewType === 'review_2',
        );
        const fr = reviewSessions.find(
          (r) => r.groupId === group.id && r.reviewType === 'final_review',
        );

        let topicStatus: MentorWithGroups['assignedGroups'][0]['topicStatus'] =
          'not_submitted';
        if (approvedTopic) {
          topicStatus = 'approved';
        } else if (latestTopic) {
          topicStatus = latestTopic.status as any;
        }

        return {
          id: group.id,
          groupId: group.groupId,
          teamCode: group.teamCode,
          leaderName: group.creator.name,
          memberCount: group.members.length,
          members: group.members.map((m) => ({
            id: m.profile.id,
            name: m.profile.name,
            email: m.profile.email,
            rollNumber: m.profile.rollNumber,
            semester: m.profile.semester,
          })),
          topicStatus,
          approvedTopicTitle: approvedTopic?.title || null,
          review1Status: r1?.status || null,
          review1Progress: r1?.progressPercentage || null,
          review2Status: r2?.status || null,
          review2Progress: r2?.progressPercentage || null,
          finalReviewStatus: fr?.status || null,
          finalReviewProgress: fr?.progressPercentage || null,
        };
      });

      return {
        id: mentor.id,
        name: mentor.name,
        email: mentor.email,
        department: mentor.department,
        domains: mentor.domains,
        assignedGroups,
        totalGroups: assignedGroups.length,
      };
    });

    // Sort by total groups (descending)
    return result.sort((a, b) => b.totalGroups - a.totalGroups);
  }

  async getUnassignedGroups(userId: string) {
    const admin = await this.verifyAdmin(userId);

    // Groups that don't have an accepted allocation
    const groups = await this.prisma.group.findMany({
      where: {
        department: admin.department,
        allocations: {
          none: {
            status: 'accepted',
          },
        },
      },
      include: {
        members: {
          include: {
            profile: true,
          },
        },
        creator: true,
        allocations: {
          include: {
            mentor: true,
          },
        },
      },
    });

    return groups.map((group) => ({
      id: group.id,
      groupId: group.groupId,
      teamCode: group.teamCode,
      leaderName: group.creator.name,
      memberCount: group.members.length,
      members: group.members.map((m) => ({
        id: m.profile.id,
        name: m.profile.name,
        email: m.profile.email,
      })),
      hasSubmittedPreferences: group.allocations.length > 0,
      pendingAllocations: group.allocations
        .filter((a) => a.status === 'pending')
        .map((a) => ({
          mentorId: a.mentorId,
          mentorName: a.mentor.name,
          preferenceRank: a.preferenceRank,
        })),
    }));
  }

  async getAvailableMentors(userId: string) {
    const admin = await this.verifyAdmin(userId);

    // Get the active form and its available mentors
    const activeForm = await this.prisma.mentorAllocationForm.findFirst({
      where: {
        department: admin.department,
        isActive: true,
      },
      include: {
        availableMentors: {
          include: {
            mentor: true,
          },
        },
      },
    });

    if (!activeForm) {
      // If no form, return all faculty in the department
      const faculty = await this.prisma.profile.findMany({
        where: {
          department: admin.department,
          role: { in: ['faculty', 'super_admin'] },
        },
      });

      return faculty.map((f) => ({
        id: f.id,
        name: f.name,
        email: f.email,
        domains: f.domains,
        role: f.role,
      }));
    }

    return activeForm.availableMentors.map((am) => ({
      id: am.mentor.id,
      name: am.mentor.name,
      email: am.mentor.email,
      domains: am.mentor.domains,
      role: am.mentor.role,
    }));
  }

  async allocateMentor(
    userId: string,
    groupId: string,
    mentorId: string,
  ) {
    const admin = await this.verifyAdmin(userId);

    // Verify group exists and is in admin's department
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        allocations: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.department !== admin.department) {
      throw new ForbiddenException('Group is not in your department');
    }

    // Check if group already has an accepted mentor
    const existingAccepted = group.allocations.find(
      (a) => a.status === 'accepted',
    );
    if (existingAccepted) {
      throw new BadRequestException('Group already has an assigned mentor');
    }

    // Verify mentor exists and is faculty/admin in the department
    const mentor = await this.prisma.profile.findUnique({
      where: { id: mentorId },
    });

    if (!mentor) {
      throw new NotFoundException('Mentor not found');
    }

    if (mentor.role !== 'faculty' && mentor.role !== 'super_admin') {
      throw new BadRequestException('Selected user is not a mentor');
    }

    if (mentor.department !== admin.department) {
      throw new ForbiddenException('Mentor is not in your department');
    }

    // Get active form (if any)
    const activeForm = await this.prisma.mentorAllocationForm.findFirst({
      where: {
        department: admin.department,
        isActive: true,
      },
    });

    // Use a transaction to:
    // 1. Reject all existing pending/waiting allocations for this group
    // 2. Create a new accepted allocation
    await this.prisma.$transaction(async (tx) => {
      // Reject all existing pending allocations
      await tx.mentorAllocation.updateMany({
        where: {
          groupId: groupId,
          status: { in: ['pending', 'waiting'] },
        },
        data: { status: 'rejected' },
      });

      // Create new accepted allocation
      await tx.mentorAllocation.create({
        data: {
          groupId: groupId,
          mentorId: mentorId,
          formId: activeForm?.id || 'manual-allocation',
          status: 'accepted',
          preferenceRank: 0, // 0 indicates manual assignment
        },
      });
    });

    return { message: 'Mentor allocated successfully' };
  }
}
