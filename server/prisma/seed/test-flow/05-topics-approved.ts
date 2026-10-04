import {
  prisma,
  run,
  PLAN,
  getSeedTeams,
  getMentorFor,
  teamsIn,
} from "./shared";

// Stage 5: mentors act on the submitted topics.
//   teams 1-8 : first topic approved (their other topics stay as submitted)
//   team  9   : revision requested, with mentor feedback in the topic chat
//   team  10  : left pending, so you can test approving/rejecting it yourself
run(async () => {
  const teams = await getSeedTeams();

  const topicsFor = (groupId: string) =>
    prisma.projectTopic.findMany({
      where: { groupId },
      orderBy: { submittedAt: "asc" },
    });

  for (const team of teamsIn(teams, PLAN.topicApproved)) {
    const mentor = await getMentorFor(team.group.id);
    if (!mentor) {
      console.log(`Skipped ${team.group.groupId} (no mentor - run 03 first)`);
      continue;
    }
    const topics = await topicsFor(team.group.id);
    if (topics.length === 0) {
      console.log(`Skipped ${team.group.groupId} (no topics - run 04 first)`);
      continue;
    }
    if (topics.some((t) => t.status === "approved")) {
      console.log(`Skipped ${team.group.groupId} (already approved)`);
      continue;
    }

    await prisma.projectTopic.update({
      where: { id: topics[0].id },
      data: {
        status: "approved",
        reviewedBy: mentor.id,
        reviewedAt: new Date(),
      },
    });
    console.log(`${team.group.groupId}: approved "${topics[0].title}"`);
  }

  for (const team of teamsIn(teams, PLAN.topicRevision)) {
    const mentor = await getMentorFor(team.group.id);
    const topics = await topicsFor(team.group.id);
    if (!mentor || topics.length === 0) {
      console.log(`Skipped ${team.group.groupId} (needs stages 03 and 04)`);
      continue;
    }
    if (topics.some((t) => t.status === "revision_requested")) {
      console.log(`Skipped ${team.group.groupId} (already in revision)`);
      continue;
    }

    await prisma.projectTopic.update({
      where: { id: topics[0].id },
      data: {
        status: "revision_requested",
        reviewedBy: mentor.id,
        reviewedAt: new Date(),
      },
    });
    await prisma.topicMessage.create({
      data: {
        topicId: topics[0].id,
        groupId: team.group.id,
        authorId: mentor.id,
        authorName: mentor.name,
        authorRole: "faculty",
        content:
          "The idea is promising, but please define the scope and the evaluation metrics more clearly before I can approve it.",
        links: [],
      },
    });
    console.log(`${team.group.groupId}: revision requested`);
  }

  for (const team of teamsIn(teams, PLAN.topicPending)) {
    console.log(`${team.group.groupId}: left pending on purpose`);
  }

  console.log("\nTopic decisions seeded.");
});
