import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { GroupsService } from '../groups/groups.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { ReviewTopicDto } from './dto/review-topic.dto';
import { AddTopicMessageDto } from './dto/add-message.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Injectable()
export class ProjectTopicsService {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService,
    private groupsService: GroupsService,
    private supabaseService: SupabaseService,
  ) {}

  // Ensures at least one domain is selected and every id refers to an active domain.
  private async validateDomainIds(domainIds: string[] | undefined): Promise<string[]> {
    const unique = Array.from(new Set(domainIds ?? []));
    if (unique.length === 0) {
      throw new BadRequestException('Select at least one domain');
    }
    const found = await this.prisma.domain.count({
      where: { id: { in: unique }, isActive: true },
    });
    if (found !== unique.length) {
      throw new BadRequestException('One or more selected domains are invalid');
    }
    return unique;
  }

  async createTopic(userId: string, createTopicDto: CreateTopicDto, file?: Express.Multer.File) {
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

    const domainIds = await this.validateDomainIds(createTopicDto.domainIds);

    let storagePath: string | undefined;
    let fileUrl: string | undefined;
    if (file) {
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid document type. Allowed: PDF, DOC, DOCX');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestException('Document size exceeds the 10 MB limit');
      }

      const extension = file.originalname.split('.').pop() || 'file';
      storagePath = `${group.id}/topic-submissions/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      fileUrl = await this.supabaseService.uploadFile(storagePath, file.buffer, file.mimetype);
    }

    try {
      return await this.prisma.projectTopic.create({
      data: {
        groupId: group.id,
        title: createTopicDto.title,
        description: createTopicDto.description,
        domains: { connect: domainIds.map((id) => ({ id })) },
        submittedBy: profile.id,
        ...(file && fileUrl ? {
          document: {
            create: {
              filename: file.originalname,
              fileUrl,
              fileSize: file.size,
              mimeType: file.mimetype,
            },
          },
        } : {}),
      },
      include: { document: true, domains: true },
    });
    } catch (error) {
      if (storagePath) {
        await this.supabaseService.deleteFile(storagePath).catch((): void => {});
      }
      throw error;
    }
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
      include: { document: true, domains: true },
    });
  }

  async getTopicsByGroupId(userId: string, groupId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    await this.groupsService.assertGroupAccess(profile, groupId);

    return this.prisma.projectTopic.findMany({
      where: { groupId },
      orderBy: { submittedAt: 'desc' },
      include: { document: true, domains: true },
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
    await this.groupsService.assertGroupAccess(profile, topic.groupId);

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
    await this.groupsService.assertGroupAccess(profile, topic.groupId);

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
    await this.groupsService.assertGroupAccess(profile, topic.groupId);

    const updatedTopic = await this.prisma.projectTopic.update({
      where: { id: topicId },
      data: {
        status: 'revision_requested',
        reviewedBy: profile.id,
        reviewedAt: new Date(),
        lastEditedAt: null,
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

      await this.groupsService.assertGroupAccess(profile, groupId);
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
        await this.groupsService.assertGroupAccess(profile, groupId);
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

  async getMessagesByTopic(topicId: string, userId: string) {
    // Handle "general" as null for general group discussion
    const dbTopicId = topicId === 'general' ? null : topicId;

    if (!dbTopicId) {
      // "General" thread has no topic to scope by, so scope it to the caller's own group
      const group = await this.groupsService.getMyGroup(userId);
      if (!group) return [];
      return this.prisma.topicMessage.findMany({
        where: { topicId: null, groupId: group.id },
        orderBy: { createdAt: 'asc' },
      });
    }

    {
      const profile = await this.profilesService.findByUserId(userId);
      const topic = await this.prisma.projectTopic.findUnique({
        where: { id: dbTopicId },
        select: { groupId: true },
      });
      if (!profile || !topic) {
        throw new NotFoundException('Topic not found');
      }
      await this.groupsService.assertGroupAccess(profile, topic.groupId);
    }

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

    await this.groupsService.assertGroupAccess(profile, groupId);

    return this.prisma.topicMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateTopic(
  userId: string,
  topicId: string,
  updateTopicDto: UpdateTopicDto,
  file?: Express.Multer.File,
) {
    const profile = await this.profilesService.findByUserId(userId);

    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    const topic = await this.prisma.projectTopic.findUnique({
      where: { id: topicId },
      include: {
        group: true,
        document: true,
        domains: true,
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    // Check the user belongs to the topic's group
    const group = await this.groupsService.getMyGroup(userId);

    if (!group || group.id !== topic.groupId) {
      throw new ForbiddenException('You cannot edit this topic');
    }

    // Optional: prevent editing approved topics
    if (topic.status === 'approved') {
      throw new BadRequestException(
        'Approved topics cannot be edited',
      );
    }

    const domainIds = updateTopicDto.domainIds
      ? await this.validateDomainIds(updateTopicDto.domainIds)
      : undefined;

    let documentData = {};

    if (file) {
      const extension = file.originalname.split('.').pop() || 'file';

      const storagePath = `${group.id}/topic-submissions/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const fileUrl = await this.supabaseService.uploadFile(
        storagePath,
        file.buffer,
        file.mimetype,
      );

      if (topic.document) {
        documentData = {
          document: {
            update: {
              filename: file.originalname,
              fileUrl,
              fileSize: file.size,
              mimeType: file.mimetype,
            },
          },
        };
      } else {
        documentData = {
          document: {
            create: {
              filename: file.originalname,
              fileUrl,
              fileSize: file.size,
              mimeType: file.mimetype,
            },
          },
        };
      }
    }

    const changes: string[] = [];
    if (updateTopicDto.title && updateTopicDto.title !== topic.title) changes.push('title');
    if (updateTopicDto.description && updateTopicDto.description !== topic.description) {
      changes.push('description');
    }
    if (domainIds) {
      const before = topic.domains.map((d) => d.id).sort().join(',');
      if (before !== [...domainIds].sort().join(',')) changes.push('domains');
    }
    if (file) changes.push('document');

    const updated = await this.prisma.projectTopic.update({
      where: { id: topicId },
      data: {
        title: updateTopicDto.title,
        description: updateTopicDto.description,
        lastEditedAt: new Date(),
        ...(domainIds ? { domains: { set: domainIds.map((id) => ({ id })) } } : {}),
        ...documentData,
      },
      include: {
        document: true,
        domains: true,
      },
    });

    // Let faculty know in the topic thread what the students changed.
    // Same numbering the UI shows: position by submission time, oldest = #1.
    const topicNumber =
      (await this.prisma.projectTopic.count({
        where: { groupId: group.id, submittedAt: { lt: topic.submittedAt } },
      })) + 1;

    await this.prisma.topicMessage.create({
      data: {
        topicId,
        groupId: group.id,
        authorId: profile.id,
        authorName: profile.name,
        authorRole: 'student',
        content: `Topic #${topicNumber} updated${changes.length ? ` (${changes.join(', ')})` : ''}. Please review the latest version.`,
        links: [],
      },
    });

    return updated;
  }
}
