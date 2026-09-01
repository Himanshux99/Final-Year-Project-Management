import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';

@Injectable()
export class DomainsService {
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
      throw new ForbiddenException('Only super admins can manage domains');
    }
    return profile;
  }

  // Active domains, visible to students (topic submission) and faculty (topic review).
  async findActive() {
    return this.prisma.domain.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // Full list including inactive domains, for the super admin management screen.
  async findAll(userId: string) {
    await this.verifyAdmin(userId);

    return this.prisma.domain.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { topics: true } },
      },
    });
  }

  async create(userId: string, dto: CreateDomainDto) {
    await this.verifyAdmin(userId);

    const existing = await this.prisma.domain.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new BadRequestException('A domain with this name already exists');
    }

    return this.prisma.domain.create({
      data: { name: dto.name.trim() },
    });
  }

  async update(userId: string, id: string, dto: UpdateDomainDto) {
    await this.verifyAdmin(userId);

    const domain = await this.prisma.domain.findUnique({ where: { id } });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (dto.name && dto.name.trim() !== domain.name) {
      const existing = await this.prisma.domain.findUnique({
        where: { name: dto.name.trim() },
      });
      if (existing) {
        throw new BadRequestException('A domain with this name already exists');
      }
    }

    return this.prisma.domain.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.verifyAdmin(userId);

    const domain = await this.prisma.domain.findUnique({
      where: { id },
      include: { _count: { select: { topics: true } } },
    });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (domain._count.topics > 0) {
      throw new BadRequestException(
        'This domain is used by existing topics and cannot be deleted. Deactivate it instead.',
      );
    }

    await this.prisma.domain.delete({ where: { id } });
    return { message: 'Domain deleted successfully' };
  }
}
