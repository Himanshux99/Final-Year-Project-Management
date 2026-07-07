/**
 * localStorage abstraction layer
 * This makes it easy to swap with Supabase later
 */

import {
  User,
  Profile,
  Group,
  MentorAllocationForm,
  MentorPreference,
  MentorAllocation,
  Department,
  ProjectTopic,
  TopicMessage,
  TopicStatus,
  ReviewRollout,
  ReviewSession,
  ReviewMessage,
  ReviewType,
  ReviewStatus,
  TeamProgress,
} from "@/types";

// Storage keys
const KEYS = {
  USERS: "projecthub_users",
  PROFILES: "projecthub_profiles",
  GROUPS: "projecthub_groups",
  MENTOR_FORMS: "projecthub_mentor_forms",
  MENTOR_PREFERENCES: "projecthub_mentor_preferences",
  MENTOR_ALLOCATIONS: "projecthub_mentor_allocations",
  CURRENT_USER: "projecthub_current_user",
  GROUP_COUNTERS: "projecthub_group_counters",
  // Topic Approval
  PROJECT_TOPICS: "projecthub_project_topics",
  TOPIC_MESSAGES: "projecthub_topic_messages",
  // Reviews
  REVIEW_ROLLOUTS: "projecthub_review_rollouts",
  REVIEW_SESSIONS: "projecthub_review_sessions",
  REVIEW_MESSAGES: "projecthub_review_messages",
};

// Helper to generate IDs
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to generate group serial number
const getNextGroupSerial = (department: Department): number => {
  const counters = JSON.parse(
    localStorage.getItem(KEYS.GROUP_COUNTERS) || "{}"
  ) as Record<Department, number>;
  const current = counters[department] || 0;
  const next = current + 1;
  counters[department] = next;
  localStorage.setItem(KEYS.GROUP_COUNTERS, JSON.stringify(counters));
  return next;
};

// Helper to generate team code
export const generateTeamCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ============ USER & AUTH ============

export const createUser = (email: string, password: string): User => {
  const users = JSON.parse(localStorage.getItem(KEYS.USERS) || "[]") as User[];

  // Check if user exists
  if (users.find((u) => u.email === email)) {
    throw new Error("User already exists");
  }

  const user: User = {
    id: generateId(),
    email,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));

  // Store password separately (in real app, this would be hashed)
  const passwords = JSON.parse(
    localStorage.getItem("projecthub_passwords") || "{}"
  );
  passwords[user.email] = password;
  localStorage.setItem("projecthub_passwords", JSON.stringify(passwords));

  return user;
};

export const loginUser = (email: string, password: string): User => {
  const users = JSON.parse(localStorage.getItem(KEYS.USERS) || "[]") as User[];
  const passwords = JSON.parse(
    localStorage.getItem("projecthub_passwords") || "{}"
  );

  const user = users.find((u) => u.email === email);
  if (!user || passwords[email] !== password) {
    throw new Error("Invalid credentials");
  }

  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  return user;
};

export const getCurrentUser = (): User | null => {
  const user = localStorage.getItem(KEYS.CURRENT_USER);
  return user ? JSON.parse(user) : null;
};

export const logoutUser = () => {
  localStorage.removeItem(KEYS.CURRENT_USER);
};

// ============ PROFILE ============

export const createProfile = (
  profileData: Omit<Profile, "id" | "createdAt">
): Profile => {
  const profiles = JSON.parse(
    localStorage.getItem(KEYS.PROFILES) || "[]"
  ) as Profile[];

  const profile: Profile = {
    ...profileData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  profiles.push(profile);
  localStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles));

  return profile;
};

export const getProfileByUserId = (userId: string): Profile | null => {
  const profiles = JSON.parse(
    localStorage.getItem(KEYS.PROFILES) || "[]"
  ) as Profile[];
  return profiles.find((p) => p.userId === userId) || null;
};

export const getProfileById = (profileId: string): Profile | null => {
  const profiles = JSON.parse(
    localStorage.getItem(KEYS.PROFILES) || "[]"
  ) as Profile[];
  return profiles.find((p) => p.id === profileId) || null;
};

export const getProfilesByRole = (role: string): Profile[] => {
  const profiles = JSON.parse(
    localStorage.getItem(KEYS.PROFILES) || "[]"
  ) as Profile[];
  return profiles.filter((p) => p.role === role);
};

export const getProfilesByDepartment = (department: Department): Profile[] => {
  const profiles = JSON.parse(
    localStorage.getItem(KEYS.PROFILES) || "[]"
  ) as Profile[];
  return profiles.filter((p) => p.department === department);
};

export const getFacultyByDepartment = (department: Department): Profile[] => {
  return getProfilesByDepartment(department).filter(
    (p) => p.role === "faculty" || p.role === "super_admin"
  );
};

// ============ GROUP ============

export const createGroup = (
  createdBy: string,
  department: Department
): Group => {
  const groups = JSON.parse(
    localStorage.getItem(KEYS.GROUPS) || "[]"
  ) as Group[];

  const serial = getNextGroupSerial(department);
  const groupId = `${department}${serial.toString().padStart(2, "0")}`;

  const group: Group = {
    id: generateId(),
    groupId,
    teamCode: generateTeamCode(),
    department,
    createdBy,
    members: [createdBy],
    isFull: false,
    createdAt: new Date().toISOString(),
  };

  groups.push(group);
  localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));

  return group;
};

export const getGroupByTeamCode = (teamCode: string): Group | null => {
  const groups = JSON.parse(
    localStorage.getItem(KEYS.GROUPS) || "[]"
  ) as Group[];
  return groups.find((g) => g.teamCode === teamCode) || null;
};

export const getGroupByMemberId = (memberId: string): Group | null => {
  const groups = JSON.parse(
    localStorage.getItem(KEYS.GROUPS) || "[]"
  ) as Group[];
  return groups.find((g) => g.members.includes(memberId)) || null;
};

export const joinGroup = (teamCode: string, memberId: string): Group => {
  const groups = JSON.parse(
    localStorage.getItem(KEYS.GROUPS) || "[]"
  ) as Group[];

  const groupIndex = groups.findIndex((g) => g.teamCode === teamCode);
  if (groupIndex === -1) {
    throw new Error("Group not found");
  }

  const group = groups[groupIndex];

  if (group.members.includes(memberId)) {
    throw new Error("Already a member of this group");
  }

  if (group.members.length >= 3) {
    throw new Error("Group is full (max 3 members)");
  }

  group.members.push(memberId);
  group.isFull = group.members.length >= 3;

  localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));

  return group;
};

export const getGroupsByDepartment = (department: Department): Group[] => {
  const groups = JSON.parse(
    localStorage.getItem(KEYS.GROUPS) || "[]"
  ) as Group[];
  return groups.filter((g) => g.department === department);
};

// ============ MENTOR ALLOCATION FORM ============

export const createMentorAllocationForm = (
  department: Department,
  createdBy: string,
  availableMentors: string[]
): MentorAllocationForm => {
  const forms = JSON.parse(
    localStorage.getItem(KEYS.MENTOR_FORMS) || "[]"
  ) as MentorAllocationForm[];

  // Deactivate any existing active forms for this department
  forms.forEach((f) => {
    if (f.department === department && f.isActive) {
      f.isActive = false;
    }
  });

  const form: MentorAllocationForm = {
    id: generateId(),
    department,
    isActive: true,
    createdBy,
    availableMentors,
    createdAt: new Date().toISOString(),
  };

  forms.push(form);
  localStorage.setItem(KEYS.MENTOR_FORMS, JSON.stringify(forms));

  return form;
};

export const getActiveMentorForm = (
  department: Department
): MentorAllocationForm | null => {
  const forms = JSON.parse(
    localStorage.getItem(KEYS.MENTOR_FORMS) || "[]"
  ) as MentorAllocationForm[];
  return forms.find((f) => f.department === department && f.isActive) || null;
};

// ============ MENTOR PREFERENCES ============

export const submitMentorPreferences = (
  groupId: string,
  formId: string,
  mentorChoices: [string, string, string],
  submittedBy: string
): MentorPreference => {
  const preferences = JSON.parse(
    localStorage.getItem(KEYS.MENTOR_PREFERENCES) || "[]"
  ) as MentorPreference[];

  // Check if preferences already submitted
  if (preferences.find((p) => p.groupId === groupId && p.formId === formId)) {
    throw new Error("Preferences already submitted for this group");
  }

  const preference: MentorPreference = {
    id: generateId(),
    groupId,
    formId,
    mentorChoices,
    submittedBy,
    submittedAt: new Date().toISOString(),
  };

  preferences.push(preference);
  localStorage.setItem(KEYS.MENTOR_PREFERENCES, JSON.stringify(preferences));

  // Create pending allocations for each mentor choice
  const allocations = JSON.parse(
    localStorage.getItem(KEYS.MENTOR_ALLOCATIONS) || "[]"
  ) as MentorAllocation[];

  mentorChoices.forEach((mentorId, index) => {
    const allocation: MentorAllocation = {
      id: generateId(),
      groupId,
      mentorId,
      formId,
      status: "pending",
      preferenceRank: index + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    allocations.push(allocation);
  });

  localStorage.setItem(KEYS.MENTOR_ALLOCATIONS, JSON.stringify(allocations));

  return preference;
};

export const getMentorPreferenceByGroup = (
  groupId: string
): MentorPreference | null => {
  const preferences = JSON.parse(
    localStorage.getItem(KEYS.MENTOR_PREFERENCES) || "[]"
  ) as MentorPreference[];
  return preferences.find((p) => p.groupId === groupId) || null;
};

// ============ MENTOR ALLOCATIONS ============

export const getAllocationsForMentor = (
  mentorId: string
): MentorAllocation[] => {
  const allocations = JSON.parse(
    localStorage.getItem(KEYS.MENTOR_ALLOCATIONS) || "[]"
  ) as MentorAllocation[];
  return allocations.filter((a) => a.mentorId === mentorId);
};

export const getAllocationsForGroup = (groupId: string): MentorAllocation[] => {
  const allocations = JSON.parse(
    localStorage.getItem(KEYS.MENTOR_ALLOCATIONS) || "[]"
  ) as MentorAllocation[];
  return allocations.filter((a) => a.groupId === groupId);
};

export const acceptMentorAllocation = (allocationId: string): void => {
  const allocations = JSON.parse(
    localStorage.getItem(KEYS.MENTOR_ALLOCATIONS) || "[]"
  ) as MentorAllocation[];

  const index = allocations.findIndex((a) => a.id === allocationId);
  if (index === -1) {
    throw new Error("Allocation not found");
  }

  const allocation = allocations[index];
  allocation.status = "accepted";
  allocation.updatedAt = new Date().toISOString();

  // Reject all other allocations for this group
  allocations.forEach((a) => {
    if (a.groupId === allocation.groupId && a.id !== allocationId) {
      a.status = "rejected";
      a.updatedAt = new Date().toISOString();
    }
  });

  localStorage.setItem(KEYS.MENTOR_ALLOCATIONS, JSON.stringify(allocations));
};

export const rejectMentorAllocation = (allocationId: string): void => {
  const allocations = JSON.parse(
    localStorage.getItem(KEYS.MENTOR_ALLOCATIONS) || "[]"
  ) as MentorAllocation[];

  const index = allocations.findIndex((a) => a.id === allocationId);
  if (index === -1) {
    throw new Error("Allocation not found");
  }

  allocations[index].status = "rejected";
  allocations[index].updatedAt = new Date().toISOString();

  localStorage.setItem(KEYS.MENTOR_ALLOCATIONS, JSON.stringify(allocations));
};

// ============ PROJECT TOPICS ============

export const createTopic = (
  groupId: string,
  title: string,
  description: string,
  submittedBy: string
): ProjectTopic => {
  const topics = JSON.parse(
    localStorage.getItem(KEYS.PROJECT_TOPICS) || "[]"
  ) as ProjectTopic[];

  const topic: ProjectTopic = {
    id: generateId(),
    groupId,
    title,
    description,
    status: "submitted",
    submittedBy,
    submittedAt: new Date().toISOString(),
  };

  topics.push(topic);
  localStorage.setItem(KEYS.PROJECT_TOPICS, JSON.stringify(topics));

  return topic;
};

export const getTopicsByGroup = (groupId: string): ProjectTopic[] => {
  const topics = JSON.parse(
    localStorage.getItem(KEYS.PROJECT_TOPICS) || "[]"
  ) as ProjectTopic[];
  return topics.filter((t) => t.groupId === groupId);
};

export const getTopicById = (topicId: string): ProjectTopic | null => {
  const topics = JSON.parse(
    localStorage.getItem(KEYS.PROJECT_TOPICS) || "[]"
  ) as ProjectTopic[];
  return topics.find((t) => t.id === topicId) || null;
};

export const updateTopicStatus = (
  topicId: string,
  status: TopicStatus,
  reviewedBy?: string
): ProjectTopic | null => {
  const topics = JSON.parse(
    localStorage.getItem(KEYS.PROJECT_TOPICS) || "[]"
  ) as ProjectTopic[];

  const index = topics.findIndex((t) => t.id === topicId);
  if (index === -1) return null;

  topics[index].status = status;
  if (reviewedBy) {
    topics[index].reviewedBy = reviewedBy;
    topics[index].reviewedAt = new Date().toISOString();
  }

  localStorage.setItem(KEYS.PROJECT_TOPICS, JSON.stringify(topics));
  return topics[index];
};

export const approveTopic = (topicId: string, mentorId: string): void => {
  const topics = JSON.parse(
    localStorage.getItem(KEYS.PROJECT_TOPICS) || "[]"
  ) as ProjectTopic[];

  const topicIndex = topics.findIndex((t) => t.id === topicId);
  if (topicIndex === -1) throw new Error("Topic not found");

  const groupId = topics[topicIndex].groupId;

  // Approve this topic
  topics[topicIndex].status = "approved";
  topics[topicIndex].reviewedBy = mentorId;
  topics[topicIndex].reviewedAt = new Date().toISOString();

  // Reject all other topics for this group
  topics.forEach((t, i) => {
    if (t.groupId === groupId && i !== topicIndex && t.status !== "rejected") {
      t.status = "rejected";
      t.reviewedBy = mentorId;
      t.reviewedAt = new Date().toISOString();
    }
  });

  localStorage.setItem(KEYS.PROJECT_TOPICS, JSON.stringify(topics));
};

export const rejectTopic = (topicId: string, mentorId: string): void => {
  updateTopicStatus(topicId, "rejected", mentorId);
};

export const requestTopicRevision = (
  topicId: string,
  mentorId: string,
  feedback: string
): void => {
  updateTopicStatus(topicId, "revision_requested", mentorId);
  
  // Add the feedback as a message
  const topic = getTopicById(topicId);
  if (topic) {
    const mentor = getProfileById(mentorId);
    addTopicMessage(
      topicId,
      topic.groupId,
      mentorId,
      mentor?.name || "Mentor",
      `**Revision Requested:** ${feedback}`,
      "faculty"
    );
  }
};

// ============ TOPIC MESSAGES ============

export const addTopicMessage = (
  topicId: string,
  groupId: string,
  authorId: string,
  authorName: string,
  content: string,
  authorRole: "student" | "faculty",
  links?: string[]
): TopicMessage => {
  const messages = JSON.parse(
    localStorage.getItem(KEYS.TOPIC_MESSAGES) || "[]"
  ) as TopicMessage[];

  const message: TopicMessage = {
    id: generateId(),
    topicId,
    groupId,
    authorId,
    authorName,
    authorRole,
    content,
    links,
    createdAt: new Date().toISOString(),
  };

  messages.push(message);
  localStorage.setItem(KEYS.TOPIC_MESSAGES, JSON.stringify(messages));

  return message;
};

export const getTopicMessagesByGroup = (groupId: string): TopicMessage[] => {
  const messages = JSON.parse(
    localStorage.getItem(KEYS.TOPIC_MESSAGES) || "[]"
  ) as TopicMessage[];
  return messages
    .filter((m) => m.groupId === groupId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
};

// ============ REVIEW ROLLOUTS ============

export const rolloutReview = (
  department: Department,
  reviewType: ReviewType,
  createdBy: string
): ReviewRollout => {
  const rollouts = JSON.parse(
    localStorage.getItem(KEYS.REVIEW_ROLLOUTS) || "[]"
  ) as ReviewRollout[];

  // Check if already rolled out
  const existing = rollouts.find(
    (r) => r.department === department && r.reviewType === reviewType
  );
  if (existing) {
    throw new Error(`${reviewType} already rolled out for ${department}`);
  }

  const rollout: ReviewRollout = {
    id: generateId(),
    department,
    reviewType,
    isActive: true,
    createdBy,
    createdAt: new Date().toISOString(),
  };

  rollouts.push(rollout);
  localStorage.setItem(KEYS.REVIEW_ROLLOUTS, JSON.stringify(rollouts));

  return rollout;
};

export const getReviewRollout = (
  department: Department,
  reviewType: ReviewType
): ReviewRollout | null => {
  const rollouts = JSON.parse(
    localStorage.getItem(KEYS.REVIEW_ROLLOUTS) || "[]"
  ) as ReviewRollout[];
  return (
    rollouts.find(
      (r) =>
        r.department === department &&
        r.reviewType === reviewType &&
        r.isActive
    ) || null
  );
};

export const getReviewRolloutsByDepartment = (
  department: Department
): ReviewRollout[] => {
  const rollouts = JSON.parse(
    localStorage.getItem(KEYS.REVIEW_ROLLOUTS) || "[]"
  ) as ReviewRollout[];
  return rollouts.filter((r) => r.department === department && r.isActive);
};

// ============ REVIEW SESSIONS ============

export const createReviewSession = (
  groupId: string,
  reviewType: ReviewType,
  progressPercentage: number,
  progressDescription: string,
  submittedBy: string
): ReviewSession => {
  const sessions = JSON.parse(
    localStorage.getItem(KEYS.REVIEW_SESSIONS) || "[]"
  ) as ReviewSession[];

  // Check if session already exists
  const existing = sessions.find(
    (s) => s.groupId === groupId && s.reviewType === reviewType
  );
  if (existing) {
    throw new Error("Review session already exists");
  }

  const session: ReviewSession = {
    id: generateId(),
    groupId,
    reviewType,
    status: "submitted",
    progressPercentage,
    progressDescription,
    submittedBy,
    submittedAt: new Date().toISOString(),
  };

  sessions.push(session);
  localStorage.setItem(KEYS.REVIEW_SESSIONS, JSON.stringify(sessions));

  return session;
};

export const getReviewSession = (
  groupId: string,
  reviewType: ReviewType
): ReviewSession | null => {
  const sessions = JSON.parse(
    localStorage.getItem(KEYS.REVIEW_SESSIONS) || "[]"
  ) as ReviewSession[];
  return (
    sessions.find(
      (s) => s.groupId === groupId && s.reviewType === reviewType
    ) || null
  );
};

export const getReviewSessionsByGroup = (groupId: string): ReviewSession[] => {
  const sessions = JSON.parse(
    localStorage.getItem(KEYS.REVIEW_SESSIONS) || "[]"
  ) as ReviewSession[];
  return sessions.filter((s) => s.groupId === groupId);
};

export const updateReviewSession = (
  sessionId: string,
  updates: Partial<
    Pick<
      ReviewSession,
      | "progressPercentage"
      | "progressDescription"
      | "status"
      | "mentorFeedback"
      | "feedbackGivenBy"
      | "feedbackGivenAt"
    >
  >
): ReviewSession | null => {
  const sessions = JSON.parse(
    localStorage.getItem(KEYS.REVIEW_SESSIONS) || "[]"
  ) as ReviewSession[];

  const index = sessions.findIndex((s) => s.id === sessionId);
  if (index === -1) return null;

  sessions[index] = {
    ...sessions[index],
    ...updates,
    submittedAt: new Date().toISOString(),
  };

  localStorage.setItem(KEYS.REVIEW_SESSIONS, JSON.stringify(sessions));
  return sessions[index];
};

export const addReviewFeedback = (
  sessionId: string,
  feedback: string,
  mentorId: string
): ReviewSession | null => {
  return updateReviewSession(sessionId, {
    mentorFeedback: feedback,
    feedbackGivenBy: mentorId,
    feedbackGivenAt: new Date().toISOString(),
    status: "feedback_given",
  });
};

export const markReviewComplete = (sessionId: string): ReviewSession | null => {
  return updateReviewSession(sessionId, {
    status: "completed",
  });
};

// ============ REVIEW MESSAGES ============

export const addReviewMessage = (
  sessionId: string,
  groupId: string,
  authorId: string,
  authorName: string,
  content: string,
  authorRole: "student" | "faculty",
  links?: string[]
): ReviewMessage => {
  const messages = JSON.parse(
    localStorage.getItem(KEYS.REVIEW_MESSAGES) || "[]"
  ) as ReviewMessage[];

  const message: ReviewMessage = {
    id: generateId(),
    sessionId,
    groupId,
    authorId,
    authorName,
    authorRole,
    content,
    links,
    createdAt: new Date().toISOString(),
  };

  messages.push(message);
  localStorage.setItem(KEYS.REVIEW_MESSAGES, JSON.stringify(messages));

  return message;
};

export const getReviewMessagesBySession = (
  sessionId: string
): ReviewMessage[] => {
  const messages = JSON.parse(
    localStorage.getItem(KEYS.REVIEW_MESSAGES) || "[]"
  ) as ReviewMessage[];
  return messages
    .filter((m) => m.sessionId === sessionId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
};

export const getReviewMessagesByGroupAndType = (
  groupId: string,
  reviewType: ReviewType
): ReviewMessage[] => {
  const session = getReviewSession(groupId, reviewType);
  if (!session) return [];
  return getReviewMessagesBySession(session.id);
};

// ============ TEAM PROGRESS ============

export const getTeamProgress = (groupId: string): TeamProgress | null => {
  const group = getGroupById(groupId);
  if (!group) return null;

  // Get mentor allocation
  const allocations = getAllocationsForGroup(groupId);
  const acceptedAllocation = allocations.find((a) => a.status === "accepted");
  if (!acceptedAllocation) return null;

  const mentor = getProfileById(acceptedAllocation.mentorId);
  if (!mentor) return null;

  // Get topics
  const topics = getTopicsByGroup(groupId);
  const approvedTopic = topics.find((t) => t.status === "approved");

  // Get review rollouts
  const rollouts = getReviewRolloutsByDepartment(group.department);
  const review1Rollout = rollouts.find((r) => r.reviewType === "review_1");
  const review2Rollout = rollouts.find((r) => r.reviewType === "review_2");
  const finalReviewRollout = rollouts.find(
    (r) => r.reviewType === "final_review"
  );

  // Get review sessions
  const review1Session = getReviewSession(groupId, "review_1");
  const review2Session = getReviewSession(groupId, "review_2");
  const finalReviewSession = getReviewSession(groupId, "final_review");

  return {
    groupId,
    groupDisplayId: group.groupId,
    mentorId: mentor.id,
    mentorName: mentor.name,
    topicApproval: {
      status: approvedTopic
        ? "approved"
        : topics.length > 0
        ? "pending"
        : "pending",
      approvedTopic: approvedTopic?.title,
      totalTopicsSubmitted: topics.length,
    },
    review1: {
      status: review1Session?.status || "not_started",
      progressPercentage: review1Session?.progressPercentage,
      isRolledOut: !!review1Rollout,
    },
    review2: {
      status: review2Session?.status || "not_started",
      progressPercentage: review2Session?.progressPercentage,
      isRolledOut: !!review2Rollout,
    },
    finalReview: {
      status: finalReviewSession?.status || "not_started",
      progressPercentage: finalReviewSession?.progressPercentage,
      isRolledOut: !!finalReviewRollout,
    },
  };
};

export const getTeamProgressForMentor = (mentorId: string): TeamProgress[] => {
  const allocations = getAllocationsForMentor(mentorId);
  const acceptedAllocations = allocations.filter(
    (a) => a.status === "accepted"
  );

  return acceptedAllocations
    .map((a) => getTeamProgress(a.groupId))
    .filter((p): p is TeamProgress => p !== null);
};

// Helper to get group by id
export const getGroupById = (groupId: string): Group | null => {
  const groups = JSON.parse(
    localStorage.getItem(KEYS.GROUPS) || "[]"
  ) as Group[];
  return groups.find((g) => g.id === groupId) || null;
};

