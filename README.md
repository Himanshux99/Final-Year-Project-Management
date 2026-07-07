# ProjectHub — Monorepo (Client + Server)

Central README for the ProjectHub monorepo. This repository contains two main apps:
- client/ — Next.js frontend (ProjectHub UI)
- server/ — NestJS backend API (ProjectHub Backend)

## Quick Overview
ProjectHub manages college project groups, mentor preferences, and mentor allocations for students, faculty, and admins.

Tech highlights:
- Frontend: Next.js + TypeScript + Tailwind
- Backend: NestJS + Prisma + PostgreSQL (Supabase)
- Auth: JWT

## Prerequisites
- Node.js 18+
- npm (or yarn)
- Supabase project (for production/backend DB)

## Getting started (development)

1. Install dependencies for both projects:
   - From repo root:
     - cd client && npm install
     - cd ../server && npm install

2. Backend setup (server):
   - Copy env example:
     - cp .env.example .env
   - Update DATABASE_URL in server/.env to your Supabase connection string
   - Generate Prisma client & push schema:
     - npm run db:generate
     - npm run db:push
   - Start server:
     - npm run start:dev
   - Default backend URL: http://localhost:3001

3. Frontend setup (client):
   - Copy env example:
     - cp .env.local.example .env.local
   - Ensure NEXT_PUBLIC_API_URL points to backend: http://localhost:3001/api
   - Start dev server:
     - npm run dev
   - Frontend URL: http://localhost:3000

## Project layout
- client/ — Next.js app (UI, pages, components)
- server/ — NestJS API (controllers, services, prisma)
- READMEs:
  - client/README.md — frontend details
  - server/README.md — backend details and API endpoints

## Useful commands
- Root: none (use per-project scripts)
- client:
  - npm run dev
  - npm run build
- server:
  - npm run start:dev
  - npm run db:studio
  - npm run db:generate
  - npm run db:push

## Notes
- Protected endpoints require `Authorization: Bearer <token>`
- Tokens default to 7-day expiry (see server .env)
- See client/README.md and server/README.md for detailed workflow, API endpoints, and developer notes.

If you want, I can create this file in the repo now.// filepath: d:\Projects\Project Management\README.md
# ProjectHub — Monorepo (Client + Server)

Central README for the ProjectHub monorepo. This repository contains two main apps:
- client/ — Next.js frontend (ProjectHub UI)
- server/ — NestJS backend API (ProjectHub Backend)

## Quick Overview
ProjectHub manages college project groups, mentor preferences, and mentor allocations for students, faculty, and admins.

Tech highlights:
- Frontend: Next.js + TypeScript + Tailwind
- Backend: NestJS + Prisma + PostgreSQL (Supabase)
- Auth: JWT

## Prerequisites
- Node.js 18+
- npm (or yarn)
- Supabase project (for production/backend DB)

## Getting started (development)

1. Install dependencies for both projects:
   - From repo root:
     - cd client && npm install
     - cd ../server && npm install

2. Backend setup (server):
   - Copy env example:
     - cp .env.example .env
   - Update DATABASE_URL in server/.env to your Supabase connection string
   - Generate Prisma client & push schema:
     - npm run db:generate
     - npm run db:push
   - Start server:
     - npm run start:dev
   - Default backend URL: http://localhost:3001

3. Frontend setup (client):
   - Copy env example:
     - cp .env.local.example .env.local
   - Ensure NEXT_PUBLIC_API_URL points to backend: http://localhost:3001/api
   - Start dev server:
     - npm run dev
   - Frontend URL: http://localhost:3000

## Project layout
- client/ — Next.js app (UI, pages, components)
- server/ — NestJS API (controllers, services, prisma)
- READMEs:
  - client/README.md — frontend details
  - server/README.md — backend details and API endpoints

## Useful commands
- Root: none (use per-project scripts)
- client:
  - npm run dev
  - npm run build
- server:
  - npm run start:dev
  - npm run db:studio
  - npm run db:generate
  - npm run db:push

## Notes
- Protected endpoints require `Authorization: Bearer <token>`
- Tokens default to 7-day expiry (see server .env)
- See client/README.md and server/README.md for detailed workflow, API endpoints, and developer notes.

If you want, I can create this file in the repo now.