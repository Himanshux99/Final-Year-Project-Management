import { prisma, SeedTeam, getMentorFor, pick } from "./shared";

const R1_TYPES = ["Application", "Research", "Product", "Industry", "Social"];
const R2_NATURES = ["Application", "Research", "Product", "Social"];
const GRADES = ["A", "B", "A", "B", "C"];

const R1_REMARKS = [
  "Good start. Design is solid; keep the implementation pace up.",
  "Requirements are clear. Needs more individual contribution from one member.",
  "Well-organised work. Aim to start the paper draft early.",
];
const R2_REMARKS = [
  "Strong implementation and a clean demo. Polish the report.",
  "Good technical depth. Improve the testing coverage before final review.",
  "Innovative approach; presentation was clear and confident.",
];

// Deterministic marks between min and max for (team, member, criterion).
function marks(team: number, member: number, criterion: number, max: number) {
  const min = Math.ceil(max * 0.5);
  return min + ((team * 3 + member * 5 + criterion * 7) % (max - min + 1));
}

// Creates the mentor's evaluation form + per-student grades for a submitted review,
// then records feedback and completes the session (same end state as the real flow).
// Returns false when nothing was created (no session, no mentor, or already evaluated).
export async function evaluateReview(
  team: SeedTeam,
  reviewType: "review_1" | "review_2",
): Promise<boolean> {
  const session = await prisma.reviewSession.findUnique({
    where: { groupId_reviewType: { groupId: team.group.id, reviewType } },
    include: { evaluation: true },
  });
  if (!session) {
    console.log(`Skipped ${team.group.groupId} (no ${reviewType} session)`);
    return false;
  }
  if (session.evaluation) {
    console.log(`Skipped ${team.group.groupId} (already evaluated)`);
    return false;
  }

  const mentor = await getMentorFor(team.group.id);
  if (!mentor) {
    console.log(`Skipped ${team.group.groupId} (no mentor)`);
    return false;
  }

  const topic = await prisma.projectTopic.findFirst({
    where: { groupId: team.group.id, status: "approved" },
    include: { domains: true },
  });
  if (!topic) {
    console.log(`Skipped ${team.group.groupId} (no approved topic)`);
    return false;
  }

  const isR1 = reviewType === "review_1";
  const completion = Math.min(100, session.progressPercentage + 5);

  const studentGrades = team.members.map((m, mi) => {
    if (isR1) {
      const progress = marks(team.teamNo, mi, 1, 10);
      const contribution = marks(team.teamNo, mi, 2, 10);
      const publication = marks(team.teamNo, mi, 3, 5);
      return {
        profileId: m.id,
        studentName: m.name,
        rollNumber: m.rollNumber ?? "",
        progressMarks: progress,
        contributionMarks: contribution,
        publicationMarks: publication,
        totalMarks: progress + contribution + publication,
      };
    }
    const tech = marks(team.teamNo, mi, 1, 5);
    const innovation = marks(team.teamNo, mi, 2, 5);
    const presentation = marks(team.teamNo, mi, 3, 5);
    const activity = marks(team.teamNo, mi, 4, 5);
    const synopsis = marks(team.teamNo, mi, 5, 5);
    return {
      profileId: m.id,
      studentName: m.name,
      rollNumber: m.rollNumber ?? "",
      techUsageMarks: tech,
      innovationMarks: innovation,
      presentationMarks: presentation,
      activityMarks: activity,
      synopsisMarks: synopsis,
      totalMarks: tech + innovation + presentation + activity + synopsis,
    };
  });

  const remarks = pick(isR1 ? R1_REMARKS : R2_REMARKS, team.teamNo);

  await prisma.$transaction(async (tx) => {
    await tx.reviewEvaluation.create({
      data: {
        sessionId: session.id,
        groupId: team.group.id,
        reviewType,
        evaluationDate: new Date(),
        division: "A",
        projectGuide: mentor.name,
        projectTitle: topic.title,
        ...(isR1
          ? {
              projectCategory: pick(GRADES, team.teamNo),
              projectType: pick(R1_TYPES, team.teamNo),
            }
          : {
              projectDomain: topic.domains[0]?.name ?? "General",
              qualityGrade: pick(GRADES, team.teamNo + 1),
              projectNature: pick(R2_NATURES, team.teamNo),
            }),
        completionPercentage: completion,
        remarks,
        filledBy: mentor.id,
        studentGrades: { create: studentGrades },
      },
    });

    await tx.reviewSession.update({
      where: { id: session.id },
      data: {
        progressPercentage: completion,
        mentorFeedback: remarks,
        feedbackGivenBy: mentor.id,
        feedbackGivenAt: new Date(),
        status: "completed",
      },
    });
  });

  console.log(
    `${team.group.groupId}: ${reviewType} evaluated by ${mentor.name} (${completion}%)`,
  );
  return true;
}
