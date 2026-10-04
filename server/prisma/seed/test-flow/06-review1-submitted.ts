import {
  run,
  PLAN,
  activateRollout,
  createReviewSession,
  getSeedTeams,
  getMentorFor,
  teamsIn,
} from "./shared";

// Stage 6: Review 1 is rolled out and teams submit progress.
//   teams 1-7 : submitted
//   team  8   : started but only in progress (not submitted)
// Teams 9-10 have no approved topic yet, so they don't take part.
run(async () => {
  const teams = await getSeedTeams();
  await activateRollout("review_1");

  const submit = async (nums: number[], status: "submitted" | "in_progress") => {
    for (const team of teamsIn(teams, nums)) {
      if (!(await getMentorFor(team.group.id))) {
        console.log(`Skipped ${team.group.groupId} (no mentor - run 03 first)`);
        continue;
      }
      const progress =
        status === "submitted" ? 30 + ((team.teamNo * 7) % 31) : 20;
      const created = await createReviewSession(team, "review_1", status, progress);
      console.log(
        created
          ? `${team.group.groupId}: Review 1 ${status} (${progress}%)`
          : `Skipped ${team.group.groupId} (Review 1 session exists)`,
      );
    }
  };

  await submit(PLAN.review1Submitted, "submitted");
  await submit(PLAN.review1InProgress, "in_progress");

  console.log("\nReview 1 submissions seeded.");
});
