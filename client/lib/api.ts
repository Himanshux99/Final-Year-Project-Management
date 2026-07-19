/**
 * API Service Layer
 * All backend API calls organized by feature
 */

import { api, setToken, removeToken } from "./api-client";
import {
  User,
  Profile,
  Group,
  MentorAllocationForm,
  MentorPreference,
  MentorAllocation,
  Department,
  Role,
} from "@/types";

// ============ AUTH API ============

export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  profile?: Profile;
  token: string;
}

export const authApi = {
  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/signup", data);
    setToken(response.token);
    return response;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/login", data);
    setToken(response.token);
    return response;
  },

  logout: () => {
    removeToken();
  },

  getMe: async (): Promise<AuthResponse> => {
    return api.get<AuthResponse>("/auth/me");
  },
};



// ============ PROFILE API ============

export interface CreateProfileRequest {
  name: string;
  email: string;
  role: Role;
  department: Department;
  rollNumber?: string;
  semester?: number;
  accessCode?: string;
  domains?: string;
}

export const profileApi = {
  create: async (data: CreateProfileRequest): Promise<Profile> => {
    return api.post<Profile>("/profiles", data);
  },

  getMe: async (): Promise<Profile> => {
    return api.get<Profile>("/profiles/me");
  },

  getById: async (id: string): Promise<Profile> => {
    return api.get<Profile>(`/profiles/by-id/${id}`);
  },

  getByRole: async (role: Role): Promise<Profile[]> => {
    return api.get<Profile[]>(`/profiles/by-role/${role}`);
  },

  getByDepartment: async (department: Department): Promise<Profile[]> => {
    return api.get<Profile[]>(`/profiles/by-department/${department}`);
  },

  getFacultyByDepartment: async (
    department: Department,
  ): Promise<Profile[]> => {
    return api.get<Profile[]>(`/profiles/faculty/${department}`);
  },

  getBatch: async (ids: string[]): Promise<Profile[]> => {
    return api.post<Profile[]>("/profiles/batch", { ids });
  },
};

// ============ GROUP API ============

export interface GroupMember {
  id: string;
  groupId: string;
  profileId: string;
  joinedAt: string;
  profile: Profile;
}

export interface GroupWithMembers {
  id: string;
  groupId: string;
  teamCode: string;
  department: string;
  createdBy: string;
  isFull: boolean;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
  creator: Profile;
  hasSubmittedPreferences?: boolean;
  mentorAssigned?: string;
  meetLink?: string;
}

export interface JoinGroupRequest {
  teamCode: string;
}

export const groupApi = {
  create: async (): Promise<GroupWithMembers> => {
    return api.post<GroupWithMembers>("/groups/create");
  },

  join: async (data: JoinGroupRequest): Promise<GroupWithMembers> => {
    return api.post<GroupWithMembers>("/groups/join", data);
  },

  getMyGroup: async (): Promise<GroupWithMembers | null> => {
    return api.get<GroupWithMembers | null>("/groups/my-group");
  },

  getById: async (id: string): Promise<GroupWithMembers> => {
    return api.get<GroupWithMembers>(`/groups/by-id/${id}`);
  },

  getByTeamCode: async (teamCode: string): Promise<GroupWithMembers> => {
    return api.get<GroupWithMembers>(`/groups/by-team-code/${teamCode}`);
  },

  getByDepartment: async (
    department: Department,
  ): Promise<GroupWithMembers[]> => {
    return api.get<GroupWithMembers[]>(`/groups/by-department/${department}`);
  },

  getWithDetails: async (department: Department): Promise<any[]> => {
    return api.get<any[]>(`/groups/with-details/${department}`);
  },

  setMeetLink: async (meetLink: string): Promise<GroupWithMembers> => {
    return api.patch<GroupWithMembers>("/groups/meet-link", { meetLink });
  },
};

// ============ MENTOR FORMS API ============

export interface AvailableMentor {
  id: string;
  formId: string;
  mentorId: string;
  mentor: Profile;
}

export interface MentorFormWithMentors {
  id: string;
  department: Department;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  availableMentors: AvailableMentor[];
}

export interface CreateMentorFormRequest {
  availableMentorIds: string[];
}

export const mentorFormApi = {
  create: async (
    data: CreateMentorFormRequest,
  ): Promise<MentorFormWithMentors> => {
    return api.post<MentorFormWithMentors>("/mentor-forms", data);
  },

  getActive: async (): Promise<MentorFormWithMentors | null> => {
    return api.get<MentorFormWithMentors | null>("/mentor-forms/active");
  },

  getActiveByDepartment: async (
    department: Department,
  ): Promise<MentorFormWithMentors | null> => {
    return api.get<MentorFormWithMentors | null>(
      `/mentor-forms/active/${department}`,
    );
  },

  getById: async (id: string): Promise<MentorFormWithMentors> => {
    return api.get<MentorFormWithMentors>(`/mentor-forms/${id}`);
  },

  deactivate: async (id: string): Promise<MentorFormWithMentors> => {
    return api.patch<MentorFormWithMentors>(`/mentor-forms/${id}/deactivate`);
  },
};

// ============ MENTOR PREFERENCES API ============

export interface SubmitPreferencesRequest {
  formId: string;
  mentorChoices: [string, string, string];
}

export const mentorPreferenceApi = {
  submit: async (data: SubmitPreferencesRequest): Promise<MentorPreference> => {
    return api.post<MentorPreference>("/mentor-preferences", data);
  },

  getMyPreferences: async (): Promise<MentorPreference | null> => {
    return api.get<MentorPreference | null>(
      "/mentor-preferences/my-preferences",
    );
  },

  hasSubmitted: async (): Promise<{ hasSubmitted: boolean }> => {
    return api.get<{ hasSubmitted: boolean }>(
      "/mentor-preferences/has-submitted",
    );
  },

  getByGroup: async (groupId: string): Promise<MentorPreference | null> => {
    return api.get<MentorPreference | null>(
      `/mentor-preferences/by-group/${groupId}`,
    );
  },
};

// ============ MENTOR ALLOCATIONS API ============

export interface AllocationWithDetails extends MentorAllocation {
  group: GroupWithMembers;
  mentor: Profile;
  form: MentorAllocationForm;
}

export interface MentorStatusResponse {
  status:
    | "no_group"
    | "not_submitted"
    | "pending"
    | "accepted"
    | "all_rejected";
  mentorName?: string;
  mentorId?: string;
  currentPriority?: number;
}

export const mentorAllocationApi = {
  getForMentor: async (): Promise<AllocationWithDetails[]> => {
    return api.get<AllocationWithDetails[]>("/mentor-allocations/for-mentor");
  },

  getForGroup: async (): Promise<MentorAllocation[]> => {
    return api.get<MentorAllocation[]>("/mentor-allocations/for-group");
  },

  getAcceptedMentor: async (): Promise<{
    mentor: Profile;
    status: string;
  } | null> => {
    return api.get<{ mentor: Profile; status: string } | null>(
      "/mentor-allocations/accepted-mentor",
    );
  },

  getStatus: async (): Promise<MentorStatusResponse> => {
    return api.get<MentorStatusResponse>("/mentor-allocations/status");
  },

  getAcceptedTeams: async (): Promise<AllocationWithDetails[]> => {
    return api.get<AllocationWithDetails[]>(
      "/mentor-allocations/accepted-teams",
    );
  },

  accept: async (id: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>(`/mentor-allocations/${id}/accept`);
  },

  reject: async (id: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>(`/mentor-allocations/${id}/reject`);
  },

  removeTeam: async (groupId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/mentor-allocations/groups/${groupId}`);
  }
};

// ============ PROJECT TOPICS API ============
import { ProjectTopic, TopicMessage, TopicStatus } from "@/types";

export interface CreateTopicRequest {
  title: string;
  description: string;
}

export interface UpdateTopicRequest {
  title?: string;
  description?: string;
}

export interface ReviewTopicRequest {
  feedback?: string;
}

export interface AddTopicMessageRequest {
  topicId: string;
  content: string;
  links?: string[];
  groupId?: string; // Optional: for faculty sending general messages
}

export const projectTopicsApi = {
  create: async (data: CreateTopicRequest, file?: File): Promise<ProjectTopic> => {
    if (file) {
      return api.uploadWithFields<ProjectTopic>("/project-topics", file, {
        title: data.title,
        description: data.description,
      });
    }
    return api.post<ProjectTopic>("/project-topics", data);
  },

  // NEW: Edit topic
  update: async (
    topicId: string,
    data: UpdateTopicRequest,
    file?: File,
  ): Promise<ProjectTopic> => {
    if (file) {
      return api.uploadWithFields<ProjectTopic>(
        `/project-topics/${topicId}`,
        file,
        {
          title: data.title ?? "",
          description: data.description ?? "",
        },
        "PATCH", // if uploadWithFields supports custom methods
      );
    }

    return api.patch<ProjectTopic>(
      `/project-topics/${topicId}`,
      data,
    );
  },

  getMyGroupTopics: async (): Promise<ProjectTopic[]> => {
    return api.get<ProjectTopic[]>("/project-topics/my-group");
  },

  getTopicsByGroupId: async (groupId: string): Promise<ProjectTopic[]> => {
    return api.get<ProjectTopic[]>(`/project-topics/group/${groupId}`);
  },

  approve: async (topicId: string): Promise<ProjectTopic> => {
    return api.patch<ProjectTopic>(`/project-topics/${topicId}/approve`);
  },

  reject: async (topicId: string): Promise<ProjectTopic> => {
    return api.patch<ProjectTopic>(`/project-topics/${topicId}/reject`);
  },

  requestRevision: async (
    topicId: string,
    feedback: string,
  ): Promise<ProjectTopic> => {
    return api.patch<ProjectTopic>(
      `/project-topics/${topicId}/request-revision`,
      { feedback },
    );
  },

  addMessage: async (data: AddTopicMessageRequest): Promise<TopicMessage> => {
    return api.post<TopicMessage>("/project-topics/messages", data);
  },

  getMessagesByTopic: async (topicId: string): Promise<TopicMessage[]> => {
    return api.get<TopicMessage[]>(`/project-topics/messages/topic/${topicId}`);
  },

  getMyGroupMessages: async (): Promise<TopicMessage[]> => {
    return api.get<TopicMessage[]>("/project-topics/messages/my-group");
  },

  getMessagesByGroupId: async (groupId: string): Promise<TopicMessage[]> => {
    return api.get<TopicMessage[]>(`/project-topics/messages/group/${groupId}`);
  },
};

// ============ REVIEWS API ============

import {
  ReviewType,
  ReviewSession,
  ReviewMessage,
  ReviewRollout,
} from "@/types";

export interface RolloutReviewRequest {
  reviewType: ReviewType;
}

export interface SubmitProgressRequest {
  progressPercentage: number;
  progressDescription: string;
}

export interface SubmitFeedbackRequest {
  feedback: string;
}

export interface AddReviewMessageRequest {
  sessionId: string;
  content: string;
  links?: string[];
}

export const reviewsApi = {
  rollout: async (reviewType: ReviewType): Promise<ReviewRollout> => {
    return api.post<ReviewRollout>("/reviews/rollout", { reviewType });
  },

  getRollout: async (reviewType: ReviewType): Promise<ReviewRollout | null> => {
    return api.get<ReviewRollout | null>(`/reviews/rollout/${reviewType}`);
  },

  submitProgress: async (
    reviewType: ReviewType,
    data: SubmitProgressRequest,
  ): Promise<ReviewSession> => {
    return api.post<ReviewSession>(`/reviews/submit/${reviewType}`, data);
  },

  submitFeedback: async (
    sessionId: string,
    feedback: string,
  ): Promise<ReviewSession> => {
    return api.post<ReviewSession>(`/reviews/feedback/${sessionId}`, {
      feedback,
    });
  },

  markComplete: async (sessionId: string): Promise<ReviewSession> => {
    return api.patch<ReviewSession>(`/reviews/${sessionId}/complete`);
  },

  getMySession: async (
    reviewType: ReviewType,
  ): Promise<ReviewSession | null> => {
    return api.get<ReviewSession | null>(`/reviews/session/${reviewType}`);
  },

  getSessionByGroupId: async (
    reviewType: ReviewType,
    groupId: string,
  ): Promise<ReviewSession | null> => {
    return api.get<ReviewSession | null>(
      `/reviews/session/${reviewType}/group/${groupId}`,
    );
  },

  addMessage: async (data: AddReviewMessageRequest): Promise<ReviewMessage> => {
    return api.post<ReviewMessage>("/reviews/messages", data);
  },

  getMessagesBySession: async (sessionId: string): Promise<ReviewMessage[]> => {
    return api.get<ReviewMessage[]>(`/reviews/messages/session/${sessionId}`);
  },

  getMyMessages: async (reviewType: ReviewType): Promise<ReviewMessage[]> => {
    return api.get<ReviewMessage[]>(`/reviews/messages/${reviewType}`);
  },

  setMeetLink: async (
    sessionId: string,
    meetLink: string,
  ): Promise<ReviewSession> => {
    return api.patch<ReviewSession>(`/reviews/${sessionId}/meet-link`, {
      meetLink,
    });
  },
};

// ============ ADMIN API ============

import {
  MentorOverview,
  UnassignedGroup,
  AvailableMentor as AvailableMentorType,
} from "@/types";

export interface AllocateMentorRequest {
  groupId: string;
  mentorId: string;
}

export const adminApi = {
  getMentorOverview: async (): Promise<MentorOverview[]> => {
    return api.get<MentorOverview[]>("/admin/mentor-overview");
  },

  getUnassignedGroups: async (): Promise<UnassignedGroup[]> => {
    return api.get<UnassignedGroup[]>("/admin/unassigned-groups");
  },

  getAvailableMentors: async (): Promise<AvailableMentorType[]> => {
    return api.get<AvailableMentorType[]>("/admin/available-mentors");
  },

  allocateMentor: async (
    data: AllocateMentorRequest,
  ): Promise<{ message: string }> => {
    return api.post<{ message: string }>("/admin/allocate-mentor", data);
  },
};

// ============ ATTACHMENTS API ============

import { Attachment } from "@/types";

export const attachmentsApi = {
  upload: async (file: File): Promise<Attachment> => {
    return api.upload<Attachment>(`/attachments/upload`, file);
  },

  getMyGroupAttachments: async (): Promise<Attachment[]> => {
    return api.get<Attachment[]>("/attachments/my-group");
  },

  getByGroupId: async (groupId: string): Promise<Attachment[]> => {
    return api.get<Attachment[]>(`/attachments/group/${groupId}`);
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/attachments/${id}`);
  },
};

// ============ TOPIC APPROVAL DOCUMENT API ============

import { TopicApprovalDocument } from "@/types";

export const topicApprovalApi = {
  upload: async (file: File): Promise<TopicApprovalDocument> => {
    return api.upload<TopicApprovalDocument>("/topic-approval/upload", file);
  },

  getMyDocument: async (): Promise<TopicApprovalDocument | null> => {
    return api.get<TopicApprovalDocument | null>("/topic-approval/my-document");
  },

  getByGroupId: async (groupId: string): Promise<TopicApprovalDocument | null> => {
    return api.get<TopicApprovalDocument | null>(`/topic-approval/group/${groupId}`);
  },

  checkExists: async (groupId: string): Promise<{ exists: boolean }> => {
    return api.get<{ exists: boolean }>(`/topic-approval/exists/${groupId}`);
  },

  delete: async (): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>("/topic-approval");
  },

  getTemplateUrl: (): string => {
    // Return static file from public folder (no auth needed)
    return "/assets/TE Major Project Topic Approval Form.docx";
  },
};

// ============ EVALUATIONS API ============

import { ReviewEvaluation, StudentGrade, ReviewType as RT } from "@/types";

export interface StudentGradeInput {
  profileId: string;
  studentName: string;
  rollNumber: string;
  // Review 1 grades
  progressMarks?: number;
  contributionMarks?: number;
  publicationMarks?: number;
  // Review 2 grades
  techUsageMarks?: number;
  innovationMarks?: number;
  presentationMarks?: number;
  activityMarks?: number;
  synopsisMarks?: number;
}

export interface CreateEvaluationRequest {
  sessionId: string;
  groupId: string;
  reviewType: RT;
  evaluationDate: string;
  division: string;
  projectGuide: string;
  projectTitle: string;
  projectCategory?: string;
  projectType?: string;
  projectDomain?: string;
  qualityGrade?: string;
  projectNature?: string;
  completionPercentage: number;
  remarks?: string;
  studentGrades: StudentGradeInput[];
}

export interface EvaluationPreFillData {
  sessionId: string;
  groupId: string;
  groupDisplayId: string;
  teamCode: string;
  reviewType: RT;
  projectGuide: string;
  projectTitle: string;
  completionPercentage: number;
  members: Array<{
    profileId: string;
    name: string;
    email: string;
    rollNumber: string;
    semester: number | null;
  }>;
}

export const evaluationsApi = {
  create: async (data: CreateEvaluationRequest): Promise<ReviewEvaluation> => {
    return api.post<ReviewEvaluation>("/evaluations", data);
  },

  getPreFillData: async (sessionId: string): Promise<EvaluationPreFillData> => {
    return api.get<EvaluationPreFillData>(`/evaluations/prefill/${sessionId}`);
  },

  getBySessionId: async (sessionId: string): Promise<ReviewEvaluation | null> => {
    return api.get<ReviewEvaluation | null>(`/evaluations/session/${sessionId}`);
  },

  getByGroupId: async (groupId: string): Promise<ReviewEvaluation[]> => {
    return api.get<ReviewEvaluation[]>(`/evaluations/group/${groupId}`);
  },

  getAll: async (filters?: { reviewType?: RT; department?: string }): Promise<ReviewEvaluation[]> => {
    const params = new URLSearchParams();
    if (filters?.reviewType) params.append("reviewType", filters.reviewType);
    if (filters?.department) params.append("department", filters.department);
    const queryString = params.toString();
    return api.get<ReviewEvaluation[]>(`/evaluations/admin${queryString ? `?${queryString}` : ""}`);
  },
};
