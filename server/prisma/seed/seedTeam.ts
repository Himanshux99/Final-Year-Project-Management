import { PrismaClient, Department } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function teamCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

const deptPrefix: Record<Department, string> = {
  IT: "IT",
  CS: "CS",
  ECS: "ECS",
  ETC: "ETC",
  BM: "BM",
};

async function main() {
  const departments: Department[] = [
    Department.IT,
    Department.CS,
    Department.ECS,
    Department.ETC,
    Department.BM,
  ];

  for (const department of departments) {
    const students = await prisma.profile.findMany({
      where: {
        role: "student",
        department,
      },
      orderBy: {
        rollNumber: "asc",
      },
    });

    if (students.length !== 8) {
      console.log(
        `${department}: Expected 8 students but found ${students.length}`
      );
      continue;
    }

    for (let groupIndex = 0; groupIndex < 2; groupIndex++) {
      const members = students.slice(groupIndex * 4, groupIndex * 4 + 4);

      const group = await prisma.group.create({
        data: {
          groupId: `${deptPrefix[department]}${String(groupIndex + 1).padStart(
            2,
            "0"
          )}`,
          teamCode: teamCode(),
          department,
          createdBy: members[0].id, // leader
          isFull: true,
        },
      });

      await prisma.groupMember.createMany({
        data: members.map((m) => ({
          groupId: group.id,
          profileId: m.id,
        })),
      });

      console.log(
        `${group.groupId} -> ${members
          .map((m) => m.rollNumber)
          .join(", ")}`
      );
    }
  }

  console.log("All groups created.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });