"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, Users, UserCheck, ClipboardList, Play, CheckCircle, Download, UserPlus, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCardSkeleton, MentorCardSkeleton } from "@/components/ui/skeleton";
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
import { MentorAllocationForm, Profile, ReviewRollout, ReviewType, MentorOverview, UnassignedGroup, AvailableMentor, ReviewEvaluation } from "@/types";
import { MentorOverviewPanel } from "@/components/mentor-overview-panel";
import { ManualAllocationModal } from "@/components/manual-allocation-modal";
import { exportMentorOverviewAsCSV, exportMentorOverviewAsPDF } from "@/lib/export-utils";
import { getCachedData, setCachedData, invalidateCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [activeForm, setActiveForm] = useState<MentorAllocationForm | null>(null);
  const [facultyList, setFacultyList] = useState<Profile[]>([]);
  const [selectedMentors, setSelectedMentors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [reviewRollouts, setReviewRollouts] = useState<ReviewRollout[]>([]);
  
  // New state for mentor overview and allocation
  const [mentorOverview, setMentorOverview] = useState<MentorOverview[]>([]);
  const [unassignedGroups, setUnassignedGroups] = useState<UnassignedGroup[]>([]);
  const [availableMentorsForAlloc, setAvailableMentorsForAlloc] = useState<AvailableMentor[]>([]);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Semester filter state
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null);

  // Evaluations state
  const [evaluations, setEvaluations] = useState<ReviewEvaluation[]>([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);

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

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!profile) return;

    try {
      setInitialLoading(true);
      
      // Check cache first (unless forced refresh)
      if (!forceRefresh) {
        const cachedMentorOverview = getCachedData<MentorOverview[]>(CACHE_KEYS.MENTOR_OVERVIEW);
        const cachedGroups = getCachedData<any[]>(CACHE_KEYS.GROUPS);
        const cachedFacultyList = getCachedData<Profile[]>(CACHE_KEYS.FACULTY_LIST);
        
        if (cachedMentorOverview && cachedGroups && cachedFacultyList) {
          setMentorOverview(cachedMentorOverview);
          setGroups(cachedGroups);
          setFacultyList(cachedFacultyList);
          // Show cache immediately, but still fetch fresh data so rollout status is current.
          setInitialLoading(false);
        }
      }

      // Load active form
      const form = await mentorFormApi.getActiveByDepartment(profile.department);
      setActiveForm(form as any); // Cast to avoid type mismatch with extended type

      // Load faculty list
      const faculty = await profileApi.getFacultyByDepartment(profile.department);
      setFacultyList(faculty);
      setCachedData(CACHE_KEYS.FACULTY_LIST, faculty, CACHE_TTL.LONG);

      if (form) {
        setSelectedMentors(form.availableMentors.map((m: any) => m.mentorId ?? m.id));
      } else {
        setSelectedMentors([]);
      }

      // Load groups by department with mentor details
      const deptGroups = await groupApi.getWithDetails(profile.department);
      
      // Load topic data for each group
      const groupsWithDetails = await Promise.all(deptGroups.map(async (group) => {
        let topicApproved = false;
        let topicTitle: string | undefined = undefined;
        
        try {
          const topics = await projectTopicsApi.getTopicsByGroupId(group.id);
          const approvedTopic = topics.find((t) => t.status === 'approved');
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
          console.error(`Failed to load topics for group ${group.id}:`, error);
        }
        console.log(`Group:`, group);
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
      }));
      console.log('Loaded groups with details:', groupsWithDetails);
      setGroups(groupsWithDetails);
      setCachedData(CACHE_KEYS.GROUPS, groupsWithDetails, CACHE_TTL.MEDIUM);
      
      // Load review rollouts
      const rollouts: ReviewRollout[] = [];
      try {
        const r1 = await reviewsApi.getRollout('review_1');
        if (r1) rollouts.push(r1);
      } catch (error) {}
      try {
        const r2 = await reviewsApi.getRollout('review_2');
        if (r2) rollouts.push(r2);
      } catch (error) {}
      try {
        const fr = await reviewsApi.getRollout('final_review');
        if (fr) rollouts.push(fr);
      } catch (error) {}
      
      setReviewRollouts(rollouts);

      // Load mentor overview data
      setOverviewLoading(true);
      try {
        const overview = await adminApi.getMentorOverview();
        setMentorOverview(overview);
        setCachedData(CACHE_KEYS.MENTOR_OVERVIEW, overview, CACHE_TTL.MEDIUM);
      } catch (error) {
        console.error('Error loading mentor overview:', error);
      }
      
      // Load unassigned groups and available mentors for manual allocation
      try {
        const [unassigned, mentorsForAlloc] = await Promise.all([
          adminApi.getUnassignedGroups(),
          adminApi.getAvailableMentors(),
        ]);
        setUnassignedGroups(unassigned);
        setAvailableMentorsForAlloc(mentorsForAlloc);
      } catch (error) {
        console.error('Error loading allocation data:', error);
      }
      setOverviewLoading(false);
      setInitialLoading(false);
    } catch (error: any) {
      console.error('Error loading admin data:', error);
      setInitialLoading(false);
    }
  }, [profile]);

  const loadEvaluations = useCallback(async () => {
    try {
      setEvaluationsLoading(true);
      const allEvaluations = await evaluationsApi.getAll();
      setEvaluations(allEvaluations);
    } catch (error) {
      console.error("Failed to load evaluations:", error);
      showToast("Failed to load evaluations", "error");
    } finally {
      setEvaluationsLoading(false);
    }
  }, [showToast]);

  // Load evaluations when evaluations tab is active
  useEffect(() => {
    if (activeTab === "evaluations" && evaluations.length === 0) {
      loadEvaluations();
    }
  }, [activeTab, evaluations.length, loadEvaluations]);

  const handleRefresh = () => {
    // Clear cache and reload
    invalidateCache(CACHE_KEYS.MENTOR_OVERVIEW);
    invalidateCache(CACHE_KEYS.GROUPS);
    invalidateCache(CACHE_KEYS.FACULTY_LIST);
    loadData(true);
    if (activeTab === "evaluations") {
      loadEvaluations();
    }
    showToast("Refreshing data...", "info");
  };

  const handleManualAllocate = async (groupId: string, mentorId: string) => {
    try {
      await adminApi.allocateMentor({ groupId, mentorId });
      showToast("Mentor allocated successfully!", "success");
      invalidateCache(CACHE_KEYS.MENTOR_OVERVIEW);
      invalidateCache(CACHE_KEYS.GROUPS);
      invalidateCache(CACHE_KEYS.FACULTY_LIST);
      await loadData(true);
    } catch (error: any) {
      showToast(error.message || "Failed to allocate mentor", "error");
      throw error;
    }
  };

  const handleExportCSV = () => {
    if (!profile) return;
    exportMentorOverviewAsCSV(mentorOverview, profile.department);
    showToast("CSV exported successfully!", "success");
  };

  const handleExportPDF = () => {
    if (!profile) return;
    exportMentorOverviewAsPDF(mentorOverview, profile.department);
    showToast("PDF exported successfully!", "success");
  };

  const handleToggleMentor = (mentorId: string) => {
    if (selectedMentors.includes(mentorId)) {
      setSelectedMentors(selectedMentors.filter((id) => id !== mentorId));
    } else {
      setSelectedMentors([...selectedMentors, mentorId]);
    }
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
      const reviewName = reviewType === "review_1" 
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
    return reviewRollouts.some((r) => r.reviewType === reviewType && r.isActive);
  };

  return (
    <DashboardLayout title="Super Admin Dashboard">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Actions Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              size="sm"
              disabled={initialLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${initialLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAllocationModal(true)}
              size="sm"
              disabled={unassignedGroups.length === 0}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Manual Allocation
              {unassignedGroups.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unassignedGroups.length}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              size="sm"
              disabled={mentorOverview.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              size="sm"
              disabled={mentorOverview.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/faculty")}
            size="sm"
          >
            <Users className="h-4 w-4 mr-2" />
            View My Mentor Requests
          </Button>
        </div>

        {/* Loading skeleton */}
        {initialLoading ? (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
            <div className="space-y-4">
              <MentorCardSkeleton />
              <MentorCardSkeleton />
              <MentorCardSkeleton />
            </div>
          </div>
        ) : (
          /* Tabs for Overview vs Management */
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="overview">Mentor & Group Overview</TabsTrigger>
              <TabsTrigger value="management">Form & Review Management</TabsTrigger>
              <TabsTrigger value="evaluations">Review Evaluations</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <MentorOverviewPanel 
                mentors={mentorOverview} 
                loading={overviewLoading}
                semesterFilter={semesterFilter}
                onSemesterFilterChange={setSemesterFilter}
              />
            </TabsContent>

            {/* Management Tab */}
            <TabsContent value="management" className="space-y-6">
            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{groups.length}</p>
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
                  Select faculty mentors and roll out the mentor allocation form for your department.
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
                      Mentor allocation form is currently active for {profile?.department}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {facultyList.length === 0 ? (
                        <p className="text-sm text-gray-500">No faculty available in this department.</p>
                      ) : (
                        <div className="space-y-2">
                          {facultyList.map((faculty) => (
                            <label key={faculty.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={selectedMentors.includes(faculty.id)}
                                onChange={() => handleToggleMentor(faculty.id)}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">
                                {faculty.name}
                                {faculty.domains ? (
                                  <span className="text-xs text-gray-500 ml-1">({faculty.domains})</span>
                                ) : null}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        {selectedMentors.length} of {facultyList.length} mentors selected
                      </span>
                      <Button
                        onClick={handleRollOutForm}
                        disabled={loading || selectedMentors.length === 0 || facultyList.length === 0}
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
              Activate review phases for teams in your department. Teams can submit progress once each review is rolled out.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Review 1 */}
              <div className={`border rounded-lg p-4 ${isReviewRolledOut("review_1") ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
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
                    {groups.filter(g => g.review1Status).length}/{groups.filter(g => g.mentorAssigned).length} teams submitted
                  </p>
                )}
              </div>

              {/* Review 2 */}
              <div className={`border rounded-lg p-4 ${isReviewRolledOut("review_2") ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
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
                    {groups.filter(g => g.review2Status).length}/{groups.filter(g => g.mentorAssigned).length} teams submitted
                  </p>
                )}
              </div>

              {/* Final Review */}
              <div className={`border rounded-lg p-4 ${isReviewRolledOut("final_review") ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
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
                    {groups.filter(g => g.finalReviewStatus).length}/{groups.filter(g => g.mentorAssigned).length} teams submitted
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
            </TabsContent>

            {/* Evaluations Tab */}
            <TabsContent value="evaluations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Review Evaluations</CardTitle>
                </CardHeader>
                <CardContent>
                  {evaluationsLoading ? (
                    <div className="text-center py-8">Loading evaluations...</div>
                  ) : evaluations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No evaluations submitted yet</div>
                  ) : (
                    <div className="space-y-4">
                      {evaluations.map((evaluation: any) => {
                        const studentGrades = Array.isArray(evaluation.studentGrades)
                          ? evaluation.studentGrades
                          : [];

                        return (
                        <div key={evaluation.id} className="border rounded-lg p-4">
                          <div className="mb-3">
                            <h4 className="font-semibold">{evaluation.group?.groupId || "Group"}</h4>
                            <p className="text-sm text-gray-600">
                              Evaluator: {evaluation.mentor?.name || "Unknown"}
                            </p>
                            <p className="text-sm text-gray-600">
                              Review: {evaluation.reviewType?.replace("_", " ").toUpperCase() || "Unknown"}
                            </p>
                            <p className="text-sm text-gray-600">
                              Division: {evaluation.division || "-"}
                            </p>
                            <p className="text-sm text-gray-600">
                              Project Guide: {evaluation.projectGuide || "-"}
                            </p>
                            <p className="text-sm text-gray-600">
                              Project Title: {evaluation.projectTitle || "-"}
                            </p>
                            {evaluation.reviewType === "review_1" ? (
                              <>
                                <p className="text-sm text-gray-600">
                                  Category of Project: {evaluation.projectCategory || "-"}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Project Type: {evaluation.projectType || "-"}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-gray-600">
                                  Domain of Project: {evaluation.projectDomain || "-"}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Quality Grade: {evaluation.qualityGrade || "-"}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Nature of Project: {evaluation.projectNature || "-"}
                                </p>
                              </>
                            )}
                            <p className="text-sm text-gray-600">
                              Completion Percentage: {evaluation.completionPercentage ?? 0}%
                            </p>
                          </div>
                          {evaluation.remarks && (
                            <p className="text-sm mt-2 text-gray-700">Remarks: {evaluation.remarks}</p>
                          )}
                          {evaluation.paperPublicationStatus && (
                            <p className="text-sm text-gray-600">Paper Status: {evaluation.paperPublicationStatus}</p>
                          )}
                          <div className="mt-3">
                            <p className="text-xs font-semibold mb-1">Per-Student Criteria Breakdown:</p>
                            <div className="space-y-2">
                              {studentGrades.map((grade: any) => (
                                <div key={grade.id} className="text-xs bg-gray-50 p-2 rounded">
                                  <p className="font-medium mb-1">{grade.student?.name || "Unknown Student"}</p>
                                  {evaluation.reviewType === "review_1" ? (
                                    <>
                                      <p>Progress (10): {grade.progressMarks ?? 0}</p>
                                      <p>Contribution (10): {grade.contributionMarks ?? 0}</p>
                                      <p>Publication (5): {grade.publicationMarks ?? 0}</p>
                                    </>
                                  ) : (
                                    <>
                                      <p>Tech Usage (5): {grade.techUsageMarks ?? 0}</p>
                                      <p>Innovativeness (5): {grade.innovationMarks ?? 0}</p>
                                      <p>Presentation (5): {grade.presentationMarks ?? 0}</p>
                                      <p>Project Activity (5): {grade.activityMarks ?? 0}</p>
                                      <p>Synopsis (5): {grade.synopsisMarks ?? 0}</p>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Submitted: {evaluation.filledAt ? new Date(evaluation.filledAt).toLocaleDateString() : "-"}
                          </p>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Manual Allocation Modal */}
        <ManualAllocationModal
          open={showAllocationModal}
          onClose={() => setShowAllocationModal(false)}
          unassignedGroups={unassignedGroups}
          availableMentors={availableMentorsForAlloc}
          onAllocate={handleManualAllocate}
        />
      </div>
    </DashboardLayout>
  );
}
