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
  ) {}

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

    if (allocation.mentorId !== profile.id) {
      throw new ForbiddenException('Can only accept your own allocations');
    }

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
          mentorId: profile.id,
          status: 'accepted',
        },
      });

      if (acceptedCount >= 3) {
        throw new BadRequestException(
          'Maximum limit of 3 teams has already been reached.',
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
            mentorId: profile.id,
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

    if (allocation.mentorId !== profile.id) {
      throw new ForbiddenException('Can only reject your own allocations');
    }

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

  async removeTeam(groupId: string) {
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

      // Find the next highest preference
      const nextPreference = await tx.mentorAllocation.findFirst({
        where: {
          groupId,
          status: {
            in: ["waiting", "rejected"],
          },
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
}
