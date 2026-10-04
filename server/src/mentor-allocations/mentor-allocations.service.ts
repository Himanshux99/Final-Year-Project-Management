import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class MentorAllocationsService {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService,
    private groupsService: GroupsService,
  ) { }

  async getAllocationsForMentor(userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }
    if (profile.role !== 'faculty' && profile.role !== 'super_admin') {
      throw new ForbiddenException('Only faculty can view allocations');
    }

    const allocations = await this.prisma.mentorAllocation.findMany({
      where: {
        mentorId: profile.id,
        // status: { not: 'waiting' },
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                profile: true,
              },
            },
            creator: true,
          },
        },
        form: true,
      },
      orderBy: [
        { status: 'asc' }, // pending first
        { preferenceRank: 'asc' },
      ],
    });

    return allocations;
  }

  async getAllocationsForGroup(userId: string) {
    const group = await this.groupsService.getMyGroup(userId);
    if (!group) {
      return [];
    }

    return this.prisma.mentorAllocation.findMany({
      where: { groupId: group.id },
      include: {
        mentor: true,
        form: true,
      },
      orderBy: { preferenceRank: 'asc' },
    });
  }

  // A mentor may act on their own requests. A super admin may act on any mentor's
  // request for a group in their own department (on the mentor's behalf).
  private async assertCanActOnAllocation(
    profile: { id: string; role: string; department: string },
    allocation: { mentorId: string; groupId: string },
    verb: 'accept' | 'reject',
  ) {
    if (profile.role === 'super_admin') {
      const group = await this.prisma.group.findUnique({
        where: { id: allocation.groupId },
        select: { department: true },
      });
      if (!group || group.department !== profile.department) {
        throw new ForbiddenException('Group belongs to another department');
      }
      return;
    }
    if (allocation.mentorId !== profile.id) {
      throw new ForbiddenException(`Can only ${verb} your own allocations`);
    }
  }

  async acceptAllocation(userId: string, allocationId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    if (profile.role !== 'faculty' && profile.role !== 'super_admin') {
      throw new ForbiddenException('Only faculty can accept allocations');
    }

    const allocation = await this.prisma.mentorAllocation.findUnique({
      where: { id: allocationId },
    });

    if (!allocation) {
      throw new NotFoundException('Allocation not found');
    }

    await this.assertCanActOnAllocation(profile, allocation, 'accept');

    if (allocation.status !== 'pending') {
      const statusMessage =
        allocation.status === 'accepted'
          ? 'Cannot accept: allocation already accepted'
          : allocation.status === 'rejected'
            ? 'Cannot accept: allocation was already rejected'
            : allocation.status === 'waiting'
              ? 'Allocation is waiting and not yet pending for your decision'
              : `Allocation cannot be accepted in current status: ${allocation.status}`;
      throw new BadRequestException(statusMessage);
    }

    // Update in a transaction - accept this one, reject all others for the same group
    await this.prisma.$transaction(async (tx) => {
      // Count already accepted teams for this mentor
      const acceptedCount = await tx.mentorAllocation.count({
        where: {
          mentorId: allocation.mentorId,
          status: 'accepted',
        },
      });

      if (acceptedCount >= 3) {
        throw new BadRequestException(
          'Maximum limit of 3 teams has already been reached.',
        );
      }

      const groupAlreadyAccepted = await tx.mentorAllocation.count({
        where: { groupId: allocation.groupId, status: 'accepted' },
      });
      if (groupAlreadyAccepted > 0) {
        throw new BadRequestException(
          'This team has already been accepted by a mentor.',
        );
      }

      // Accept this allocation
      await tx.mentorAllocation.update({
        where: { id: allocationId },
        data: { status: 'accepted' },
      });

      // // Reject all other mentor choices for this group
      // await tx.mentorAllocation.updateMany({
      //   where: {
      //     groupId: allocation.groupId,
      //     formId: allocation.formId,
      //     id: { not: allocationId },
      //   },
      //   data: { status: 'rejected' },
      // });

      // If this was the THIRD accepted team, reject all remaining requests
      if (acceptedCount + 1 === 3) {
        await tx.mentorAllocation.updateMany({
          where: {
            mentorId: allocation.mentorId,
            status: {
              in: ['pending', 'waiting'],
            },
          },
          data: {
            status: 'rejected',
          },
        });
      }
    });

    return { message: 'Team accepted successfully' };
  }

  async rejectAllocation(userId: string, allocationId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    if (profile.role !== 'faculty' && profile.role !== 'super_admin') {
      throw new ForbiddenException('Only faculty can reject allocations');
    }

    const allocation = await this.prisma.mentorAllocation.findUnique({
      where: { id: allocationId },
    });

    if (!allocation) {
      throw new NotFoundException('Allocation not found');
    }

    await this.assertCanActOnAllocation(profile, allocation, 'reject');

    if (allocation.status !== 'pending') {
      const statusMessage =
        allocation.status === 'accepted'
          ? 'Cannot reject: allocation already accepted'
          : allocation.status === 'rejected'
            ? 'Allocation was already rejected'
            : allocation.status === 'waiting'
              ? 'Allocation is waiting and not yet pending for your decision'
              : `Allocation cannot be rejected in current status: ${allocation.status}`;
      throw new BadRequestException(statusMessage);
    }

    // Reject and escalate to next priority in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.mentorAllocation.update({
        where: { id: allocationId },
        data: { status: 'rejected' },
      });

      // Find the next waiting allocation for the same group and escalate
      const nextWaiting = await tx.mentorAllocation.findFirst({
        where: {
          groupId: allocation.groupId,
          formId: allocation.formId,
          status: 'waiting',
          preferenceRank: {
            gt: allocation.preferenceRank,
          },
        },
        orderBy: {
          preferenceRank: 'asc',
        },
      });

      if (nextWaiting) {
        await tx.mentorAllocation.update({
          where: { id: nextWaiting.id },
          data: { status: 'pending' },
        });
      }
    });

    return { message: 'Team rejected' };
  }

  async getAcceptedMentor(userId: string) {
    const group = await this.groupsService.getMyGroup(userId);
    if (!group) {
      return null;
    }

    const acceptedAllocation = await this.prisma.mentorAllocation.findFirst({
      where: {
        groupId: group.id,
        status: 'accepted',
      },
      include: {
        mentor: true,
      },
    });

    if (!acceptedAllocation) {
      return null;
    }

    return {
      mentor: acceptedAllocation.mentor,
      status: 'accepted',
    };
  }

  async getMentorStatus(userId: string) {
    const group = await this.groupsService.getMyGroup(userId);
    if (!group) {
      return { status: 'no_group' };
    }

    const allocations = await this.prisma.mentorAllocation.findMany({
      where: { groupId: group.id },
      include: { mentor: true },
      orderBy: { preferenceRank: 'asc' },
    });

    if (allocations.length === 0) {
      return { status: 'not_submitted' };
    }

    const acceptedAllocation = allocations.find((a) => a.status === 'accepted');
    if (acceptedAllocation) {
      return {
        status: 'accepted',
        mentorName: acceptedAllocation.mentor.name,
        mentorId: acceptedAllocation.mentorId,
      };
    }

    const pendingAllocations = allocations.filter(
      (a) => a.status === 'pending',
    );
    if (pendingAllocations.length > 0) {
      return {
        status: 'pending',
        currentPriority: pendingAllocations[0].preferenceRank,
      };
    }

    // Check if there are still waiting allocations (shouldn't happen normally)
    const waitingAllocations = allocations.filter(
      (a) => a.status === 'waiting',
    );
    if (waitingAllocations.length > 0) {
      return {
        status: 'pending',
        currentPriority: waitingAllocations[0].preferenceRank,
      };
    }

    return { status: 'all_rejected' };
  }

  async getAcceptedTeams(userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    if (profile.role !== 'faculty' && profile.role !== 'super_admin') {
      throw new ForbiddenException('Only faculty can view accepted teams');
    }

    return this.prisma.mentorAllocation.findMany({
      where: {
        mentorId: profile.id,
        status: 'accepted',
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                profile: true,
              },
            },
            creator: true,
          },
        },
      },
    });
  }

  private async requireStaff(userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }
    if (profile.role !== 'faculty' && profile.role !== 'super_admin') {
      throw new ForbiddenException('Only faculty can perform this action');
    }
    return profile;
  }

  async removeTeam(userId: string, groupId: string) {
    const profile = await this.requireStaff(userId);

    return this.prisma.$transaction(async (tx) => {
      const allocation = await tx.mentorAllocation.findFirst({
        where: {
          groupId,
          status: "accepted",
        },
      });

      if (!allocation) {
        throw new NotFoundException("Accepted team assignment not found");
      }

      if (profile.role !== 'super_admin' && allocation.mentorId !== profile.id) {
        throw new ForbiddenException('Can only remove your own teams');
      }

      // Mark current allocation as rejected instead of deleting it
      await tx.mentorAllocation.update({
        where: {
          id: allocation.id,
        },
        data: {
          status: "rejected",
        },
      });

      // // Remove the team's progress
      // await tx.teamProgress.deleteMany({
      //   where: {
      //     groupId,
      //   },
      // });

      // Escalate to the next lower-ranked preference (never re-pend the removed mentor)
      const nextPreference = await tx.mentorAllocation.findFirst({
        where: {
          groupId,
          formId: allocation.formId,
          status: "waiting",
          preferenceRank: { gt: allocation.preferenceRank },
        },
        orderBy: {
          preferenceRank: "asc",
        },
      });

      // Make it pending
      if (nextPreference) {
        await tx.mentorAllocation.update({
          where: {
            id: nextPreference.id,
          },
          data: {
            status: "pending",
          },
        });
      }

      return { message: "Team removed successfully" };
    });
  }

  async getMentorAllocationStats(userId: string) {
    await this.requireStaff(userId);
    const [mentors, preferences, allocations] = await Promise.all([
      this.prisma.profile.findMany({
        where: { role: "faculty" },
        select: {
          id: true,
          name: true,
          email: true,
          domains: true,
        },
      }),

      this.prisma.mentorPreference.findMany({
        select: {
          groupId: true,
          mentorChoice1: true,
          mentorChoice2: true,
          mentorChoice3: true,
        },
      }),

      this.prisma.mentorAllocation.findMany({
        select: {
          mentorId: true,
          groupId: true,
          status: true,
        },
      }),
    ]);

    // Groups that have already been rejected
    const rejectedGroupIds = new Set<string>();

    // mentorId -> accepted groupIds
    const acceptedMap = new Map<string, string[]>();

    for (const allocation of allocations) {
      if (allocation.status === "rejected") {
        rejectedGroupIds.add(allocation.groupId);
      }

      if (allocation.status === "accepted") {
        if (!acceptedMap.has(allocation.mentorId)) {
          acceptedMap.set(allocation.mentorId, []);
        }
        acceptedMap.get(allocation.mentorId)!.push(allocation.groupId);
      }
    }

    // mentorId -> first preference groupIds
    const firstPreferenceMap = new Map<string, string[]>();

    // mentorId -> all preference groupIds
    const totalPreferenceMap = new Map<string, string[]>();

    for (const preference of preferences) {
      // Skip rejected groups
      if (rejectedGroupIds.has(preference.groupId)) continue;

      // First preference
      if (preference.mentorChoice1) {
        if (!firstPreferenceMap.has(preference.mentorChoice1)) {
          firstPreferenceMap.set(preference.mentorChoice1, []);
        }
        firstPreferenceMap
          .get(preference.mentorChoice1)!
          .push(preference.groupId);
      }

      // All preferences
      const choices = [
        preference.mentorChoice1,
        preference.mentorChoice2,
        preference.mentorChoice3,
      ].filter(Boolean) as string[];

      for (const mentorId of choices) {
        if (!totalPreferenceMap.has(mentorId)) {
          totalPreferenceMap.set(mentorId, []);
        }
        totalPreferenceMap.get(mentorId)!.push(preference.groupId);
      }
    }

    return mentors.map((mentor) => {
      const firstPreferenceTeams =
        firstPreferenceMap.get(mentor.id) ?? [];

      const totalPreferenceTeams =
        totalPreferenceMap.get(mentor.id) ?? [];

      const totalRejectedCount = allocations.filter(
        (allocation) =>
          allocation.mentorId === mentor.id &&
          allocation.status === "rejected"
      ).length;
      const acceptedTeams =
        acceptedMap.get(mentor.id) ?? [];

      return {
        ...mentor,
        firstPreferenceCount: firstPreferenceTeams.length,
        totalPreferenceCount: totalPreferenceTeams.length,
        totalRejectedCount: totalRejectedCount,
        acceptedCount: acceptedTeams.length,
        firstPreferenceTeams,
        totalPreferenceTeams,
        acceptedTeams,
      };
    });
  }
}
