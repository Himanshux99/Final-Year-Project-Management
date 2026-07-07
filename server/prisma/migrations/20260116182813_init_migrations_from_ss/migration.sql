-- CreateEnum
CREATE TYPE "Role" AS ENUM ('student', 'faculty', 'super_admin');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('IT', 'CS', 'ECS', 'ETC', 'BM');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "department" "Department" NOT NULL,
    "rollNumber" TEXT,
    "semester" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamCode" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "isFull" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorAllocationForm" (
    "id" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorAllocationForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailableMentor" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,

    CONSTRAINT "AvailableMentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorPreference" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "mentorChoice1" TEXT NOT NULL,
    "mentorChoice2" TEXT NOT NULL,
    "mentorChoice3" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorAllocation" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "status" "AllocationStatus" NOT NULL DEFAULT 'pending',
    "preferenceRank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupCounter" (
    "id" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GroupCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_groupId_key" ON "Group"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_teamCode_key" ON "Group"("teamCode");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_profileId_key" ON "GroupMember"("groupId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "AvailableMentor_formId_mentorId_key" ON "AvailableMentor"("formId", "mentorId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorPreference_groupId_formId_key" ON "MentorPreference"("groupId", "formId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorAllocation_groupId_mentorId_formId_key" ON "MentorAllocation"("groupId", "mentorId", "formId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCounter_department_key" ON "GroupCounter"("department");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorAllocationForm" ADD CONSTRAINT "MentorAllocationForm_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailableMentor" ADD CONSTRAINT "AvailableMentor_formId_fkey" FOREIGN KEY ("formId") REFERENCES "MentorAllocationForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailableMentor" ADD CONSTRAINT "AvailableMentor_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorPreference" ADD CONSTRAINT "MentorPreference_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorPreference" ADD CONSTRAINT "MentorPreference_formId_fkey" FOREIGN KEY ("formId") REFERENCES "MentorAllocationForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorPreference" ADD CONSTRAINT "MentorPreference_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorAllocation" ADD CONSTRAINT "MentorAllocation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorAllocation" ADD CONSTRAINT "MentorAllocation_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorAllocation" ADD CONSTRAINT "MentorAllocation_formId_fkey" FOREIGN KEY ("formId") REFERENCES "MentorAllocationForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
