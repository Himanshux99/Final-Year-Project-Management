import { run, PLAN, getSeedTeams, teamsIn } from "./shared";
import { evaluateReview } from "./evaluate";

// Stage 8: mentors evaluate Review 1 for teams 1-4 (grades + remarks, session marked completed).
// Teams 5-7 stay submitted-but-unevaluated so you can fill their forms yourself.
run(async () => {
  const teams = await getSeedTeams();
  for (const team of teamsIn(teams, PLAN.review1Evaluated)) {
    await evaluateReview(team, "review_1");
  }
  console.log("\nReview 1 evaluations seeded.");
});
