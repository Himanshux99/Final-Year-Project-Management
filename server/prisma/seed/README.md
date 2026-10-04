# Seed scripts (server/prisma/seed)

Seed helpers to populate the development database with students, faculty and teams.

## Files
- `seedStudents.ts` — creates 8 students per department (IT, CS, ECS, ETC, BM).
- `seedFaculty.ts` — creates faculty users from the provided list.
- `seedTeam.ts` — creates groups from student profiles (expects 8 students per department).
- `seedDomains.ts` — upserts the default list of project domains (also manageable by super admins from the dashboard).
- `test-flow/` — ten sequential scripts (students → teams → mentors → topics → approvals → reviews → evaluations → final) for testing the whole lifecycle stage by stage. See `test-flow/README.md`.

## Important
- The password for every created user/profile is: `Himanshu`
- `seedTeam.ts` expects exactly 8 students per department; it will skip departments with a different count.

## Prerequisites
1. From repo root run:
   - Install server deps: `cd server && npm install`
   - Ensure `.env` in `server/` has a valid `DATABASE_URL`
   - Generate Prisma client: `npm run db:generate` (from `server/`)

## Run (Windows)
Open PowerShell or cmd:
```powershell
cd d:\Projects\Project Management\server\prisma\seed
npx ts-node --transpile-only seedStudents.ts
npx ts-node --transpile-only seedFaculty.ts
npx ts-node --transpile-only seedTeam.ts
```

If you prefer, run scripts individually from the `server/` package.json if equivalent npm scripts exist.

## Cleanup
Use Prisma or Supabase dashboard to remove seeded data as needed.