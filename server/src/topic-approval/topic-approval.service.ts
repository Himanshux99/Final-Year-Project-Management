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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB for documents

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
];

@Injectable()
export class TopicApprovalService {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService,
    private groupsService: GroupsService,
    private supabaseService: SupabaseService,
  ) {}

  /**
   * Verify user is group leader
   */
  private async verifyGroupLeader(userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    if (profile.role !== 'student') {
      throw new ForbiddenException('Only students can upload topic approval forms');
    }

    const group = await this.groupsService.findByMemberId(profile.id);
    if (!group) {
      throw new NotFoundException('You are not a member of any group');
    }

    if (group.createdBy !== profile.id) {
      throw new ForbiddenException('Only the group leader can upload the topic approval form');
    }

    return { profile, group };
  }

  /**
   * Upload the signed topic approval form
   */
  async uploadDocument(userId: string, file: Express.Multer.File) {
    const { profile, group } = await this.verifyGroupLeader(userId);

    // Check if document already exists
    const existing = await this.prisma.topicApprovalDocument.findUnique({
      where: { groupId: group.id },
    });

    if (existing) {
      // Delete old file from storage
      const oldPath = this.extractPathFromUrl(existing.fileUrl);
      if (oldPath) {
        await this.supabaseService.deleteFile(oldPath).catch(() => {});
      }
      // Delete old record
      await this.prisma.topicApprovalDocument.delete({
        where: { id: existing.id },
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)} MB limit`);
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: PDF, Word, PNG, JPEG');
    }

    // Upload to Supabase
    const filePath = `${group.id}/topic-approval/${Date.now()}-${file.originalname}`;
    const fileUrl = await this.supabaseService.uploadFile(
      filePath,
      file.buffer,
      file.mimetype,
    );

    // Create record
    const document = await this.prisma.topicApprovalDocument.create({
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
          select: { id: true, name: true, email: true },
        },
      },
    });

    return document;
  }

  /**
   * Get topic approval document for a group
   */
  async getDocument(groupId: string) {
    const document = await this.prisma.topicApprovalDocument.findUnique({
      where: { groupId },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return document;
  }

  /**
   * Get document for current user's group
   */
  async getMyDocument(userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    const group = await this.groupsService.findByMemberId(profile.id);
    if (!group) {
      return null;
    }

    return this.getDocument(group.id);
  }

  /**
   * Delete topic approval document (leader only)
   */
  async deleteDocument(userId: string) {
    const { group } = await this.verifyGroupLeader(userId);

    const document = await this.prisma.topicApprovalDocument.findUnique({
      where: { groupId: group.id },
    });

    if (!document) {
      throw new NotFoundException('No topic approval document found');
    }

    // Delete from storage
    const filePath = this.extractPathFromUrl(document.fileUrl);
    if (filePath) {
      await this.supabaseService.deleteFile(filePath).catch(() => {});
    }

    // Delete record
    await this.prisma.topicApprovalDocument.delete({
      where: { id: document.id },
    });

    return { success: true };
  }

  /**
   * Check if topic approval document exists for a group
   */
  async hasDocument(groupId: string): Promise<boolean> {
    const document = await this.prisma.topicApprovalDocument.findUnique({
      where: { groupId },
    });
    return !!document;
  }

  /**
   * Extract storage path from full URL
   */
  private extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/object\/public\/[^\/]+\/(.+)/);
      return pathMatch ? pathMatch[1] : null;
    } catch {
      return null;
    }
  }
}
