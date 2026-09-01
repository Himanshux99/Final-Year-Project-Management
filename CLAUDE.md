# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

ProjectHub is a college project management system for students, faculty, and super admins: group formation, mentor preference/allocation, project topic approval, and a multi-stage review workflow (Review 1 → Review 2 → Final Review) with faculty grading. All data is scoped by department (`IT`, `CS`, `ECS`, `ETC`, `BM`).

This is a monorepo with two independently run apps:
- `client/` — Next.js 15 (App Router) + TypeScript frontend
- `server/` — NestJS + Prisma + PostgreSQL (Supabase) backend API

## Commands

Run from repo root (starts both apps concurrently via `concurrently`):
```
npm run dev
```

### server/ (NestJS API, default port 3001)
```
npm run start:dev        # dev server with watch
npm run start:debug      # dev server with watch + debugger
npm run build            # nest build
npm run lint             # eslint --fix on src/apps/libs/test
npm run format           # prettier --write src/**/*.ts
npm test                 # jest, run from server/
npm run test:watch
npm run test:cov
npx jest path/to/file.spec.ts        # run a single test file
npx jest -t "test name"              # run tests matching a name
npm run db:generate      # prisma generate
npm run db:push          # push schema.prisma to DB without a migration
npm run db:migrate       # prisma migrate dev (creates a migration)
npm run db:studio        # open Prisma Studio
```
Jest config lives inline in `server/package.json` (`rootDir: src`, matches `*.spec.ts`).

### client/ (Next.js, default port 3000)
```
npm run dev
npm run build
npm run start
npm run lint              # next lint
```
There is no test runner configured for the client.

### Environment setup
- `server/.env` from `server/.env.example`: `DATABASE_URL`/`DIRECT_URL` (Supabase Postgres), `JWT_SECRET`, `JWT_EXPIRATION`, `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` (used for file attachment storage).
- `client/.env.local` from `client/.env.local.example`: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api`).
- The backend must be running for the client to function — there is no mock/offline mode despite an older `lib/storage.ts` localStorage abstraction still present in the client (legacy, superseded by the API-backed flow described below).

## Architecture

### Backend (`server/src`)
Standard NestJS feature-module layout, one directory per domain: `auth`, `users`, `profiles`, `groups`, `mentor-forms`, `mentor-preferences`, `mentor-allocations`, `project-topics`, `topic-approval`, `reviews`, `evaluations`, `attachments`, `admin`, plus infra modules `prisma` and `supabase`. Everything is wired together in `app.module.ts`.

- **Auth**: JWT-based (`passport-jwt`). `JwtStrategy` (`auth/strategies/jwt.strategy.ts`) validates the token and attaches `{ userId, email }` to `req.user`; `JwtAuthGuard` is applied per-route with `@UseGuards(JwtAuthGuard)` (no global guard). There is **no roles guard/decorator** — role checks (`student` / `faculty` / `super_admin`) are done manually inside service methods by loading the caller's `Profile` via `userId` and checking `profile.role`. Follow this pattern rather than introducing a new authorization mechanism.
- **Data access**: Prisma (`prisma/schema.prisma`) is the single source of truth for the schema; `PrismaService`/`PrismaModule` wrap the client for injection into services. Run `db:generate` after any schema change, and `db:migrate` (dev) or `db:push` to apply it.
- **File storage**: `SupabaseService` (`supabase/supabase.service.ts`) uploads/deletes/signs URLs against a Supabase Storage bucket — used by `attachments`, `topic-approval` (signed document upload), and review evaluation flows. It degrades to throwing at call time (not startup) if Supabase env vars are missing.
- **Validation**: global `ValidationPipe` in `main.ts` with `whitelist: true` and `forbidNonWhitelisted: true` — DTOs (`*/dto/*.dto.ts`, class-validator decorated) must declare every accepted field or the request is rejected.
- **API prefix**: all routes are served under `/api` (set globally in `main.ts`), except the root `GET /` health route.
- **CORS**: origin allowlist is built in `main.ts` from hardcoded localhost/prod origins plus `CORS_ORIGINS` env var (comma-separated); requests with no `Origin` header are always allowed.

### Domain model (see `server/prisma/schema.prisma`)
Core chain: `User` → `Profile` (role + department) → `Group` (via `GroupMember`, max 3 students, same department, unique `teamCode`) → `MentorAllocationForm`/`AvailableMentor` → `MentorPreference` (leader submits top 3) → `MentorAllocation` (per-mentor accept/reject with `preferenceRank`). Separately, a group has a `ProjectTopic` (with chat via `TopicMessage` and an optional `TopicSubmissionDocument`) and one `ReviewSession` per `ReviewType` (`review_1`/`review_2`/`final_review`), each with its own `ReviewMessage` thread, optional `meetLink`, and an optional `ReviewEvaluation` (faculty grading form) that fans out into per-student `StudentGrade` rows. `Attachment` is a generic file record keyed by group + optional `AttachmentStage`.

### Frontend (`client/`)
- App Router pages under `app/`, split by role: `app/dashboard/student`, `app/dashboard/faculty`, `app/dashboard/admin`, plus shared `app/auth` and `app/onboarding`.
- `lib/api-client.ts` is the low-level fetch wrapper (`api.get/post/patch/delete/upload/uploadWithFields`) — it reads the JWT from `localStorage` (`projecthub_token`), attaches `Authorization: Bearer`, and points at `NEXT_PUBLIC_API_URL`. `lib/api.ts` builds the higher-level, per-domain API functions (e.g. `authApi`) on top of it — add new backend calls there, not by calling `fetch` directly from components.
- `lib/auth-context.tsx` provides `AuthProvider`/`useAuth()` (user + profile + loading), refreshed from `authApi.getMe()` on mount.
- `lib/storage.ts` is a legacy localStorage data layer from an earlier prototype phase before the NestJS backend existed; it is not part of the current data flow — don't extend it, prefer `lib/api.ts`.
- UI primitives live in `components/ui/` (Shadcn-style: button, card, dialog, select, tabs, toast, etc.); feature components (review forms, mentor cards, topic approval, attachments, thread/chat panels) live directly under `components/`.
- Path alias `@/*` maps to the `client/` root (see `tsconfig.json`).
- Design system: primary indigo `#4F46E5`, accent amber `#FBBF24`, white background — clean/minimal academic style (Tailwind).

## Repo layout notes
- `docs/PROJECT_DOCUMENTATION.md` has a fuller architecture/API/workflow writeup if deeper context is needed.
- `notToCommit/` is gitignored local scratch space (old migration snapshots, API docs) — not part of the tracked app.
