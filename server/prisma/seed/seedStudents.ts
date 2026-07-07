import { PrismaClient, Role, Department } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const PASSWORD = "Himanshu";

const departments = [
  { department: Department.IT, code: "101" },
  { department: Department.CS, code: "102" },
  { department: Department.ECS, code: "103" },
  { department: Department.ETC, code: "104" },
  { department: Department.BM, code: "105" },
];

async function main() {
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  let studentNumber = 1;

  for (const dept of departments) {
    for (let i = 1; i <= 8; i++) {
      const email = `student.${studentNumber}@vit.edu.in`;

      const rollNumber = `24${dept.code}B${String(i).padStart(4, "0")}`;

      const existing = await prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        console.log(`Skipped ${email}`);
        studentNumber++;
        continue;
      }

      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          profile: {
            create: {
              name: `Student ${studentNumber}`,
              email,
              role: Role.student,
              department: dept.department,
              semester: 5,
              rollNumber,
            },
          },
        },
      });

      console.log(
        `Created Student ${studentNumber} (${dept.department}) - ${rollNumber}`
      );

      studentNumber++;
    }
  }

  console.log("Students created successfully!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });