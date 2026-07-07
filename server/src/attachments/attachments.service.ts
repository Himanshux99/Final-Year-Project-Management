import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { GroupsService } from '../groups/groups.service';
import { SupabaseService } from '../supabase/supabase.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES_PER_GROUP = 5; // Maximum 5 files per group

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/zip',
  'application/x-rar-compressed',
  'text/plain',
];

@Injectable()
export class AttachmentsService {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService,
    private groupsService: GroupsService,
    private supabaseService: SupabaseService,
  ) {}

  private async verifyGroupLeader(userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    if (profile.role !== 'student') {
      throw new ForbiddenException('Only students can manage attachments');
    }

    const group = await this.groupsService.findByMemberId(profile.id);
    if (!group) {
      throw new NotFoundException('You are not in a group');
    }

    if (group.createdBy !== profile.id) {
      throw new ForbiddenException('Only the group leader can upload attachments');
    }

    return { profile, group };
  }

  private async verifyGroupMemberOrMentor(userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    // Check if user is a student member
    if (profile.role === 'student') {
      const group = await this.groupsService.findByMemberId(profile.id);
      if (group) {
        return { profile, group, isLeader: group.createdBy === profile.id };
      }
    }

    // Check if user is a mentor for any group
    if (profile.role === 'faculty' || profile.role === 'super_admin') {
      // Mentors can view all their assigned groups' attachments
      return { profile, group: null as any, isLeader: false, isMentor: true };
    }

    throw new NotFoundException('You are not associated with any group');
  }

  async uploadAttachment(
    userId: string,
    file: Express.Multer.File,
  ) {
    const { profile, group } = await this.verifyGroupLeader(userId);

    // Check current attachment count
    const currentCount = await this.prisma.attachment.count({
      where: { groupId: group.id },
    });

    if (currentCount >= MAX_FILES_PER_GROUP) {
      throw new BadRequestException(
        `Maximum ${MAX_FILES_PER_GROUP} files allowed per group. Please delete an existing file before uploading a new one.`,
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: PDF, Word, PowerPoint, Excel, images, ZIP, RAR, TXT`,
      );
    }

    // Generate storage path (no stage now, just group/timestamp)
    const fileExtension = file.originalname.split('.').pop() || '';
    const storagePath = `${group.id}/files/${Date.now()}.${fileExtension}`;

    // Upload to Supabase
    const fileUrl = await this.supabaseService.uploadFile(
      storagePath,
      file.buffer,
      file.mimetype,
    );

    // Create new attachment record
    return this.prisma.attachment.create({
      data: {
        groupId: group.id,
        filename: file.originalname,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: profile.id,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getAttachmentsByGroup(groupId: string) {
    return this.prisma.attachment.findMany({
      where: { groupId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getMyGroupAttachments(userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      return [];
    }

    // For students, get their group's attachments
    if (profile.role === 'student') {
      const group = await this.groupsService.findByMemberId(profile.id);
      if (!group) {
        return [];
      }
      return this.getAttachmentsByGroup(group.id);
    }

    // For faculty, they should use getAttachmentsByGroup with specific groupId
    return [];
  }

  async deleteAttachment(userId: string, attachmentId: string) {
    const { group } = await this.verifyGroupLeader(userId);

    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.groupId !== group.id) {
      throw new ForbiddenException('Cannot delete attachments from other groups');
    }

    // Delete from Supabase - extract storage path from URL
    try {
      const urlParts = attachment.fileUrl.split('/');
      // Get the last segments that make up the storage path
      const storagePath = urlParts.slice(-3).join('/');
      await this.supabaseService.deleteFile(storagePath);
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
    }

    // Delete from database
    await this.prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return { message: 'Attachment deleted successfully' };
  }

  async getAttachmentCount(groupId: string): Promise<number> {
    return this.prisma.attachment.count({
      where: { groupId },
    });
  }
}
