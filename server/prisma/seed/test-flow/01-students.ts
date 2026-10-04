import * as bcrypt from "bcrypt";
import {
  prisma,
  run,
  PASSWORD,
  DEPARTMENT,
  STUDENT_COUNT,
  STUDENT_NAMES,
  studentEmail,
  rollNumberFor,
} from "./shared";

// Stage 1: create 30 new IT students (team.student.1 ... team.student.30@vit.edu.in).
// Existing students and faculty are not touched.
run(async () => {
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  for (let n = 1; n <= STUDENT_COUNT; n++) {
    const email = studentEmail(n);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`Skipped ${email}`);
      continue;
    }

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        profile: {
          create: {
            name: STUDENT_NAMES[(n - 1) % STUDENT_NAMES.length],
            email,
            role: "student",
            department: DEPARTMENT,
            semester: 7,
            rollNumber: rollNumberFor(n),
          },
        },
      },
    });

    console.log(
      `Created ${STUDENT_NAMES[(n - 1) % STUDENT_NAMES.length]} - ${rollNumberFor(n)} (${email})`,
    );
  }

  console.log(`\nStudents ready. Password for all: ${PASSWORD}`);
});
