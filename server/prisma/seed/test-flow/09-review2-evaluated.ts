import { run, PLAN, getSeedTeams, teamsIn } from "./shared";
import { evaluateReview } from "./evaluate";

// Stage 9: mentors evaluate Review 2 for teams 1-2.
// Teams 3-5 stay submitted-but-unevaluated.
run(async () => {
  const teams = await getSeedTeams();
  for (const team of teamsIn(teams, PLAN.review2Evaluated)) {
    await evaluateReview(team, "review_2");
  }
  console.log("\nReview 2 evaluations seeded.");
});
