"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Users,
  UserCheck,
  ClipboardList,
  Play,
  CheckCircle,
  Download,
  UserPlus,
  RefreshCw,
  Plus,
  Trash2,
  Pencil,
  Tags,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  domainsApi,
} from "@/lib/api";
import {
  MentorAllocationForm,
  Profile,
  ReviewRollout,
  ReviewType,
  MentorOverview,
  UnassignedGroup,
  AvailableMentor,
  ReviewEvaluation,
  Domain,
} from "@/types";
import { MentorOverviewPanel } from "@/components/mentor-overview-panel";
import { ManualAllocationModal } from "@/components/manual-allocation-modal";
import {
  exportMentorOverviewAsCSV,
  exportMentorOverviewAsPDF,
} from "@/lib/export-utils";
import {
  getCachedData,
  setCachedData,
  invalidateCache,
  CACHE_KEYS,
  CACHE_TTL,
} from "@/lib/cache";

interface AdminDashboardData {
  activeForm: MentorAllocationForm | null;
  selectedMentors: string[];
  facultyList: Profile[];
  groups: any[];
  reviewRollouts: ReviewRollout[];
  mentorOverview: MentorOverview[];
  unassignedGroups: UnassignedGroup[];
  availableMentorsForAlloc: AvailableMentor[];
}

export default function AdminDashboard() {
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
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [reviewRollouts, setReviewRollouts] = useState<ReviewRollout[]>([]);

  // New state for mentor overview and allocation
  const [mentorOverview, setMentorOverview] = useState<MentorOverview[]>([]);
  const [unassignedGroups, setUnassignedGroups] = useState<UnassignedGroup[]>(
    [],
  );
  const [availableMentorsForAlloc, setAvailableMentorsForAlloc] = useState<
    AvailableMentor[]
  >([]);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Applies a full snapshot of dashboard data in one go, so React batches it
  // into a single render - the form, stats, rollout badges, and mentor
  // overview all appear/update together instead of popping in one at a time
  // as each request resolves.
  const applyData = useCallback((data: AdminDashboardData) => {
    setActiveForm(data.activeForm);
    setSelectedMentors(data.selectedMentors);
    setFacultyList(data.facultyList);
    setGroups(data.groups);
    setReviewRollouts(data.reviewRollouts);
    setMentorOverview(data.mentorOverview);
    setUnassignedGroups(data.unassignedGroups);
    setAvailableMentorsForAlloc(data.availableMentorsForAlloc);
  }, []);

  // Semester filter state
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null);

  // Evaluations state
  const [evaluations, setEvaluations] = useState<ReviewEvaluation[]>([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);

  // Domains state
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [newDomainName, setNewDomainName] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [editingDomainName, setEditingDomainName] = useState("");

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

      if (!forceRefresh) {
        // Show cached data immediately (if any) so we're never rendering an
        // empty/default state for content the user has already seen - the
        // form, rollout badges, and stats all come from one snapshot, so
        // what we show now will be fully consistent.
        const cached = getCachedData<AdminDashboardData>(
          CACHE_KEYS.ADMIN_DASHBOARD,
        );
        if (cached) {
          applyData(cached);
          setInitialLoading(false);
        } else {
          // Nothing to show yet for the mentor panel specifically.
          setOverviewLoading(true);
        }
      } else {
        setRefreshing(true);
      }

      try {
        // All of these are independent of one another - fire them together
        // instead of one-at-a-time (was the main source of slow dashboard
        // loads).
        const [
          form,
          faculty,
          deptGroups,
          rolloutSettled,
          overview,
          allocationData,
        ] = await Promise.all([
          mentorFormApi.getActiveByDepartment(profile.department),
          profileApi.getFacultyByDepartment(profile.department),
          groupApi.getWithDetails(profile.department),
          Promise.allSettled([
            reviewsApi.getRollout("review_1"),
            reviewsApi.getRollout("review_2"),
            reviewsApi.getRollout("final_review"),
          ]),
          adminApi.getMentorOverview().catch((error) => {
            console.error("Error loading mentor overview:", error);
            return [] as MentorOverview[];
          }),
          Promise.all([
            adminApi.getUnassignedGroups(),
            adminApi.getAvailableMentors(),
          ]).catch((error) => {
            console.error("Error loading allocation data:", error);
            return [[], []] as [UnassignedGroup[], AvailableMentor[]];
          }),
        ]);

        // Annotate each group with topic-approval info - independent per
        // group, so fetch them all in parallel too.
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
            } catch (error) {
              console.error(
                `Failed to load topics for group ${group.id}:`,
                error,
              );
            }
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

        const rollouts = rolloutSettled
          .filter(
            (r): r is PromiseFulfilledResult<ReviewRollout | null> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value)
          .filter((r): r is ReviewRollout => !!r);

        const [unassigned, mentorsForAlloc] = allocationData;

        const nextData: AdminDashboardData = {
          activeForm: form as any, // Cast to avoid type mismatch with extended type
          selectedMentors: form
            ? form.availableMentors.map((m: any) => m.mentorId ?? m.id)
            : [],
          facultyList: faculty,
          groups: groupsWithDetails,
          reviewRollouts: rollouts,
          mentorOverview: overview,
          unassignedGroups: unassigned,
          availableMentorsForAlloc: mentorsForAlloc,
        };

        // Apply everything together so the form, stats, rollout badges, and
        // mentor overview all appear/update in the same render instead of
        // popping in one at a time.
        applyData(nextData);
        setCachedData(CACHE_KEYS.ADMIN_DASHBOARD, nextData, CACHE_TTL.MEDIUM);
      } catch (error: any) {
        console.error("Error loading admin data:", error);
      } finally {
        setInitialLoading(false);
        setOverviewLoading(false);
        setRefreshing(false);
      }
    },
    [profile, applyData],
  );

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

  const loadDomains = useCallback(async () => {
    try {
      setDomainsLoading(true);
      const allDomains = await domainsApi.getAll();
      setDomains(allDomains);
    } catch (error) {
      console.error("Failed to load domains:", error);
      showToast("Failed to load domains", "error");
    } finally {
      setDomainsLoading(false);
    }
  }, [showToast]);

  // Load domains when the domains tab is active
  useEffect(() => {
    if (activeTab === "domains" && domains.length === 0) {
      loadDomains();
    }
  }, [activeTab, domains.length, loadDomains]);

  const handleAddDomain = async () => {
    if (!newDomainName.trim()) return;
    setAddingDomain(true);
    try {
      await domainsApi.create({ name: newDomainName.trim() });
      setNewDomainName("");
      showToast("Domain added!", "success");
      await loadDomains();
    } catch (error: any) {
      showToast(error.message || "Failed to add domain", "error");
    } finally {
      setAddingDomain(false);
    }
  };

  const handleStartEditDomain = (domain: Domain) => {
    setEditingDomainId(domain.id);
    setEditingDomainName(domain.name);
  };

  const handleSaveEditDomain = async () => {
    if (!editingDomainId || !editingDomainName.trim()) return;
    try {
      await domainsApi.update(editingDomainId, { name: editingDomainName.trim() });
      setEditingDomainId(null);
      setEditingDomainName("");
      showToast("Domain updated!", "success");
      await loadDomains();
    } catch (error: any) {
      showToast(error.message || "Failed to update domain", "error");
    }
  };

  const handleToggleDomainActive = async (domain: Domain) => {
    try {
      await domainsApi.update(domain.id, { isActive: !domain.isActive });
      showToast(
        domain.isActive ? "Domain deactivated" : "Domain activated",
        "success",
      );
      await loadDomains();
    } catch (error: any) {
      showToast(error.message || "Failed to update domain", "error");
    }
  };

  const handleDeleteDomain = async (domain: Domain) => {
    try {
      await domainsApi.delete(domain.id);
      showToast("Domain deleted", "success");
      await loadDomains();
    } catch (error: any) {
      showToast(error.message || "Failed to delete domain", "error");
    }
  };

  const handleRefresh = () => {
    // Clear cache and reload
    invalidateCache(CACHE_KEYS.ADMIN_DASHBOARD);
    showToast("Refreshing data...", "info");
    loadData(true);
    if (activeTab === "evaluations") {
      loadEvaluations();
    }
    if (activeTab === "domains") {
      loadDomains();
    }
  };

  const handleManualAllocate = async (groupId: string, mentorId: string) => {
    try {
      await adminApi.allocateMentor({ groupId, mentorId });
      showToast("Mentor allocated successfully!", "success");
      invalidateCache(CACHE_KEYS.ADMIN_DASHBOARD);
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
      invalidateCache(CACHE_KEYS.ADMIN_DASHBOARD);
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
      invalidateCache(CACHE_KEYS.ADMIN_DASHBOARD);
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
    <DashboardLayout title="Super Admin Dashboard">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Actions Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
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
            {/* Tabs */}
            <div className="flex rounded-lg border p-1 gap-2">
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 flex-1 rounded-md" />
            </div>

            {/* Filter */}
            <div className="flex justify-end">
              <Skeleton className="h-10 w-52 rounded-md" />
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-lg border p-6 space-y-4">
                  <Skeleton className="h-8 w-10 mx-auto" />
                  <Skeleton className="h-4 w-32 mx-auto" />
                </div>
              ))}
            </div>

            {/* Mentor Card */}
            <div className="rounded-lg border p-6">
              <div className="flex justify-between">
                <div className="flex gap-4 flex-1">
                  <Skeleton className="h-14 w-14 rounded-full" />

                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-56" />
                    <Skeleton className="h-4 w-44" />

                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-7 w-40 rounded-full" />
                      <Skeleton className="h-7 w-44 rounded-full" />
                      <Skeleton className="h-7 w-52 rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-2">
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Tabs for Overview vs Management */
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="overview">
                Mentor & Group Overview
              </TabsTrigger>
              <TabsTrigger value="management">
                Form & Review Management
              </TabsTrigger>
              <TabsTrigger value="evaluations">Review Evaluations</TabsTrigger>
              <TabsTrigger value="domains">Domains</TabsTrigger>
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
                        <p className="text-sm text-gray-600">
                          Groups with Mentors
                        </p>
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
                    Select faculty mentors and roll out the mentor allocation
                    form for your department.
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
                                  onChange={() =>
                                    handleToggleMentor(faculty.id)
                                  }
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
                          {selectedMentors.length} of {facultyList.length}{" "}
                          mentors selected
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
                    Activate review phases for teams in your department. Teams
                    can submit progress once each review is rolled out.
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
            </TabsContent>

            {/* Evaluations Tab */}
            <TabsContent value="evaluations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Review Evaluations</CardTitle>
                </CardHeader>
                <CardContent>
                  {evaluationsLoading ? (
                    <div className="text-center py-8">
                      Loading evaluations...
                    </div>
                  ) : evaluations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No evaluations submitted yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {evaluations.map((evaluation: any) => {
                        const studentGrades = Array.isArray(
                          evaluation.studentGrades,
                        )
                          ? evaluation.studentGrades
                          : [];

                        return (
                          <div
                            key={evaluation.id}
                            className="border rounded-lg p-4"
                          >
                            <div className="mb-3">
                              <h4 className="font-semibold">
                                {evaluation.group?.groupId || "Group"}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Evaluator:{" "}
                                {evaluation.mentor?.name || "Unknown"}
                              </p>
                              <p className="text-sm text-gray-600">
                                Review:{" "}
                                {evaluation.reviewType
                                  ?.replace("_", " ")
                                  .toUpperCase() || "Unknown"}
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
                                    Category of Project:{" "}
                                    {evaluation.projectCategory || "-"}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Project Type:{" "}
                                    {evaluation.projectType || "-"}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-600">
                                    Domain of Project:{" "}
                                    {evaluation.projectDomain || "-"}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Quality Grade:{" "}
                                    {evaluation.qualityGrade || "-"}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Nature of Project:{" "}
                                    {evaluation.projectNature || "-"}
                                  </p>
                                </>
                              )}
                              <p className="text-sm text-gray-600">
                                Completion Percentage:{" "}
                                {evaluation.completionPercentage ?? 0}%
                              </p>
                            </div>
                            {evaluation.remarks && (
                              <p className="text-sm mt-2 text-gray-700">
                                Remarks: {evaluation.remarks}
                              </p>
                            )}
                            {evaluation.paperPublicationStatus && (
                              <p className="text-sm text-gray-600">
                                Paper Status:{" "}
                                {evaluation.paperPublicationStatus}
                              </p>
                            )}
                            <div className="mt-3">
                              <p className="text-xs font-semibold mb-1">
                                Per-Student Criteria Breakdown:
                              </p>
                              <div className="space-y-2">
                                {studentGrades.map((grade: any) => (
                                  <div
                                    key={grade.id}
                                    className="text-xs bg-gray-50 p-2 rounded"
                                  >
                                    <p className="font-medium mb-1">
                                      {grade.student?.name || "Unknown Student"}
                                    </p>
                                    {evaluation.reviewType === "review_1" ? (
                                      <>
                                        <p>
                                          Progress (10):{" "}
                                          {grade.progressMarks ?? 0}
                                        </p>
                                        <p>
                                          Contribution (10):{" "}
                                          {grade.contributionMarks ?? 0}
                                        </p>
                                        <p>
                                          Publication (5):{" "}
                                          {grade.publicationMarks ?? 0}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <p>
                                          Tech Usage (5):{" "}
                                          {grade.techUsageMarks ?? 0}
                                        </p>
                                        <p>
                                          Innovativeness (5):{" "}
                                          {grade.innovationMarks ?? 0}
                                        </p>
                                        <p>
                                          Presentation (5):{" "}
                                          {grade.presentationMarks ?? 0}
                                        </p>
                                        <p>
                                          Project Activity (5):{" "}
                                          {grade.activityMarks ?? 0}
                                        </p>
                                        <p>
                                          Synopsis (5):{" "}
                                          {grade.synopsisMarks ?? 0}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Submitted:{" "}
                              {evaluation.filledAt
                                ? new Date(
                                    evaluation.filledAt,
                                  ).toLocaleDateString()
                                : "-"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Domains Tab */}
            <TabsContent value="domains" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tags className="h-5 w-5" />
                    Project Domains
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Domains students choose from when submitting a project
                    topic. Deactivate a domain to hide it from new
                    submissions without deleting past topics that use it.
                  </p>

                  <div className="flex gap-2">
                    <Input
                      value={newDomainName}
                      onChange={(e) => setNewDomainName(e.target.value)}
                      placeholder="e.g., Cybersecurity"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddDomain();
                      }}
                    />
                    <Button
                      onClick={handleAddDomain}
                      disabled={addingDomain || !newDomainName.trim()}
                      className="gap-1 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      Add Domain
                    </Button>
                  </div>

                  {domainsLoading ? (
                    <div className="text-center py-8">Loading domains...</div>
                  ) : domains.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No domains added yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {domains.map((domain) => (
                        <div
                          key={domain.id}
                          className="flex items-center justify-between border border-gray-200 rounded-lg p-3"
                        >
                          {editingDomainId === domain.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editingDomainName}
                                onChange={(e) =>
                                  setEditingDomainName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEditDomain();
                                  if (e.key === "Escape") setEditingDomainId(null);
                                }}
                                autoFocus
                              />
                              <Button size="sm" onClick={handleSaveEditDomain}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingDomainId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {domain.name}
                                </span>
                                <Badge variant={domain.isActive ? "success" : "outline"}>
                                  {domain.isActive ? "Active" : "Inactive"}
                                </Badge>
                                {!!domain._count?.topics && (
                                  <span className="text-xs text-gray-500">
                                    {domain._count.topics} topic
                                    {domain._count.topics === 1 ? "" : "s"}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartEditDomain(domain)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleDomainActive(domain)}
                                >
                                  {domain.isActive ? "Deactivate" : "Activate"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={!!domain._count?.topics}
                                  title={
                                    domain._count?.topics
                                      ? "Used by existing topics - deactivate instead"
                                      : undefined
                                  }
                                  onClick={() => handleDeleteDomain(domain)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
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
