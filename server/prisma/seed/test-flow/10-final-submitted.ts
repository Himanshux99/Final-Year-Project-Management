import {
  run,
  PLAN,
  activateRollout,
  createReviewSession,
  getSeedTeams,
  getMentorFor,
  teamsIn,
} from "./shared";

// Stage 10: the Final Review is rolled out and teams 1-2 make their final submission.
run(async () => {
  const teams = await getSeedTeams();
  await activateRollout("final_review");

  for (const team of teamsIn(teams, PLAN.finalSubmitted)) {
    if (!(await getMentorFor(team.group.id))) {
      console.log(`Skipped ${team.group.groupId} (no mentor - run 03 first)`);
      continue;
    }
    const progress = 95 + (team.teamNo % 6);
    const created = await createReviewSession(team, "final_review", "submitted", progress);
    console.log(
      created
        ? `${team.group.groupId}: Final review submitted (${progress}%)`
        : `Skipped ${team.group.groupId} (final session exists)`,
    );
  }

  console.log("\nFinal submissions seeded.");
});
