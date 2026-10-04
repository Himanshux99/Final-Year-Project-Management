import {
  prisma,
  run,
  DEPARTMENT,
  TEAM_COUNT,
  STUDENT_COUNT,
  studentEmail,
  groupIdFor,
} from "./shared";

// Removes everything the test-flow seeds (01-10) created:
//   - teams ITS01-ITS10 with their topics, topic chat, mentor preferences/allocations,
//     review sessions + messages, evaluations and student grades
//   - the 30 team.student.N users and their profiles
// Faculty, domains and all other students/teams are never touched.
//
// Usage (from server/):
//   npx ts-node --transpile-only prisma/seed/test-flow/cleanup.ts              delete seed data
//   npx ts-node --transpile-only prisma/seed/test-flow/cleanup.ts --dry-run    only show what would be deleted
//
// Optional flags (off by default because stages 6/7/10 and 3 may have reused data that
// existed before the seeds ran):
//   --rollouts   also switch off the IT Review 1 / Review 2 / Final Review rollouts
//   --form       also delete the active IT mentor form, but only if nothing else uses it
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const WITH_ROLLOUTS = args.includes("--rollouts");
const WITH_FORM = args.includes("--form");

run(async () => {
  console.log(DRY_RUN ? "DRY RUN - nothing will be deleted\n" : "Cleaning up test-flow data\n");

  const groupIds = Array.from({ length: TEAM_COUNT }, (_, i) => groupIdFor(i + 1));
  const emails = Array.from({ length: STUDENT_COUNT }, (_, i) => studentEmail(i + 1));

  const groups = await prisma.group.findMany({
    where: { groupId: { in: groupIds } },
    select: { id: true },
  });
  const ids = groups.map((g) => g.id);

  const profiles = await prisma.profile.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  const profileIds = profiles.map((p) => p.id);

  // ---- Counts -------------------------------------------------------------
  const counts = {
    teams: ids.length,
    topics: await prisma.projectTopic.count({ where: { groupId: { in: ids } } }),
    topicMessages: await prisma.topicMessage.count({ where: { groupId: { in: ids } } }),
    mentorPreferences: await prisma.mentorPreference.count({ where: { groupId: { in: ids } } }),
    mentorAllocations: await prisma.mentorAllocation.count({ where: { groupId: { in: ids } } }),
    reviewSessions: await prisma.reviewSession.count({ where: { groupId: { in: ids } } }),
    evaluations: await prisma.reviewEvaluation.count({ where: { groupId: { in: ids } } }),
    students: profileIds.length,
  };
  console.log("Found:", counts, "\n");

  if (DRY_RUN) {
    if (WITH_ROLLOUTS) console.log("Would also remove the IT review rollouts");
    if (WITH_FORM) console.log("Would also remove the active IT mentor form if unused");
    return;
  }

  // ---- Delete -------------------------------------------------------------
  // ReviewSession and TopicMessage keep a plain groupId (no FK to Group), so deleting a
  // group does NOT cascade to them - remove them explicitly. Deleting a session cascades
  // to its messages, evaluation and student grades.
  const sessions = await prisma.reviewSession.deleteMany({ where: { groupId: { in: ids } } });
  console.log(`Deleted ${sessions.count} review session(s) (with messages, evaluations, grades)`);

  const chat = await prisma.topicMessage.deleteMany({ where: { groupId: { in: ids } } });
  console.log(`Deleted ${chat.count} topic message(s)`);

  // Cascades to members, topics (+documents), mentor preferences and allocations,
  // attachments and any remaining evaluations.
  const deletedGroups = await prisma.group.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${deletedGroups.count} team(s)`);

  // Rows that reference the students without cascading.
  await prisma.studentGrade.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.mentorPreference.deleteMany({ where: { submittedBy: { in: profileIds } } });

  const users = await prisma.user.deleteMany({ where: { email: { in: emails } } });
  console.log(`Deleted ${users.count} student user(s) (profiles go with them)`);

  // ---- Optional --------------------------------------------------------------
  if (WITH_ROLLOUTS) {
    const rollouts = await prisma.reviewRollout.deleteMany({
      where: { department: DEPARTMENT },
    });
    console.log(`Removed ${rollouts.count} IT review rollout(s)`);
  }

  if (WITH_FORM) {
    const form = await prisma.mentorAllocationForm.findFirst({
      where: { department: DEPARTMENT, isActive: true },
    });
    if (!form) {
      console.log("No active IT mentor form to remove");
    } else {
      const [prefs, allocs] = await Promise.all([
        prisma.mentorPreference.count({ where: { formId: form.id } }),
        prisma.mentorAllocation.count({ where: { formId: form.id } }),
      ]);
      if (prefs > 0 || allocs > 0) {
        console.log(
          `Kept the active IT mentor form: it still has ${prefs} preference(s) and ${allocs} allocation(s) from other teams`,
        );
      } else {
        await prisma.mentorAllocationForm.delete({ where: { id: form.id } });
        console.log("Removed the unused active IT mentor form");
      }
    }
  }

  console.log("\nDone.");
});
