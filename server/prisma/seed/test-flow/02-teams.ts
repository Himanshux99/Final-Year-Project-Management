import {
  prisma,
  run,
  DEPARTMENT,
  TEAM_COUNT,
  MEMBERS_PER_TEAM,
  studentEmail,
  groupIdFor,
  teamCodeFor,
} from "./shared";

// Stage 2: form 10 teams of 3 from the students created in stage 1.
// Team N = students (N-1)*3+1 .. N*3, the first student being the leader.
run(async () => {
  for (let teamNo = 1; teamNo <= TEAM_COUNT; teamNo++) {
    const groupId = groupIdFor(teamNo);

    const existing = await prisma.group.findUnique({ where: { groupId } });
    if (existing) {
      console.log(`Skipped ${groupId} (already exists)`);
      continue;
    }

    const firstStudent = (teamNo - 1) * MEMBERS_PER_TEAM + 1;
    const emails = Array.from(
      { length: MEMBERS_PER_TEAM },
      (_, i) => studentEmail(firstStudent + i),
    );

    const members = await prisma.profile.findMany({
      where: { email: { in: emails } },
    });
    if (members.length !== MEMBERS_PER_TEAM) {
      throw new Error(
        `${groupId}: expected ${MEMBERS_PER_TEAM} students but found ${members.length}. Run 01-students.ts first.`,
      );
    }
    // Keep the intended order so the first student leads.
    const ordered = emails.map((e) => members.find((m) => m.email === e)!);

    const group = await prisma.group.create({
      data: {
        groupId,
        teamCode: teamCodeFor(teamNo),
        department: DEPARTMENT,
        createdBy: ordered[0].id,
        isFull: true,
      },
    });

    // Staggered join times so "leader first" ordering is stable.
    for (let i = 0; i < ordered.length; i++) {
      await prisma.groupMember.create({
        data: {
          groupId: group.id,
          profileId: ordered[i].id,
          joinedAt: new Date(Date.now() + i * 1000),
        },
      });
    }

    console.log(
      `${groupId} (${group.teamCode}) leader ${ordered[0].name} -> ${ordered
        .map((m) => m.name)
        .join(", ")}`,
    );
  }

  console.log("\nTeams ready.");
});
