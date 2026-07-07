# ProjectHub - Complete Documentation

> A comprehensive full-stack platform for managing college projects with mentor allocation, topic approval, and review workflows.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema)
5. [Authentication](#5-authentication)
6. [User Roles & Workflows](#6-user-roles--workflows)
7. [Super Admin Features (Advanced)](#7-super-admin-features-advanced)
8. [API Reference](#8-api-reference)
9. [Frontend Pages](#9-frontend-pages)
10. [Setup Guide](#10-setup-guide)
11. [Test Accounts](#11-test-accounts)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Project Overview

### What is ProjectHub?

ProjectHub is a college project management system designed to streamline:

- **Group Formation**: Students create/join teams (max 3 members)
- **Mentor Allocation**: Students submit preferences, faculty accept/reject
- **Topic Approval**: Students submit project topics, mentors approve via chat
- **Review Workflow**: Structured review phases (R1 → R2 → Final) with progress tracking

### Key Features

| Feature | Description |
|---------|-------------|
| **Role-Based Access** | Different dashboards for Student, Faculty, Super Admin |
| **Department Isolation** | All data scoped to department (IT, CS, ECS, ETC, BM) |
| **Chat Interface** | Real-time discussion threads for topic and review discussions |
| **Review Chaining** | R2 unlocks after R1 complete, Final unlocks after R2 complete |
| **JWT Authentication** | Secure 7-day tokens with automatic refresh |

---

## 2. Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **NestJS** | Server framework with TypeScript |
| **Prisma** | ORM for database operations |
| **PostgreSQL** | Database (via Supabase) |
| **JWT** | Authentication tokens |
| **bcrypt** | Password hashing |
| **class-validator** | Request validation |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router |
| **TypeScript** | Type safety |
| **TailwindCSS** | Styling |
| **Shadcn/UI** | Component library |
| **Lucide React** | Icons |

### Design System
- **Primary Color**: Indigo `#4F46E5`
- **Accent Color**: Amber `#FBBF24`
- **Background**: White `#FFFFFF`
- **Style**: Clean, minimal, academic interface

---

## 3. Architecture

### Project Structure

```
Project-Hub/
├── client/                     # Next.js Frontend
│   ├── app/                    # Pages (App Router)
│   │   ├── auth/               # Login & Signup
│   │   ├── dashboard/          # Role-based dashboards
│   │   └── onboarding/         # Profile creation
│   ├── components/             # Reusable UI components
│   │   ├── attachments-tab.tsx         # File upload UI
│   │   ├── manual-allocation-modal.tsx # Admin allocation
│   │   ├── mentor-overview-panel.tsx   # Admin overview
│   │   └── ...
│   ├── lib/                    # API client, auth context, utilities
│   │   ├── export-utils.ts     # CSV/PDF generation
│   │   └── ...
│   └── types/                  # TypeScript interfaces
│
├── server/                     # NestJS Backend
│   ├── prisma/                 # Database schema & migrations
│   ├── seed-demo-data.sql      # Demo seed data (18 students, 6 teams)
│   └── src/
│       ├── auth/               # Authentication module
│       ├── profiles/           # User profiles
│       ├── groups/             # Team management
│       ├── mentor-forms/       # Form rollout
│       ├── mentor-preferences/ # Student choices
│       ├── mentor-allocations/ # Faculty responses
│       ├── project-topics/     # Topic approval system
│       ├── reviews/            # Review workflow
│       ├── admin/              # Admin features (overview, manual allocation)
│       ├── supabase/           # Supabase client & storage
│       └── attachments/        # File upload handling
│
└── docs/                       # Documentation
```

### Data Flow

```
User Request → API Client (with JWT) → NestJS Controller → Service → Prisma → PostgreSQL
                                                                          ↓
User UI ← React Component ← API Response ← Controller ← Service ← Database Result
```

---

## 4. Database Schema

### Core Models

#### User & Profile
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // bcrypt hashed
  profile   Profile?
}

model Profile {
  id         String     @id
  userId     String     @unique
  name       String
  email      String
  role       Role       // student | faculty | super_admin
  department Department // IT | CS | ECS | ETC | BM
  rollNumber String?    // Students only
  semester   Int?       // Students only
}
```

#### Groups & Members
```prisma
model Group {
  id         String     @id
  groupId    String     @unique  // e.g., "IT01", "CS03"
  teamCode   String     @unique  // e.g., "A7DXQ"
  department Department
  createdBy  String     // Profile ID of leader
  isFull     Boolean    // true when 3 members
  members    GroupMember[]
}

model GroupMember {
  groupId   String
  profileId String
  @@unique([groupId, profileId])
}
```

#### Mentor Allocation
```prisma
model MentorAllocationForm {
  id         String     @id
  department Department
  isActive   Boolean
  createdBy  String     // Super Admin profile ID
  availableMentors AvailableMentor[]
}

model MentorPreference {
  id            String @id
  groupId       String
  formId        String
  mentorChoice1 String // 1st preference mentor ID
  mentorChoice2 String // 2nd preference mentor ID
  mentorChoice3 String // 3rd preference mentor ID
  submittedBy   String // Leader profile ID
  @@unique([groupId, formId])
}

model MentorAllocation {
  id             String           @id
  groupId        String
  mentorId       String
  formId         String
  status         AllocationStatus // pending | accepted | rejected
  preferenceRank Int              // 1, 2, or 3
  @@unique([groupId, mentorId, formId])
}
```

#### Topic Approval
```prisma
model ProjectTopic {
  id          String      @id
  groupId     String
  title       String
  description String
  status      TopicStatus // submitted | under_review | approved | rejected | revision_requested
  submittedBy String
  reviewedBy  String?
  messages    TopicMessage[]
}

model TopicMessage {
  id         String   @id
  topicId    String?  // null for general discussion
  groupId    String
  authorId   String
  authorName String
  authorRole String   // "student" or "faculty"
  content    String
  links      String[]
}
```

#### Review System
```prisma
model ReviewRollout {
  id         String     @id
  department Department
  reviewType ReviewType // review_1 | review_2 | final_review
  isActive   Boolean
  createdBy  String     // Super Admin profile ID
  @@unique([department, reviewType])
}

model ReviewSession {
  id                  String       @id
  groupId             String
  reviewType          ReviewType
  status              ReviewStatus // not_started | in_progress | submitted | feedback_given | completed
  progressPercentage  Int          // 0-100
  progressDescription String
  submittedBy         String
  mentorFeedback      String?
  messages            ReviewMessage[]
  @@unique([groupId, reviewType])
}

model ReviewMessage {
  id         String @id
  sessionId  String
  groupId    String
  authorId   String
  authorName String
  authorRole String
  content    String
  links      String[]
}
```

#### Attachments (Supabase Storage)
```prisma
model Attachment {
  id          String          @id
  groupId     String
  stage       AttachmentStage // topic_approval | review_1 | review_2 | final_review
  filename    String
  fileUrl     String
  fileSize    Int             // Size in bytes
  mimeType    String
  uploadedBy  String          // Profile ID of uploader (must be leader)
  uploadedAt  DateTime
  @@unique([groupId, stage])  // One attachment per stage per group
}
```

### Enums
```prisma
enum Role { student, faculty, super_admin }
enum Department { IT, CS, ECS, ETC, BM }
enum AllocationStatus { pending, accepted, rejected, waiting }
enum TopicStatus { submitted, under_review, approved, rejected, revision_requested }
enum ReviewType { review_1, review_2, final_review }
enum ReviewStatus { not_started, in_progress, submitted, feedback_given, completed }
enum AttachmentStage { topic_approval, review_1, review_2, final_review }
```

---

## 5. Authentication

### JWT Flow

1. **Signup**: Create User → Hash password → Generate JWT
2. **Login**: Verify password → Generate JWT (7-day expiry)
3. **Protected Routes**: JWT in `Authorization: Bearer <token>` header
4. **Token Validation**: Verify signature → Extract userId → Load user

### Frontend Auth

```typescript
// lib/auth-context.tsx manages:
- Token storage in localStorage
- Auto-injection in API requests
- Redirect on 401 responses
- Loading state during auth check

// Protected pages check:
if (authLoading) return <Loading />
if (!user) redirect('/auth/login')
```

### Access Codes (Super Admin)

| Department | Code |
|------------|------|
| IT | `ITADMIN2025` |
| CS | `CSADMIN2025` |
| ECS | `ECSADMIN2025` |
| ETC | `ETCADMIN2025` |
| BM | `BMADMIN2025` |

---

## 6. User Roles & Workflows

### Student Workflow

```
1. Sign Up → Onboarding (profile creation)
2. Create Group OR Join Group (with team code)
3. Wait for Super Admin to roll out mentor allocation form
4. Submit mentor preferences (leader only, 3 choices)
5. Wait for faculty to accept
6. After mentor assigned → Submit project topics (up to 3)
7. Discuss topics with mentor in chat
8. After topic approved → Wait for review rollout
9. Review 1 → Submit progress + discuss → Complete
10. Review 2 → Submit progress + discuss → Complete
11. Final Review → Complete project
```

### Faculty Workflow

```
1. Sign Up → Onboarding (select Faculty role)
2. Wait to be added to mentor allocation form
3. View pending team requests (see preference rank)
4. Accept OR Reject teams
5. For accepted teams:
   - View submitted topics
   - Discuss in chat thread
   - Approve one topic OR request revision
6. During review phases:
   - View student progress submissions
   - Provide feedback in chat
   - Mark reviews as complete
```

### Super Admin Workflow

```
1. Sign Up → Onboarding (use access code)
2. Roll out mentor allocation form:
   - Select available faculty
   - Can include self as mentor
3. Monitor department groups via Mentor Overview panel
4. Manual allocation for groups without mentors
5. Roll out review phases:
   - Review 1, Review 2, Final Review
   - Each activates for entire department
6. Export data as CSV or PDF
7. Can also act as mentor (same as faculty)
```

### Review Chaining Logic

```
Topic Approved?
├─ YES → Review 1 unlocked (if rolled out)
│        │
│        Review 1 Completed?
│        ├─ YES → Review 2 unlocked (if rolled out)
│        │        │
│        │        Review 2 Completed?
│        │        ├─ YES → Final Review unlocked (if rolled out)
│        │        └─ NO → Final Review locked
│        └─ NO → Review 2 locked
└─ NO → All reviews locked
```

---

## 7. Super Admin Features (Advanced)

### 7.1 Mentor & Group Overview Panel

The admin dashboard includes a comprehensive overview panel showing:

- **All mentors** in the department with their assigned groups
- **Group progress** including topic status and review completion
- **Expandable cards** for detailed per-mentor view

**Location**: Admin Dashboard → "Mentor & Group Overview" tab

**API Endpoint**: `GET /api/admin/mentor-overview`

**Response Structure**:
```typescript
interface MentorOverview {
  id: string;
  name: string;
  email: string;
  department: Department;
  role: "faculty" | "super_admin";
  domains: string | null;
  assignedGroups: MentorGroupInfo[];
}

interface MentorGroupInfo {
  id: string;
  groupId: string;           // e.g., "IT01"
  teamCode: string;          // e.g., "A7DXQ"
  leaderName: string;
  memberCount: number;
  topicStatus: TopicStatus | null;
  approvedTopicTitle: string | null;
  review1Status: ReviewStatus | null;
  review1Progress: number | null;
  review2Status: ReviewStatus | null;
  review2Progress: number | null;
  finalReviewStatus: ReviewStatus | null;
  finalReviewProgress: number | null;
}
```

### 7.2 Export Functionality (CSV & PDF)

Super admins can export mentor/group/progress data for reporting.

**Buttons**: Located in admin dashboard toolbar

**Export Utilities**: `client/lib/export-utils.ts`

```typescript
// CSV Export
exportMentorOverviewCSV(mentors: MentorOverview[]): void
// Downloads: mentor_overview_YYYY-MM-DD.csv

// PDF Export  
exportMentorOverviewPDF(mentors: MentorOverview[]): void
// Downloads: mentor_overview_YYYY-MM-DD.pdf
```

**Dependencies**:
- `jspdf` - PDF generation
- `jspdf-autotable` - Table formatting in PDF

### 7.3 Manual Mentor-to-Group Allocation

For groups that haven't been allocated through normal preference flow.

**Use Cases**:
- Late-joining groups
- Groups with rejected preferences
- Direct admin assignment

**API Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/unassigned-groups` | Groups without accepted mentors |
| GET | `/api/admin/available-mentors` | Faculty available for assignment |
| POST | `/api/admin/allocate-mentor` | Create manual allocation |

**Request Body** (POST):
```typescript
{
  groupId: string;   // Group UUID (not groupId like "IT01")
  mentorId: string;  // Mentor profile UUID
}
```

**UI Component**: `ManualAllocationModal`
- Step 1: Select unassigned group
- Step 2: Select mentor from available list
- Step 3: Confirm allocation

### 7.4 File Attachments (Supabase Storage)

Students can upload files for each review stage. Only the **group leader** can upload.

**Stages**:
- Topic Approval
- Review 1
- Review 2
- Final Review

**Constraints**:
- Max file size: **5 MB**
- One file per stage per group
- Allowed types: PDF, Word, PowerPoint, Excel, images, ZIP, RAR, TXT

**API Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attachments/upload` | Upload file (multipart/form-data) |
| GET | `/api/attachments/group/:groupId` | List group attachments |
| DELETE | `/api/attachments/:id` | Delete attachment |

**Upload Request**:
```typescript
// FormData with:
// - file: File
// - groupId: string
// - stage: "topic_approval" | "review_1" | "review_2" | "final_review"
```

**Backend Modules**:
- `server/src/supabase/` - Supabase client and storage operations
- `server/src/attachments/` - Attachment controller and service

**Environment Variables** (server/.env):
```env
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_STORAGE_BUCKET="project-attachments"
```

**Supabase Setup**:
1. Create bucket named `project-attachments`
2. Set bucket to Public (or configure RLS)
3. Add environment variables to server

**UI Component**: `AttachmentsTab` in project-progress page
- Shows upload slots for each stage
- Displays existing attachments with download links
- Leader-only upload restriction enforced both frontend and backend

---

## 8. API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new user |
| POST | `/api/auth/login` | Login and get token |
| GET | `/api/auth/me` | Get current user |

### Profile Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/profiles` | Create profile |
| GET | `/api/profiles/me` | Get my profile |
| GET | `/api/profiles/faculty/:department` | List faculty in department |

### Group Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups/create` | Create new group |
| POST | `/api/groups/join` | Join existing group |
| GET | `/api/groups/my-group` | Get my group |
| GET | `/api/groups/with-details/:department` | Get all groups with member details |

### Mentor Form Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mentor-forms` | Create/rollout form |
| GET | `/api/mentor-forms/active` | Get active form |

### Mentor Preference Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mentor-preferences` | Submit preferences |
| GET | `/api/mentor-preferences/my-preferences` | Get my preferences |

### Mentor Allocation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mentor-allocations/for-mentor` | Get requests for mentor |
| GET | `/api/mentor-allocations/for-mentor/accepted` | Get accepted allocations |
| POST | `/api/mentor-allocations/:id/accept` | Accept team request |
| POST | `/api/mentor-allocations/:id/reject` | Reject team request |

### Topic Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/project-topics` | Submit new topic |
| GET | `/api/project-topics/group/:groupId` | Get topics for group |
| GET | `/api/project-topics/messages/group/:groupId` | Get messages for group |
| POST | `/api/project-topics/messages` | Send message |
| POST | `/api/project-topics/:id/status` | Update topic status |

### Review Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reviews/rollout` | Roll out review phase |
| GET | `/api/reviews/rollouts/:department` | Get rollouts for department |
| POST | `/api/reviews/session` | Create/submit review |
| GET | `/api/reviews/session/:reviewType/group/:groupId` | Get session by group |
| POST | `/api/reviews/session/:id/status` | Update session status |
| POST | `/api/reviews/messages` | Send review message |

### Admin Endpoints (Super Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/mentor-overview` | Get all mentors with groups and progress |
| GET | `/api/admin/unassigned-groups` | Get groups without accepted mentors |
| GET | `/api/admin/available-mentors` | Get available mentors for allocation |
| POST | `/api/admin/allocate-mentor` | Manually assign mentor to group |

**Manual Allocation Request Body**:
```json
{
  "groupId": "uuid-of-group",
  "mentorId": "uuid-of-mentor-profile"
}
```

### Attachment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attachments/upload` | Upload file (multipart/form-data, leader only) |
| GET | `/api/attachments/group/:groupId` | List attachments for group |
| DELETE | `/api/attachments/:id` | Delete attachment (leader only) |

**Upload Request** (multipart/form-data):
- `file`: File (max 5MB)
- `groupId`: string (UUID)
- `stage`: "topic_approval" | "review_1" | "review_2" | "final_review"

---

## 9. Frontend Pages

### Public Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/auth/login` | Login form |
| `/auth/signup` | Signup form |

### Protected Pages

| Route | Role | Description |
|-------|------|-------------|
| `/onboarding` | All | Profile creation |
| `/dashboard` | All | Role-based redirect |
| `/dashboard/student` | Student | Student dashboard |
| `/dashboard/student/project-progress` | Student | Topic, reviews & attachments interface |
| `/dashboard/faculty` | Faculty | Mentor dashboard |
| `/dashboard/admin` | Super Admin | Admin dashboard with overview & exports |

### Components

| Component | Purpose |
|-----------|---------|
| `DashboardLayout` | Common layout with header |
| `ThreadPanel` | Reusable chat interface |
| `TopicApprovalSection` | Topic submission & approval |
| `ReviewSection` | Review progress & feedback |
| `AttachmentsTab` | File upload per review stage |
| `MentorOverviewPanel` | Admin mentor/group overview |
| `ManualAllocationModal` | Admin manual mentor assignment |

---

## 10. Setup Guide

### Prerequisites

- Node.js v18+
- Supabase account (free tier works)
- npm or yarn

### Backend Setup

```bash
# 1. Navigate to server
cd server

# 2. Install dependencies
npm install

# 3. Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"
DIRECT_URL="postgresql://postgres:[password]@[host]:5432/postgres"
JWT_SECRET="your-secret-key-min-32-chars"
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_STORAGE_BUCKET="project-attachments"
EOF

# 4. Initialize database
npx prisma generate
npx prisma db push

# 5. Create Supabase Storage bucket
# Go to Supabase Dashboard → Storage → Create bucket "project-attachments"

# 6. (Optional) Seed demo data
# Run in Supabase SQL Editor: server/seed-demo-data.sql

# 7. Start server
npm run start:dev
# Server runs on http://localhost:3001
```

### Frontend Setup

```bash
# 1. Navigate to client
cd client

# 2. Install dependencies
npm install

# 3. Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local

# 4. Start development server
npm run dev
# App runs on http://localhost:3000
```

### Database Commands

```bash
# View database GUI
npm run db:studio  # Opens http://localhost:5555

# Reset database
npx prisma db push --force-reset

# Generate Prisma client
npx prisma generate
```

---

## 11. Test Accounts

### Seed Data Overview

The seed script (`server/seed-demo-data.sql`) creates:
- **6 Teams** (IT01-IT06) with 3 students each (18 students total)
- **3 Faculty** mentors
- **1 Super Admin**
- **4 teams** (IT01-IT04) have **ACCEPTED** mentor allocations
- **2 teams** (IT05-IT06) have **NO mentor** (for testing manual allocation)
- **3 groups** with project topics (approved, approved, submitted)
- **1 review rollout** (Review 1 active)
- **2 review sessions** (IT01 completed 85%, IT02 in progress 60%)
- **Sample attachments** for IT01 and IT02

### Login Credentials

All passwords: `password`

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@gmail.com` | `password` |
| Faculty 1 | `faculty1@gmail.com` | `password` |
| Faculty 2 | `faculty2@gmail.com` | `password` |
| Faculty 3 | `faculty3@gmail.com` | `password` |
| Students 1-18 | `student1@gmail.com` ... `student18@gmail.com` | `password` |

### Team Assignments

| Team | Leader | Members | Mentor | Status |
|------|--------|---------|--------|--------|
| IT01 | student1 (Arkan) | student2, student3 | Prof. Rasika Ransing | ✅ Allocated |
| IT02 | student4 (Om) | student5, student6 | Prof. Neha Kudu | ✅ Allocated |
| IT03 | student7 (Pratik) | student8, student9 | Prof. Vinita Bhandiwad | ✅ Allocated |
| IT04 | student10 (Jack) | student11, student12 | Prof. Kanchan Dhuri | ✅ Allocated |
| IT05 | student13 (Maya) | student14, student15 | - | ⚠️ No Mentor |
| IT06 | student16 (Vikram) | student17, student18 | - | ⚠️ No Mentor |

### Project Progress

| Team | Topic Status | Review 1 | Review 2 | Final |
|------|-------------|----------|----------|-------|
| IT01 | ✅ Approved | ✅ 85% | 🔒 Locked | 🔒 Locked |
| IT02 | ✅ Approved | ⏳ 60% | 🔒 Locked | 🔒 Locked |
| IT03 | 📝 Submitted | 🔒 Locked | 🔒 Locked | 🔒 Locked |
| IT04 | ❌ Not Submitted | 🔒 Locked | 🔒 Locked | 🔒 Locked |

### Testing New Features

#### 1. Mentor Overview & Export
```
1. Login: superadmin@gmail.com / password
2. Go to Admin Dashboard → "Mentor & Group Overview" tab
3. View all 4 mentors with their groups and progress
4. Click "Export CSV" or "Export PDF"
```

#### 2. Manual Allocation
```
1. In Admin Dashboard, click "Manual Allocation" button
2. Badge shows "2" (IT05, IT06 unassigned)
3. Select IT05 or IT06
4. Choose a mentor (e.g., faculty1)
5. Confirm allocation
```

#### 3. File Attachments
```
1. Login: student1@gmail.com / password (IT01 leader)
2. Go to Dashboard → Project Progress → Attachments tab
3. See existing attachments from seed data
4. Upload a file (≤5MB) to test
5. Login as student2 (non-leader) → Cannot upload
```

---

## 12. Troubleshooting

### Common Issues

#### "User goes to login screen on reload"
**Cause**: Auth context loading state not handled  
**Solution**: All dashboard pages should check `authLoading` before redirecting

```typescript
if (authLoading) return <Loading />
if (!user) redirect('/auth/login')
```

#### "Faculty can't see student topics"
**Cause**: Using localStorage instead of API  
**Solution**: Faculty dashboard uses:
- `mentorAllocationApi.getAcceptedAllocations()`
- `projectTopicsApi.getTopicsByGroupId(groupId)`

#### "Review session not found"
**Cause**: Session endpoint requires specific group lookup  
**Solution**: Use `reviewsApi.getSessionByGroupId(reviewType, groupId)`

#### "Property groupId should not exist"
**Cause**: DTO change not picked up  
**Solution**: Restart backend server after DTO changes

#### Token expired / 401 errors
**Cause**: JWT expired or invalid  
**Solution**: api-client.ts automatically clears token on 401

#### "File upload fails"
**Cause**: Supabase not configured or bucket doesn't exist  
**Solution**: 
1. Create bucket `project-attachments` in Supabase Storage
2. Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET to server/.env
3. Restart backend server

#### "Attachment upload: Only leader can upload"
**Cause**: Not the group leader  
**Solution**: Only the user who created the group can upload files

#### "Manual allocation validation errors"
**Cause**: class-validator decorators not loaded  
**Solution**: Restart backend server after DTO changes

### Debug Commands

```bash
# Check backend logs
cd server && npm run start:dev

# Check database
npx prisma studio

# Reset everything and reseed
npx prisma db push --force-reset
# Then run seed-demo-data.sql in Supabase SQL Editor
```

### API Testing

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@gmail.com","password":"password"}'

# Use token
curl http://localhost:3001/api/profiles/me \
  -H "Authorization: Bearer <token>"

# Upload attachment (multipart)
curl -X POST http://localhost:3001/api/attachments/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf" \
  -F "groupId=<group-uuid>" \
  -F "stage=topic_approval"
```

---

## Quick Reference

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="min-32-character-secret"
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_STORAGE_BUCKET="project-attachments"
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Key URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |
| Prisma Studio | http://localhost:5555 |
| Supabase Dashboard | https://supabase.com/dashboard |

---

*Last updated: March 2026*
