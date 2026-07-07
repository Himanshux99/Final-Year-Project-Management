import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { Department } from '@prisma/client';

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService,
  ) {}

  // Generate random team code
  private generateTeamCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Get next group serial number for department
  private async getNextGroupSerial(department: Department): Promise<number> {
    const counter = await this.prisma.groupCounter.upsert({
      where: { department },
      update: { counter: { increment: 1 } },
      create: { department, counter: 1 },
    });
    return counter.counter;
  }

  async create(userId: string) {
    // Get user profile
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException(
        'Profile not found. Please complete onboarding first.',
      );
    }

    if (profile.role !== 'student') {
      throw new ForbiddenException('Only students can create groups');
    }

    // Check if already in a group
    const existingMembership = await this.prisma.groupMember.findFirst({
      where: { profileId: profile.id },
    });

    if (existingMembership) {
      throw new BadRequestException('You are already a member of a group');
    }

    // Generate group ID and team code
    const serial = await this.getNextGroupSerial(profile.department);
    const groupId = `${profile.department}${serial.toString().padStart(2, '0')}`;
    const teamCode = this.generateTeamCode();

    // Create group with the creator as the first member
    const group = await this.prisma.group.create({
      data: {
        groupId,
        teamCode,
        department: profile.department,
        createdBy: profile.id,
        members: {
          create: {
            profileId: profile.id,
          },
        },
      },
      include: {
        members: {
          include: {
            profile: true,
          },
        },
      },
    });

    return group;
  }

  async joinByTeamCode(userId: string, teamCode: string) {
    // Get user profile
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException(
        'Profile not found. Please complete onboarding first.',
      );
    }

    if (profile.role !== 'student') {
      throw new ForbiddenException('Only students can join groups');
    }

    // Check if already in a group
    const existingMembership = await this.prisma.groupMember.findFirst({
      where: { profileId: profile.id },
    });

    if (existingMembership) {
      throw new BadRequestException('You are already a member of a group');
    }

    // Find group by team code
    const group = await this.prisma.group.findUnique({
      where: { teamCode },
      include: {
        members: true,
        creator: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check department match
    if (group.department !== profile.department) {
      throw new BadRequestException(
        'Can only join groups from your department',
      );
    }

    // Check semester match - students can only join groups with same semester
    if (profile.semester !== null && group.creator?.semester !== null) {
      if (profile.semester !== group.creator.semester) {
        throw new BadRequestException(
          `You can only join groups with students from your semester (Semester ${profile.semester}). This group is for Semester ${group.creator.semester}.`,
        );
      }
    }

    // Check if group is full
    if (group.members.length >= 3) {
      throw new BadRequestException('Group is full (max 3 members)');
    }

    // Add member
    await this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        profileId: profile.id,
      },
    });

    // Update isFull flag if needed
    if (group.members.length + 1 >= 3) {
      await this.prisma.group.update({
        where: { id: group.id },
        data: { isFull: true },
      });
    }

    // Return updated group
    return this.findById(group.id);
  }

  async findById(id: string) {
    return this.prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            profile: true,
          },
        },
        creator: true,
      },
    });
  }

  async findByTeamCode(teamCode: string) {
    return this.prisma.group.findUnique({
      where: { teamCode },
      include: {
        members: {
          include: {
            profile: true,
          },
        },
        creator: true,
      },
    });
  }

    async findByMemberId(profileId: string) {
      const membership = await this.prisma.groupMember.findFirst({
        where: { profileId },
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
      return membership?.group || null;
    }

  async getMyGroup(userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      return null;
    }

    return this.findByMemberId(profile.id);
  }

  async findByDepartment(department: Department) {
    return this.prisma.group.findMany({
      where: { department },
      include: {
        members: {
          include: {
            profile: true,
          },
        },
        creator: true,
      },
    });
  }

  async getGroupsWithDetails(department: Department) {
    const groups = await this.prisma.group.findMany({
      where: { department },
      include: {
        members: {
          include: {
            profile: true,
          },
        },
        creator: true,
        preferences: true,
        allocations: {
          include: {
            mentor: true,
          },
        },
      },
    });

    return groups.map((group) => {
      const acceptedAllocation = group.allocations.find(
        (a) => a.status === 'accepted',
      );
      return {
        ...group,
        hasSubmittedPreferences: group.preferences.length > 0,
        mentorAssigned: acceptedAllocation
          ? acceptedAllocation.mentor.name
          : null,
      };
    });
  }

  async setMeetLink(userId: string, meetLink: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    if (profile.role !== 'student') {
      throw new ForbiddenException('Only students can set meet links');
    }

    const group = await this.findByMemberId(profile.id);
    if (!group) {
      throw new NotFoundException('You are not in a group');
    }

    if (group.createdBy !== profile.id) {
      throw new ForbiddenException(
        'Only the group leader can set the meet link',
      );
    }

    return this.prisma.group.update({
      where: { id: group.id },
      data: { meetLink },
      include: {
        members: {
          include: {
            profile: true,
          },
        },
        creator: true,
      },
    });
  }
}
