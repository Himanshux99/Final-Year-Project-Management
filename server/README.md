# ProjectHub Backend

NestJS backend API for the ProjectHub application.

## Stack

- **Framework:** NestJS
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Authentication:** JWT (JSON Web Tokens)

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works fine)

## Setup

1. **Create a Supabase project:**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Wait for the database to be provisioned
   - Go to Project Settings → Database → Connection String
   - Copy the URI connection string

2. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Setup environment:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and update the `DATABASE_URL` with your Supabase connection string:
   ```
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   ```

4. **Generate Prisma client and run migrations:**
   ```bash
   npm run db:generate
   npm run db:push
   ```
   
   This will create all tables in your Supabase database.

5. **Start the server:**
   ```bash
   npm run start:dev
   ```

The server will run on `http://localhost:3001`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user info |

### Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/profiles` | Create user profile (onboarding) |
| GET | `/api/profiles/me` | Get my profile |
| GET | `/api/profiles/by-id/:id` | Get profile by ID |
| GET | `/api/profiles/by-role/:role` | Get profiles by role |
| GET | `/api/profiles/by-department/:department` | Get profiles by department |
| GET | `/api/profiles/faculty/:department` | Get faculty by department |
| POST | `/api/profiles/batch` | Get multiple profiles by IDs |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups/create` | Create a new group |
| POST | `/api/groups/join` | Join a group by team code |
| GET | `/api/groups/my-group` | Get my group |
| GET | `/api/groups/by-id/:id` | Get group by ID |
| GET | `/api/groups/by-team-code/:teamCode` | Get group by team code |
| GET | `/api/groups/by-department/:department` | Get groups by department |
| GET | `/api/groups/with-details/:department` | Get groups with allocation details |

### Mentor Allocation Forms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mentor-forms` | Create/rollout mentor allocation form |
| GET | `/api/mentor-forms/active` | Get active form for current user's department |
| GET | `/api/mentor-forms/active/:department` | Get active form for department |
| GET | `/api/mentor-forms/:id` | Get form by ID |
| PATCH | `/api/mentor-forms/:id/deactivate` | Deactivate a form |

### Mentor Preferences
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mentor-preferences` | Submit mentor preferences |
| GET | `/api/mentor-preferences/my-preferences` | Get my submitted preferences |
| GET | `/api/mentor-preferences/has-submitted` | Check if preferences submitted |
| GET | `/api/mentor-preferences/by-group/:groupId` | Get preferences by group |

### Mentor Allocations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mentor-allocations/for-mentor` | Get allocations for current mentor |
| GET | `/api/mentor-allocations/for-group` | Get allocations for current user's group |
| GET | `/api/mentor-allocations/accepted-mentor` | Get accepted mentor for group |
| GET | `/api/mentor-allocations/status` | Get mentor allocation status |
| GET | `/api/mentor-allocations/accepted-teams` | Get accepted teams for mentor |
| POST | `/api/mentor-allocations/:id/accept` | Accept an allocation |
| POST | `/api/mentor-allocations/:id/reject` | Reject an allocation |

## Request Examples

### Signup
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "student@test.com", "password": "password123"}'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@test.com", "password": "password123"}'
```

### Create Profile (with JWT token)
```bash
curl -X POST http://localhost:3001/api/profiles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "John Doe",
    "email": "student@test.com",
    "role": "student",
    "department": "IT",
    "rollNumber": "IT2023001",
    "semester": 5
  }'
```

### Create Group
```bash
curl -X POST http://localhost:3001/api/groups/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Join Group
```bash
curl -X POST http://localhost:3001/api/groups/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"teamCode": "A7DXQ"}'
```

### Rollout Mentor Form (Super Admin only)
```bash
curl -X POST http://localhost:3001/api/mentor-forms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"availableMentorIds": ["mentor-id-1", "mentor-id-2"]}'
```

### Submit Mentor Preferences (Group Leader only)
```bash
curl -X POST http://localhost:3001/api/mentor-preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "formId": "form-id",
    "mentorChoices": ["mentor-id-1", "mentor-id-2", "mentor-id-3"]
  }'
```

## Project Structure

```
server/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── auth/               # Authentication module
│   ├── groups/             # Groups module
│   ├── mentor-allocations/ # Mentor allocations module
│   ├── mentor-forms/       # Mentor forms module
│   ├── mentor-preferences/ # Mentor preferences module
│   ├── prisma/             # Prisma service
│   ├── profiles/           # Profiles module
│   ├── users/              # Users module
│   ├── app.module.ts       # Main app module
│   └── main.ts             # Entry point
├── .env                    # Environment variables
├── package.json
└── tsconfig.json
```

## Database

Using PostgreSQL (Supabase) with Prisma ORM. 

### View/Edit Database

**Option 1: Prisma Studio (Local)**
```bash
npm run db:studio
```
This opens Prisma Studio in your browser.

**Option 2: Supabase Dashboard**
- Go to your Supabase project
- Navigate to Table Editor or SQL Editor
- View and manage your data directly

## Notes

- All protected endpoints require JWT token in Authorization header
- Format: `Authorization: Bearer <token>`
- Tokens expire after 7 days (configurable in .env)
- Super Admin registration requires access code matching department