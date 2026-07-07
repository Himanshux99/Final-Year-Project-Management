import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { GroupsService } from '../groups/groups.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { ReviewTopicDto } from './dto/review-topic.dto';
import { AddTopicMessageDto } from './dto/add-message.dto';

@Injectable()
export class ProjectTopicsService {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService,
    private groupsService: GroupsService,
  ) {}

  async createTopic(userId: string, createTopicDto: CreateTopicDto) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    if (profile.role !== 'student') {
      throw new ForbiddenException('Only students can submit topics');
    }

    const group = await this.groupsService.getMyGroup(userId);
    if (!group) {
      throw new BadRequestException('You must be in a group to submit a topic');
    }

    // Check if group already has an approved topic
    const existingTopic = await this.prisma.projectTopic.findFirst({
      where: {
        groupId: group.id,
        status: 'approved',
      },
    });

    if (existingTopic) {
      throw new BadRequestException('Your group already has an approved topic');
    }

    return this.prisma.projectTopic.create({
      data: {
        groupId: group.id,
        title: createTopicDto.title,
        description: createTopicDto.description,
        submittedBy: profile.id,
      },
    });
  }

  async getTopicsByGroup(userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    const group = await this.groupsService.getMyGroup(userId);
    if (!group) {
      throw new BadRequestException('You must be in a group');
    }

    return this.prisma.projectTopic.findMany({
      where: { groupId: group.id },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getTopicsByGroupId(userId: string, groupId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    // Faculty and super_admin can view any group's topics
    if (profile.role !== 'faculty' && profile.role !== 'super_admin') {
      // Students can only view their own group
      const group = await this.groupsService.getMyGroup(userId);
      if (!group || group.id !== groupId) {
        throw new ForbiddenException('You can only view your own group topics');
      }
    }

    return this.prisma.projectTopic.findMany({
      where: { groupId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async approveTopic(userId: string, topicId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile || (profile.role !== 'faculty' && profile.role !== 'super_admin')) {
      throw new ForbiddenException('Only faculty can approve topics');
    }

    const topic = await this.prisma.projectTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (topic.status === 'approved') {
      throw new BadRequestException('Topic is already approved');
    }

    return this.prisma.projectTopic.update({
      where: { id: topicId },
      data: {
        status: 'approved',
        reviewedBy: profile.id,
        reviewedAt: new Date(),
      },
    });
  }

  async rejectTopic(userId: string, topicId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile || (profile.role !== 'faculty' && profile.role !== 'super_admin')) {
      throw new ForbiddenException('Only faculty can reject topics');
    }

    const topic = await this.prisma.projectTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    return this.prisma.projectTopic.update({
      where: { id: topicId },
      data: {
        status: 'rejected',
        reviewedBy: profile.id,
        reviewedAt: new Date(),
      },
    });
  }

  async requestRevision(userId: string, topicId: string, reviewTopicDto: ReviewTopicDto) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile || (profile.role !== 'faculty' && profile.role !== 'super_admin')) {
      throw new ForbiddenException('Only faculty can request revisions');
    }

    const topic = await this.prisma.projectTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    const updatedTopic = await this.prisma.projectTopic.update({
      where: { id: topicId },
      data: {
        status: 'revision_requested',
        reviewedBy: profile.id,
        reviewedAt: new Date(),
      },
    });

    // Add feedback as a message if provided
    if (reviewTopicDto.feedback) {
      await this.addMessage(userId, {
        topicId,
        content: reviewTopicDto.feedback,
      });
    }

    return updatedTopic;
  }

  async addMessage(userId: string, addMessageDto: AddTopicMessageDto) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    // Handle "general" as null for general group discussion (no specific topic)
    const topicId = addMessageDto.topicId === 'general' ? null : addMessageDto.topicId;

    let groupId: string;

    // If a specific topic is provided, get group from topic
    if (topicId) {
      const topic = await this.prisma.projectTopic.findUnique({
        where: { id: topicId },
      });
      if (!topic) {
        throw new BadRequestException('Topic not found');
      }
      groupId = topic.groupId;

      // Verify access: students must be in the group, faculty/admin can access any group
      if (profile.role === 'student') {
        const group = await this.groupsService.getMyGroup(userId);
        if (!group || group.id !== groupId) {
          throw new ForbiddenException('You can only message in your group topics');
        }
      }
    } else {
      // For general discussion without specific topic
      if (profile.role === 'student') {
        const group = await this.groupsService.getMyGroup(userId);
        if (!group) {
          throw new BadRequestException('You must be in a group to send messages');
        }
        groupId = group.id;
      } else {
        // Faculty/admin: use groupId from DTO
        if (!addMessageDto.groupId) {
          throw new BadRequestException('Group ID is required for general messages');
        }
        groupId = addMessageDto.groupId;
      }
    }

    return this.prisma.topicMessage.create({
      data: {
        topicId: topicId,
        groupId: groupId,
        authorId: profile.id,
        authorName: profile.name,
        authorRole: profile.role === 'student' ? 'student' : 'faculty',
        content: addMessageDto.content,
        links: addMessageDto.links || [],
      },
    });
  }

  async getMessagesByTopic(topicId: string) {
    // Handle "general" as null for general group discussion
    const dbTopicId = topicId === 'general' ? null : topicId;
    
    return this.prisma.topicMessage.findMany({
      where: { topicId: dbTopicId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMessagesByGroup(userId: string) {
    const group = await this.groupsService.getMyGroup(userId);
    if (!group) {
      throw new BadRequestException('You must be in a group');
    }

    return this.prisma.topicMessage.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMessagesByGroupId(userId: string, groupId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    // Faculty and super_admin can view any group's messages
    if (profile.role !== 'faculty' && profile.role !== 'super_admin') {
      // Students can only view their own group
      const group = await this.groupsService.getMyGroup(userId);
      if (!group || group.id !== groupId) {
        throw new ForbiddenException('You can only view your own group messages');
      }
    }

    return this.prisma.topicMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
