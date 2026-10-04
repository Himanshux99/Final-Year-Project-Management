import {
  run,
  PLAN,
  activateRollout,
  createReviewSession,
  getSeedTeams,
  getMentorFor,
  teamsIn,
} from "./shared";

// Stage 7: Review 2 is rolled out and teams 1-5 submit progress.
run(async () => {
  const teams = await getSeedTeams();
  await activateRollout("review_2");

  for (const team of teamsIn(teams, PLAN.review2Submitted)) {
    if (!(await getMentorFor(team.group.id))) {
      console.log(`Skipped ${team.group.groupId} (no mentor - run 03 first)`);
      continue;
    }
    const progress = 65 + ((team.teamNo * 5) % 21);
    const created = await createReviewSession(team, "review_2", "submitted", progress);
    console.log(
      created
        ? `${team.group.groupId}: Review 2 submitted (${progress}%)`
        : `Skipped ${team.group.groupId} (Review 2 session exists)`,
    );
  }

  console.log("\nReview 2 submissions seeded.");
});
