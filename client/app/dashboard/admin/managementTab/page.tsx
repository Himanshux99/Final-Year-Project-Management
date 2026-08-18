'use client'
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Users,
  UserCheck,
  ClipboardList,
  Play,
  CheckCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import {
  mentorFormApi,
  profileApi,
  groupApi,
  reviewsApi,
  projectTopicsApi,
  adminApi,
  evaluationsApi,
} from "@/lib/api";
import {
  MentorAllocationForm,
  Profile,
  ReviewRollout,
  ReviewType,
  MentorOverview,
  ReviewEvaluation,
} from "@/types";

import {
  getCachedData,
  setCachedData,
  invalidateCache,
  CACHE_KEYS,
  CACHE_TTL,
} from "@/lib/cache";

export default async function ManagementTab() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [activeForm, setActiveForm] = useState<MentorAllocationForm | null>(
    null,
  );
  const [facultyList, setFacultyList] = useState<Profile[]>([]);
  const [selectedMentors, setSelectedMentors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [reviewRollouts, setReviewRollouts] = useState<ReviewRollout[]>([]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!user || !profile) {
      router.push("/auth/login");
      return;
    }

    if (profile.role !== "super_admin") {
      router.push("/dashboard");
      return;
    }

    loadData();
  }, [user, profile, router, authLoading]);

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!profile) return;

      try {
        setInitialLoading(true);

        // Check cache first (unless forced refresh)
        if (!forceRefresh) {
          const cachedMentorOverview = getCachedData<MentorOverview[]>(
            CACHE_KEYS.MENTOR_OVERVIEW,
          );
          const cachedGroups = getCachedData<any[]>(CACHE_KEYS.GROUPS);
          const cachedFacultyList = getCachedData<Profile[]>(
            CACHE_KEYS.FACULTY_LIST,
          );

          if (cachedMentorOverview && cachedGroups && cachedFacultyList) {
            setGroups(cachedGroups);
            setFacultyList(cachedFacultyList);
            // Show cache immediately, but still fetch fresh data so rollout status is current.
            setInitialLoading(false);
          }
        }

        // Load active form
        const form = await mentorFormApi.getActiveByDepartment(
          profile.department,
        );
        setActiveForm(form as any); // Cast to avoid type mismatch with extended type

        // Load faculty list
        const faculty = await profileApi.getFacultyByDepartment(
          profile.department,
        );
        setFacultyList(faculty);
        setCachedData(CACHE_KEYS.FACULTY_LIST, faculty, CACHE_TTL.LONG);

        if (form) {
          setSelectedMentors(
            form.availableMentors.map((m: any) => m.mentorId ?? m.id),
          );
        } else {
          setSelectedMentors([]);
        }

        // Load groups by department with mentor details
        const deptGroups = await groupApi.getWithDetails(profile.department);

        // Load topic data for each group
        const groupsWithDetails = await Promise.all(
          deptGroups.map(async (group) => {
            let topicApproved = false;
            let topicTitle: string | undefined = undefined;

            try {
              const topics = await projectTopicsApi.getTopicsByGroupId(
                group.id,
              );
              const approvedTopic = topics.find((t) => t.status === "approved");
              if (approvedTopic) {
                topicApproved = true;
                topicTitle = approvedTopic.title;
              }
              // const groupReviews = reviewSessions.filter(
              //   (r) => r.groupId === group.id
              // );

              // const review1 = groupReviews.find((r) => r.reviewType === "review1");
              // const review2 = groupReviews.find((r) => r.reviewType === "review2");
              // const finalReview = groupReviews.find((r) => r.reviewType === "final");
            } catch (error) {
              console.error(
                `Failed to load topics for group ${group.id}:`,
                error,
              );
            }
            // console.log(`Group:`, group);
            return {
              ...group,
              leaderName: group.creator?.name,
              hasSubmittedPreferences: group.hasSubmittedPreferences,
              mentorAssigned: group.mentorAssigned,
              topicApproved,
              topicTitle,
              review1Status: undefined,
              review1Progress: undefined,
              review2Status: undefined,
              review2Progress: undefined,
              finalReviewStatus: undefined,
              finalReviewProgress: undefined,
            };
          }),
        );
        // console.log("Loaded groups with details:", groupsWithDetails);
        setGroups(groupsWithDetails);
        setCachedData(CACHE_KEYS.GROUPS, groupsWithDetails, CACHE_TTL.MEDIUM);

        // Load review rollouts
        const rollouts: ReviewRollout[] = [];
        try {
          const r1 = await reviewsApi.getRollout("review_1");
          if (r1) rollouts.push(r1);
        } catch (error) {}
        try {
          const r2 = await reviewsApi.getRollout("review_2");
          if (r2) rollouts.push(r2);
        } catch (error) {}
        try {
          const fr = await reviewsApi.getRollout("final_review");
          if (fr) rollouts.push(fr);
        } catch (error) {}

        setReviewRollouts(rollouts);

        // Load mentor overview data
        

       
      } catch (error: any) {
        console.error("Error loading admin data:", error);
        setInitialLoading(false);
      }
    },
    [profile],
  );

  const handleToggleMentor = (mentorId: string) => {
    if (selectedMentors.includes(mentorId)) {
      setSelectedMentors(selectedMentors.filter((id) => id !== mentorId));
    } else {
      setSelectedMentors([...selectedMentors, mentorId]);
    }
  };

  const handleRefresh = () => {
    // Clear cache and reload
    invalidateCache(CACHE_KEYS.MENTOR_OVERVIEW);
    invalidateCache(CACHE_KEYS.GROUPS);
    invalidateCache(CACHE_KEYS.FACULTY_LIST);
    loadData(true);
    showToast("Refreshing data...", "info");
  };

  const handleRollOutForm = async () => {
    if (!profile) return;

    if (selectedMentors.length === 0) {
      showToast("Please select at least one mentor", "error");
      return;
    }

    setLoading(true);
    try {
      await mentorFormApi.create({ availableMentorIds: selectedMentors });
      showToast("Mentor Allocation Form rolled out successfully!", "success");
      invalidateCache(CACHE_KEYS.MENTOR_OVERVIEW);
      invalidateCache(CACHE_KEYS.GROUPS);
      invalidateCache(CACHE_KEYS.FACULTY_LIST);
      await loadData(true);
    } catch (error: any) {
      showToast(error.message || "Failed to roll out form", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRolloutReview = async (reviewType: ReviewType) => {
    if (!profile) return;

    setLoading(true);
    try {
      await reviewsApi.rollout(reviewType);
      const reviewName =
        reviewType === "review_1"
          ? "Review 1"
          : reviewType === "review_2"
            ? "Review 2"
            : "Final Review";
      showToast(`${reviewName} rolled out successfully!`, "success");
      invalidateCache(CACHE_KEYS.MENTOR_OVERVIEW);
      invalidateCache(CACHE_KEYS.GROUPS);
      invalidateCache(CACHE_KEYS.FACULTY_LIST);
      await loadData(true);
    } catch (error: any) {
      showToast(error.message || "Failed to roll out review", "error");
    } finally {
      setLoading(false);
    }
  };

  const isReviewRolledOut = (reviewType: ReviewType) => {
    return reviewRollouts.some(
      (r) => r.reviewType === reviewType && r.isActive,
    );
  };

  return (
    <>
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {groups.length}
                </p>
                <p className="text-sm text-gray-600">Total Groups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <UserCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {facultyList.length}
                </p>
                <p className="text-sm text-gray-600">Faculty Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {groups.filter((g) => g.mentorAssigned).length}
                </p>
                <p className="text-sm text-gray-600">Groups with Mentors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mentor Allocation Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Mentor Allocation Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Select faculty mentors and roll out the mentor allocation form for
            your department.
          </p>

          {activeForm?.isActive ? (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Form Active</h4>
                <Badge variant="success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
              <p className="text-xs text-green-700">
                Mentor allocation form is currently active for{" "}
                {profile?.department}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {facultyList.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No faculty available in this department.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {facultyList.map((faculty) => (
                      <label
                        key={faculty.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMentors.includes(faculty.id)}
                          onChange={() => handleToggleMentor(faculty.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">
                          {faculty.name}
                          {faculty.domains ? (
                            <span className="text-xs text-gray-500 ml-1">
                              ({faculty.domains})
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  {selectedMentors.length} of {facultyList.length} mentors
                  selected
                </span>
                <Button
                  onClick={handleRollOutForm}
                  disabled={
                    loading ||
                    selectedMentors.length === 0 ||
                    facultyList.length === 0
                  }
                  className="gap-1"
                >
                  <Play className="h-4 w-4" />
                  Roll Out Form
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Rollout Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Review Rollout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Activate review phases for teams in your department. Teams can
            submit progress once each review is rolled out.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Review 1 */}
            <div
              className={`border rounded-lg p-4 ${isReviewRolledOut("review_1") ? "border-green-200 bg-green-50" : "border-gray-200"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Review 1</h4>
                {isReviewRolledOut("review_1") ? (
                  <Badge variant="success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline">Not Started</Badge>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Initial progress check after 2-3 weeks
              </p>
              {!isReviewRolledOut("review_1") && (
                <Button
                  size="sm"
                  onClick={() => handleRolloutReview("review_1")}
                  disabled={loading || !activeForm?.isActive}
                  className="w-full gap-1"
                >
                  <Play className="h-4 w-4" />
                  Activate
                </Button>
              )}
              {isReviewRolledOut("review_1") && (
                <p className="text-xs text-green-700">
                  {groups.filter((g) => g.review1Status).length}/
                  {groups.filter((g) => g.mentorAssigned).length} teams
                  submitted
                </p>
              )}
            </div>

            {/* Review 2 */}
            <div
              className={`border rounded-lg p-4 ${isReviewRolledOut("review_2") ? "border-green-200 bg-green-50" : "border-gray-200"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Review 2</h4>
                {isReviewRolledOut("review_2") ? (
                  <Badge variant="success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline">Not Started</Badge>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-3">
                90% completion expected
              </p>
              {!isReviewRolledOut("review_2") && (
                <Button
                  size="sm"
                  onClick={() => handleRolloutReview("review_2")}
                  disabled={loading || !isReviewRolledOut("review_1")}
                  className="w-full gap-1"
                >
                  <Play className="h-4 w-4" />
                  Activate
                </Button>
              )}
              {isReviewRolledOut("review_2") && (
                <p className="text-xs text-green-700">
                  {groups.filter((g) => g.review2Status).length}/
                  {groups.filter((g) => g.mentorAssigned).length} teams
                  submitted
                </p>
              )}
            </div>

            {/* Final Review */}
            <div
              className={`border rounded-lg p-4 ${isReviewRolledOut("final_review") ? "border-green-200 bg-green-50" : "border-gray-200"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Final Review</h4>
                {isReviewRolledOut("final_review") ? (
                  <Badge variant="success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline">Not Started</Badge>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Project completion & submission
              </p>
              {!isReviewRolledOut("final_review") && (
                <Button
                  size="sm"
                  onClick={() => handleRolloutReview("final_review")}
                  disabled={loading || !isReviewRolledOut("review_2")}
                  className="w-full gap-1"
                >
                  <Play className="h-4 w-4" />
                  Activate
                </Button>
              )}
              {isReviewRolledOut("final_review") && (
                <p className="text-xs text-green-700">
                  {groups.filter((g) => g.finalReviewStatus).length}/
                  {groups.filter((g) => g.mentorAssigned).length} teams
                  submitted
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
