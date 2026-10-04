import { PrismaClient, Department, Profile, Group } from "@prisma/client";

// Shared helpers for the sequential "test-flow" seeds (01-students.ts ... 10-final-submitted.ts).

export const prisma = new PrismaClient();

export const PASSWORD = "Himanshu";
export const DEPARTMENT = Department.IT; // the seeded faculty all live in IT
export const TEAM_COUNT = 10;
export const MEMBERS_PER_TEAM = 3;
export const STUDENT_COUNT = TEAM_COUNT * MEMBERS_PER_TEAM;

export const studentEmail = (n: number) => `team.student.${n}@vit.edu.in`;
export const groupIdFor = (teamNo: number) =>
  `ITS${String(teamNo).padStart(2, "0")}`;
export const teamCodeFor = (teamNo: number) =>
  `SD${String(teamNo).padStart(3, "0")}`;
// Division "A" keeps these clear of the older B-division seed roll numbers.
export const rollNumberFor = (n: number) =>
  `24101A${String(100 + n).padStart(4, "0")}`;

// Which (1-based) team numbers reach each stage. Each stage is a subset of the
// one before it, so you get a spread of states to test with:
//   teams 1-10  : created, mentor allocated, topics submitted
//   team  9     : topic sent back for revision      team 10 : topic still pending
//   teams 1-8   : topic approved
//   teams 1-7   : review 1 submitted (team 8 only in progress)
//   teams 1-5   : review 2 submitted
//   teams 1-4   : review 1 evaluated
//   teams 1-2   : review 2 evaluated, final review submitted
export const PLAN = {
  topicRevision: [9],
  topicPending: [10],
  topicApproved: [1, 2, 3, 4, 5, 6, 7, 8],
  review1Submitted: [1, 2, 3, 4, 5, 6, 7],
  review1InProgress: [8],
  review2Submitted: [1, 2, 3, 4, 5],
  review1Evaluated: [1, 2, 3, 4],
  review2Evaluated: [1, 2],
  finalSubmitted: [1, 2],
};

export const STUDENT_NAMES = [
  "Aarav Sharma", "Diya Patel", "Vihaan Mehta", "Ananya Iyer", "Arjun Nair",
  "Ishita Gupta", "Kabir Singh", "Meera Joshi", "Rohan Desai", "Saanvi Reddy",
  "Aditya Kulkarni", "Kavya Menon", "Yash Verma", "Riya Shah", "Krish Malhotra",
  "Tanvi Bhat", "Dev Choudhary", "Neha Pillai", "Aryan Kapoor", "Pooja Rao",
  "Siddharth Jain", "Aditi Pawar", "Harsh Agarwal", "Shruti Naik", "Manav Thakur",
  "Pranav Kamat", "Sneha Ghosh", "Varun Bansal", "Isha Dixit", "Nikhil Sawant",
];

export interface SeedTeam {
  teamNo: number;
  group: Group;
  leader: Profile;
  members: Profile[]; // leader first
}

export async function run(main: () => Promise<void>) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getSeedTeams(): Promise<SeedTeam[]> {
  const groups = await prisma.group.findMany({
    where: { groupId: { in: Array.from({ length: TEAM_COUNT }, (_, i) => groupIdFor(i + 1)) } },
    include: { members: { include: { profile: true }, orderBy: { joinedAt: "asc" } } },
    orderBy: { groupId: "asc" },
  });

  if (groups.length === 0) {
    throw new Error(
      "No seeded teams found. Run 01-students.ts and 02-teams.ts first.",
    );
  }

  return groups.map((g) => {
    const members = g.members.map((m) => m.profile);
    const leader = members.find((m) => m.id === g.createdBy) ?? members[0];
    const ordered = [leader, ...members.filter((m) => m.id !== leader.id)];
    const { members: _members, ...group } = g;
    return {
      teamNo: parseInt(g.groupId.replace("ITS", ""), 10),
      group,
      leader,
      members: ordered,
    };
  });
}

export function teamsIn(teams: SeedTeam[], numbers: number[]) {
  return teams.filter((t) => numbers.includes(t.teamNo));
}

// The mentor whose allocation was accepted for this group.
export async function getMentorFor(groupDbId: string): Promise<Profile | null> {
  const allocation = await prisma.mentorAllocation.findFirst({
    where: { groupId: groupDbId, status: "accepted" },
    include: { mentor: true },
  });
  return allocation?.mentor ?? null;
}

// Profile recorded as creator of forms / rollouts: a super admin if one exists in
// the department, otherwise any faculty member.
export async function getCreatorProfile(): Promise<Profile> {
  const admin = await prisma.profile.findFirst({
    where: { role: "super_admin", department: DEPARTMENT },
  });
  if (admin) return admin;

  const faculty = await prisma.profile.findFirst({
    where: { role: "faculty", department: DEPARTMENT },
  });
  if (!faculty) {
    throw new Error("No faculty found. Run seedFaculty.ts first.");
  }
  return faculty;
}

export async function activateRollout(
  reviewType: "review_1" | "review_2" | "final_review",
) {
  const creator = await getCreatorProfile();
  await prisma.reviewRollout.upsert({
    where: {
      department_reviewType: { department: DEPARTMENT, reviewType },
    },
    update: { isActive: true },
    create: {
      department: DEPARTMENT,
      reviewType,
      isActive: true,
      createdBy: creator.id,
    },
  });
  console.log(`Rollout active: ${reviewType} (${DEPARTMENT})`);
}

// Deterministic pseudo-variety so reruns produce the same marks.
export function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

export type SeedReviewType = "review_1" | "review_2" | "final_review";

const PROGRESS_NOTES: Record<SeedReviewType, string[]> = {
  review_1: [
    "Finalised requirements and system design. Database schema is ready and the core modules are about half implemented.",
    "Completed literature survey and set up the project repository. Prototype of the main workflow is running locally.",
    "Backend APIs for the main features are done; the front-end screens are in progress.",
    "Collected and cleaned the dataset, and trained a baseline model. Integration with the app is next.",
  ],
  review_2: [
    "All major features are implemented and integrated. Currently running tests and fixing bugs ahead of the demo.",
    "Added the remaining modules, improved accuracy over the baseline, and started deployment on a test server.",
    "End-to-end flow works. Working on performance tuning, UI polish and the project report.",
  ],
  final_review: [
    "Project complete and deployed. Final report, presentation and demo video are ready for evaluation.",
    "All features delivered and tested. Documentation and paper draft are complete.",
  ],
};

// Creates a team's review session (once) as the leader would have submitted it.
// Returns false if the session already existed.
export async function createReviewSession(
  team: SeedTeam,
  reviewType: SeedReviewType,
  status: "in_progress" | "submitted",
  progress: number,
): Promise<boolean> {
  const existing = await prisma.reviewSession.findUnique({
    where: { groupId_reviewType: { groupId: team.group.id, reviewType } },
  });
  if (existing) return false;

  const session = await prisma.reviewSession.create({
    data: {
      groupId: team.group.id,
      reviewType,
      status,
      progressPercentage: progress,
      progressDescription: pick(PROGRESS_NOTES[reviewType], team.teamNo),
      submittedBy: team.leader.id,
    },
  });

  await prisma.reviewMessage.create({
    data: {
      sessionId: session.id,
      groupId: team.group.id,
      authorId: team.leader.id,
      authorName: team.leader.name,
      authorRole: "student",
      content:
        status === "submitted"
          ? "We have submitted our progress for this review. Please take a look."
          : "Work in progress - will submit once the main module is done.",
      links: [],
    },
  });
  return true;
}
