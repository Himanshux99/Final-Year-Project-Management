# Test-flow seeds

Ten scripts that build up a realistic project lifecycle **one stage at a time**, so you can
test each part of the app in order. Faculty and domains are **not** created here — they come
from `seedFaculty.ts` and `seedDomains.ts` and are left as they are.

Everything is in the **IT** department (that is where the seeded faculty live).
Password for every seeded student: `Himanshu`.

## Prerequisites
- Schema applied and client generated (`npm run db:push`, `npm run db:generate`)
- `seedDomains.ts` and `seedFaculty.ts` already run (needs 12 domains and at least 3 IT faculty)

## Run order
From `server/`:

| # | Command | What it does |
|---|---------|--------------|
| 1 | `npx ts-node --transpile-only prisma/seed/test-flow/01-students.ts` | 30 students, `team.student.1` … `team.student.30@vit.edu.in`, roll numbers `24101A0101` … |
| 2 | `…/02-teams.ts` | 10 teams `ITS01`–`ITS10` of 3 students; the first student of each team is the leader |
| 3 | `…/03-mentor-allocation.ts` | Preferences submitted and a mentor accepted per team (max 3 teams per mentor). Needed before teams can open Project Progress |
| 4 | `…/04-topics-submitted.ts` | Every team submits a different topic with different domains (teams 3, 5, 6, 9 submit several) |
| 5 | `…/05-topics-approved.ts` | Teams 1–8 approved · team 9 revision requested · team 10 left pending |
| 6 | `…/06-review1-submitted.ts` | Review 1 rolled out · teams 1–7 submitted · team 8 in progress |
| 7 | `…/07-review2-submitted.ts` | Review 2 rolled out · teams 1–5 submitted |
| 8 | `…/08-review1-evaluated.ts` | Review 1 evaluated for teams 1–4 (grades, remarks, session completed) |
| 9 | `…/09-review2-evaluated.ts` | Review 2 evaluated for teams 1–2 |
| 10 | `…/10-final-submitted.ts` | Final Review rolled out · teams 1–2 submitted |

Each stage only advances some teams, so after any stage you have a mix of states
(e.g. after stage 8: teams 5–7 have a submitted Review 1 still waiting for evaluation).

You can stop after any stage, test, and continue later. Every script is safe to re-run:
it skips anything that already exists.

## Logging in
- Students: `team.student.N@vit.edu.in` / `Himanshu` (team N = students `3N-2`, `3N-1`, `3N`; the first is the leader)
- Mentors: the faculty from `seedFaculty.ts` (`firstname.lastname@vit.edu.in` / `Himanshu`). Stage 3 prints which mentor each team got.

## What each stage touches
- Stage 3 reuses the active IT mentor form (or creates one) and adds all IT faculty as available mentors.
- Stages 6, 7 and 10 switch on the Review 1 / Review 2 / Final Review rollout for IT. Unpublish them from the admin dashboard to test that.

## Cleanup
`npx ts-node --transpile-only prisma/seed/test-flow/cleanup.ts` deletes the `ITS01`–`ITS10` teams
(and their topics, review sessions, evaluations, preferences and allocations) and the
`team.student.N` users. Faculty, domains, forms, rollouts and all other data are left alone.
Rollouts and the mentor form created along the way are not removed.
