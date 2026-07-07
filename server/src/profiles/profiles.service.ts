import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { Department, Role } from '@prisma/client';

// Access codes for super admin
const ACCESS_CODES: Record<Department, string> = {
  IT: 'ITADMIN2025',
  CS: 'CSADMIN2025',
  ECS: 'ECSADMIN2025',
  ETC: 'ETCADMIN2025',
  BM: 'BMADMIN2025',
};

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createProfileDto: CreateProfileDto) {
    const {
      name,
      email,
      role,
      department,
      rollNumber,
      semester,
      accessCode,
      domains,
    } = createProfileDto;

    // Validate access code for super admin
    if (role === 'super_admin') {
      if (!accessCode || ACCESS_CODES[department] !== accessCode) {
        throw new BadRequestException('Invalid coordinator access code');
      }
    }

    // Validate student fields
    if (role === 'student') {
      if (!rollNumber) {
        throw new BadRequestException('Roll number is required for students');
      }
      if (!semester) {
        throw new BadRequestException('Semester is required for students');
      }
    }

    // Check if profile already exists
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new BadRequestException('Profile already exists for this user');
    }

    return this.prisma.profile.create({
      data: {
        userId,
        name,
        email,
        role: role as Role,
        department: department as Department,
        rollNumber: role === 'student' ? rollNumber : null,
        semester: role === 'student' ? semester : null,
        domains:
          role === 'faculty' || role === 'super_admin' ? domains || null : null,
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.profile.findUnique({
      where: { userId },
    });
  }

  async findById(id: string) {
    return this.prisma.profile.findUnique({
      where: { id },
    });
  }

  async findByRole(role: Role) {
    return this.prisma.profile.findMany({
      where: { role },
    });
  }

  async findByDepartment(department: Department) {
    return this.prisma.profile.findMany({
      where: { department },
    });
  }

  async getFacultyByDepartment(department: Department) {
    return this.prisma.profile.findMany({
      where: {
        department,
        OR: [{ role: 'faculty' }, { role: 'super_admin' }],
      },
    });
  }

  async findManyByIds(ids: string[]) {
    return this.prisma.profile.findMany({
      where: {
        id: { in: ids },
      },
    });
  }
}
