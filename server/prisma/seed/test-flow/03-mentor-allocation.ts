import {
  prisma,
  run,
  DEPARTMENT,
  getSeedTeams,
  getCreatorProfile,
} from "./shared";

const MAX_TEAMS_PER_MENTOR = 3; // same limit the accept endpoint enforces

// Stage 3: leaders "submit" mentor preferences and each team gets an accepted mentor.
// A mentor must be accepted before teams can open the project-progress / review pages.
// Uses the active IT mentor form if there is one, otherwise creates one.
run(async () => {
  const teams = await getSeedTeams();
  const creator = await getCreatorProfile();

  const faculty = await prisma.profile.findMany({
    where: { role: "faculty", department: DEPARTMENT },
    orderBy: { name: "asc" },
  });
  if (faculty.length < 3) {
    throw new Error("Need at least 3 IT faculty. Run seedFaculty.ts first.");
  }

  // Current accepted load per mentor (includes teams from other seeds).
  const accepted = await prisma.mentorAllocation.groupBy({
    by: ["mentorId"],
    where: { status: "accepted" },
    _count: { _all: true },
  });
  const load = new Map<string, number>(
    accepted.map((a) => [a.mentorId, a._count._all]),
  );
  const loadOf = (id: string) => load.get(id) ?? 0;

  const capacity = faculty.reduce(
    (sum, f) => sum + Math.max(0, MAX_TEAMS_PER_MENTOR - loadOf(f.id)),
    0,
  );
  if (capacity < teams.length) {
    console.warn(
      `Warning: only ${capacity} mentor slots free for ${teams.length} teams; some teams will be skipped.`,
    );
  }

  // Reuse the active form, or create one.
  let form = await prisma.mentorAllocationForm.findFirst({
    where: { department: DEPARTMENT, isActive: true },
  });
  if (!form) {
    form = await prisma.mentorAllocationForm.create({
      data: { department: DEPARTMENT, createdBy: creator.id, isActive: true },
    });
    console.log("Created active mentor allocation form");
  } else {
    console.log("Reusing the active mentor allocation form");
  }

  // Make every faculty available on the form.
  for (const f of faculty) {
    await prisma.availableMentor.upsert({
      where: { formId_mentorId: { formId: form.id, mentorId: f.id } },
      update: {},
      create: { formId: form.id, mentorId: f.id },
    });
  }

  for (const team of teams) {
    const { group, leader } = team;

    const alreadyAssigned = await prisma.mentorAllocation.findFirst({
      where: { groupId: group.id, status: "accepted" },
    });
    if (alreadyAssigned) {
      console.log(`Skipped ${group.groupId} (already has a mentor)`);
      continue;
    }

    // First choice = the least-loaded mentor with a free slot; 2nd/3rd = the next two.
    const byLoad = [...faculty].sort((a, b) => loadOf(a.id) - loadOf(b.id));
    const first = byLoad.find((f) => loadOf(f.id) < MAX_TEAMS_PER_MENTOR);
    if (!first) {
      console.log(`Skipped ${group.groupId} (no mentor slots left)`);
      continue;
    }
    const others = faculty.filter((f) => f.id !== first.id).slice(0, 2);
    const choices = [first, ...others];

    await prisma.$transaction(async (tx) => {
      await tx.mentorPreference.upsert({
        where: { groupId_formId: { groupId: group.id, formId: form!.id } },
        update: {},
        create: {
          groupId: group.id,
          formId: form!.id,
          mentorChoice1: choices[0].id,
          mentorChoice2: choices[1].id,
          mentorChoice3: choices[2].id,
          submittedBy: leader.id,
        },
      });

      for (let i = 0; i < choices.length; i++) {
        await tx.mentorAllocation.upsert({
          where: {
            groupId_mentorId_formId: {
              groupId: group.id,
              mentorId: choices[i].id,
              formId: form!.id,
            },
          },
          update: { status: i === 0 ? "accepted" : "waiting" },
          create: {
            groupId: group.id,
            mentorId: choices[i].id,
            formId: form!.id,
            preferenceRank: i + 1,
            status: i === 0 ? "accepted" : "waiting",
          },
        });
      }
    });

    load.set(first.id, loadOf(first.id) + 1);
    console.log(`${group.groupId} -> mentor ${first.name} (accepted)`);
  }

  console.log("\nMentors allocated.");
});
