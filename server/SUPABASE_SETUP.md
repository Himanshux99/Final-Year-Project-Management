# Supabase Setup Guide

This guide will help you set up Supabase as the database backend for ProjectHub.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click **"New Project"**
4. Fill in the details:
   - **Name**: ProjectHub (or any name you prefer)
   - **Database Password**: Create a strong password and **save it** (you'll need this)
   - **Region**: Choose the closest region to you
   - **Pricing Plan**: Free tier is sufficient
5. Click **"Create new project"**
6. Wait for the database to be provisioned (takes 1-2 minutes)

## Step 2: Get Your Database Connection String

1. In your Supabase project dashboard, go to:
   - **Settings** (gear icon in sidebar)
   - **Database**
   - Scroll to **Connection String**
2. Select **URI** tab
3. Copy the connection string (it looks like):
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with the database password you created in Step 1

## Step 3: Configure Your Backend

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` file and update `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
   JWT_SECRET="projecthub-jwt-secret-key-2025"
   JWT_EXPIRATION="7d"
   PORT=3001
   ```

## Step 4: Initialize Database

1. Generate Prisma Client:
   ```bash
   npm run db:generate
   ```

2. Push the database schema to Supabase:
   ```bash
   npm run db:push
   ```
   
   This will create all the necessary tables in your Supabase database.

3. Verify in Supabase Dashboard:
   - Go to **Table Editor** in Supabase dashboard
   - You should see all the tables: `User`, `Profile`, `Group`, `GroupMember`, etc.

## Step 5: Start the Server

```bash
npm run start:dev
```

The server should start successfully on `http://localhost:3001`

## Troubleshooting

### Connection Refused Error
- Make sure you're using the correct connection string format
- Check that you replaced `[YOUR-PASSWORD]` with your actual password
- Verify your IP is not blocked (Supabase allows all IPs by default)

### SSL/TLS Errors
If you get SSL errors, try adding `?sslmode=require` to your DATABASE_URL:
```
DATABASE_URL="postgresql://...?sslmode=require"
```

### Connection Pool Issues
The connection string uses connection pooling by default. If you need direct connection:
- Go to Database settings in Supabase
- Use the **Session mode** connection string instead of **Transaction mode**

## Viewing Your Data

### Option 1: Supabase Dashboard
- Go to **Table Editor** in your Supabase project
- Browse and edit data directly in the browser

### Option 2: Prisma Studio
```bash
npm run db:studio
```
Opens a local GUI at `http://localhost:5555`

## Security Notes

- **Never commit `.env` file** to version control
- Keep your database password secure
- The `.env` file is already in `.gitignore`
- For production, use environment variables in your hosting platform

## Database Schema Overview

The backend uses the following tables:

- **User** - Authentication (email, password)
- **Profile** - User profiles with roles (student, faculty, super_admin)
- **Group** - Student groups/teams
- **GroupMember** - Group membership (many-to-many)
- **MentorAllocationForm** - Forms created by super admins
- **AvailableMentor** - Mentors available for selection
- **MentorPreference** - Student group's mentor preferences
- **MentorAllocation** - Mentor-group allocation status
- **GroupCounter** - Auto-incrementing group IDs per department

All relationships and constraints are handled by Prisma automatically.

## Next Steps

Once the database is set up:

1. Test the API endpoints using the examples in [README.md](./README.md)
2. Connect your frontend to the backend API
3. Create test users and verify the flow
