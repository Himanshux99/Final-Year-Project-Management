import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { Department } from '@prisma/client';

const MAX_GROUP_SIZE = 3;

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
    // Retry on the (rare) team code collision
    let teamCode = this.generateTeamCode();
    while (await this.prisma.group.findUnique({ where: { teamCode } })) {
      teamCode = this.generateTeamCode();
    }

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

  async joinByTeamCode(userId: string, rawTeamCode: string) {
    const teamCode = rawTeamCode.trim().toUpperCase();
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
    if (group.members.length >= MAX_GROUP_SIZE) {
      throw new BadRequestException(
        `Group is full (max ${MAX_GROUP_SIZE} members)`,
      );
    }

    // Re-check capacity inside a transaction so concurrent joins can't overfill
    await this.prisma.$transaction(async (tx) => {
      const count = await tx.groupMember.count({ where: { groupId: group.id } });
      if (count >= MAX_GROUP_SIZE) {
        throw new BadRequestException(
          `Group is full (max ${MAX_GROUP_SIZE} members)`,
        );
      }
      await tx.groupMember.create({
        data: { groupId: group.id, profileId: profile.id },
      });
      if (count + 1 >= MAX_GROUP_SIZE) {
        await tx.group.update({
          where: { id: group.id },
          data: { isFull: true },
        });
      }
    });

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
        // The mentor who accepted this group (at most one)
        allocations: {
          where: { status: 'accepted' },
          include: { mentor: { select: { id: true, name: true, email: true } } },
          take: 1,
        },
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

  /**
   * Throws unless the profile may act on the given group:
   * students must be members, faculty must be the group's accepted mentor,
   * super admins may access any group in their department.
   */
  async assertGroupAccess(
    profile: { id: string; role: string; department: Department },
    groupId: string,
  ) {
    if (profile.role === 'student') {
      const membership = await this.prisma.groupMember.findFirst({
        where: { groupId, profileId: profile.id },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenException('You are not a member of this group');
      }
      return;
    }

    if (profile.role === 'super_admin') {
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        select: { department: true },
      });
      if (!group) throw new NotFoundException('Group not found');
      if (group.department !== profile.department) {
        throw new ForbiddenException('Group belongs to another department');
      }
      return;
    }

    const allocation = await this.prisma.mentorAllocation.findFirst({
      where: { groupId, mentorId: profile.id, status: 'accepted' },
      select: { id: true },
    });
    if (!allocation) {
      throw new ForbiddenException('You are not the mentor of this group');
    }
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
      select: {
        id: true,
        groupId: true,
        teamCode: true,
        department: true,
        createdBy: true,
        isFull: true,
        meetLink: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: { name: true },
        },
        _count: {
          select: { preferences: true },
        },
        allocations: {
          where: { status: 'accepted' },
          select: {
            status: true,
            mentor: {
              select: { name: true },
            },
          },
        },
      },
    });

    return groups.map((group) => {
      const { _count, allocations, ...rest } = group;
      return {
        ...rest,
        hasSubmittedPreferences: _count.preferences > 0,
        mentorAssigned: allocations[0] ? allocations[0].mentor.name : null,
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
