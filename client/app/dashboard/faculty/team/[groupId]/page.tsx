"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TopicApprovalSection } from "@/components/topic-approval-section";
import { ReviewSection } from "@/components/review-section";
import { TopicApprovalFormUpload } from "@/components/topic-approval-form-upload";
import { ReviewEvaluationForm } from "@/components/review-evaluation-form";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { evaluationsApi, groupApi, projectTopicsApi, reviewsApi, topicApprovalApi } from "@/lib/api";
import type {
  Group,
  ProjectTopic,
  TopicMessage,
  ReviewMessage,
  ReviewSession as ReviewSessionType,
  ReviewType,
  ReviewEvaluation,
} from "@/types";
import { DeleteTeamButton } from '@/components/delete-team-button';

export default function FacultyTeamPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [group, setGroup] = useState<Group | null>(null);
  const [topics, setTopics] = useState<ProjectTopic[]>([]);
  const [topicMessages, setTopicMessages] = useState<TopicMessage[]>([]);
  const [topicApprovalDoc, setTopicApprovalDoc] = useState<any | null>(null);
  const [review1Session, setReview1Session] = useState<ReviewSessionType | null>(null);
  const [review2Session, setReview2Session] = useState<ReviewSessionType | null>(null);
  const [finalReviewSession, setFinalReviewSession] = useState<ReviewSessionType | null>(null);
  const [review1Messages, setReview1Messages] = useState<ReviewMessage[]>([]);
  const [review2Messages, setReview2Messages] = useState<ReviewMessage[]>([]);
  const [finalReviewMessages, setFinalReviewMessages] = useState<ReviewMessage[]>([]);
  const [review1RolledOut, setReview1RolledOut] = useState(false);
  const [review2RolledOut, setReview2RolledOut] = useState(false);
  const [finalReviewRolledOut, setFinalReviewRolledOut] = useState(false);
  const [groupEvaluations, setGroupEvaluations] = useState<ReviewEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "topic");
  const [showEmbeddedEvaluation, setShowEmbeddedEvaluation] = useState(false);
  const [evaluationReviewType, setEvaluationReviewType] = useState<ReviewType>("review_1");
  const [evaluationSessionId, setEvaluationSessionId] = useState("");

  const groupId = params.groupId;
  const hasApprovedTopic = topics.some((t) => t.status === "approved");
  const hasTopicApprovalDoc = !!topicApprovalDoc;
  const review1Evaluation = groupEvaluations.find((evaluation) => evaluation.reviewType === "review_1");
  const review2Evaluation = groupEvaluations.find((evaluation) => evaluation.reviewType === "review_2");

  const loadTeamData = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const groupData = await groupApi.getById(groupId);
      setGroup(groupData as any);

      const [topicsData, messagesData] = await Promise.all([
        projectTopicsApi.getTopicsByGroupId(groupId),
        projectTopicsApi.getMessagesByGroupId(groupId),
      ]);
      setTopics(topicsData);
      setTopicMessages(messagesData);

      const evaluations = await evaluationsApi.getByGroupId(groupId).catch(() => []);
      setGroupEvaluations(evaluations);

      try {
        const doc = await topicApprovalApi.getByGroupId(groupId);
        setTopicApprovalDoc(doc);
      } catch {
        setTopicApprovalDoc(null);
      }

      const [r1Rollout, r2Rollout, frRollout] = await Promise.all([
        reviewsApi.getRollout("review_1").catch(() => null),
        reviewsApi.getRollout("review_2").catch(() => null),
        reviewsApi.getRollout("final_review").catch(() => null),
      ]);
      setReview1RolledOut(!!r1Rollout?.isActive);
      setReview2RolledOut(!!r2Rollout?.isActive);
      setFinalReviewRolledOut(!!frRollout?.isActive);

      const [r1Session, r2Session, frSession] = await Promise.all([
        reviewsApi.getSessionByGroupId("review_1", groupId).catch(() => null),
        reviewsApi.getSessionByGroupId("review_2", groupId).catch(() => null),
        reviewsApi.getSessionByGroupId("final_review", groupId).catch(() => null),
      ]);
      setReview1Session(r1Session);
      setReview2Session(r2Session);
      setFinalReviewSession(frSession);

      if (r1Session?.id) {
        setReview1Messages(await reviewsApi.getMessagesBySession(r1Session.id).catch(() => []));
      } else {
        setReview1Messages([]);
      }
      if (r2Session?.id) {
        setReview2Messages(await reviewsApi.getMessagesBySession(r2Session.id).catch(() => []));
      } else {
        setReview2Messages([]);
      }
      if (frSession?.id) {
        setFinalReviewMessages(await reviewsApi.getMessagesBySession(frSession.id).catch(() => []));
      } else {
        setFinalReviewMessages([]);
      }
    } catch (error) {
      console.error("Failed to load team data:", error);
      showToast("Failed to load team data", "error");
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) {
      router.push("/auth/login");
      return;
    }
    if (profile.role !== "faculty" && profile.role !== "super_admin") {
      router.push("/dashboard");
      return;
    }
    loadTeamData();
  }, [authLoading, user, profile, router, loadTeamData]);

  const handleSubmitTopic = async (title: string, description: string, file?: File) => {
    try {
      await projectTopicsApi.create({ title, description }, file);
      showToast("Topic submitted!", "success");
      await loadTeamData();
    } catch (error: any) {
      showToast(error.message || "Failed to submit topic", "error");
    }
  };

  const handleApproveTopic = async (topicId: string) => {
    try {
      await projectTopicsApi.approve(topicId);
      showToast("Topic approved!", "success");
      await loadTeamData();
    } catch (error: any) {
      showToast(error.message || "Failed to approve topic", "error");
    }
  };

  const handleRejectTopic = async (topicId: string) => {
    try {
      await projectTopicsApi.reject(topicId);
      showToast("Topic rejected", "info");
      await loadTeamData();
    } catch (error: any) {
      showToast(error.message || "Failed to reject topic", "error");
    }
  };

  const handleEditTopic = async (topicId: string, title: string, description: string, file?: File) => { return;}
  const handleRequestRevision = async (topicId: string, feedback: string) => {
    try {
      await projectTopicsApi.requestRevision(topicId, feedback);
      showToast("Revision requested", "success");
      await loadTeamData();
    } catch (error: any) {
      showToast(error.message || "Failed to request revision", "error");
    }
  };

  const handleSendTopicMessage = async (content: string, links?: string[]) => {
    if (!groupId) return;
    try {
      await projectTopicsApi.addMessage({
        topicId: "general",
        content,
        links: links || [],
        groupId,
      });
      showToast("Message sent!", "success");
      await loadTeamData();
    } catch (error: any) {
      showToast(error.message || "Failed to send message", "error");
    }
  };

  const handleSubmitFeedback = async (reviewType: ReviewType, feedback: string) => {
    const session =
      reviewType === "review_1"
        ? review1Session
        : reviewType === "review_2"
        ? review2Session
        : finalReviewSession;
    if (!session?.id) {
      showToast("Review session not found", "error");
      return;
    }
    try {
      await reviewsApi.submitFeedback(session.id, feedback);
      showToast("Feedback submitted!", "success");
      await loadTeamData();
    } catch (error: any) {
      showToast(error.message || "Failed to submit feedback", "error");
    }
  };

  const handleMarkComplete = async (reviewType: ReviewType) => {
    const session =
      reviewType === "review_1"
        ? review1Session
        : reviewType === "review_2"
        ? review2Session
        : finalReviewSession;
    if (!session?.id) {
      showToast("Review session not found", "error");
      return;
    }
    if (reviewType === "review_1" || reviewType === "review_2") {
      setEvaluationReviewType(reviewType);
      setEvaluationSessionId(session.id);
      setShowEmbeddedEvaluation(true);
      return;
    }
    try {
      await reviewsApi.markComplete(session.id);
      showToast("Review marked complete!", "success");
      session.status = "completed"; // Update the session status locally
      await loadTeamData();
    } catch (error: any) {
      showToast(error.message || "Failed to mark complete", "error");
    }
  };

  const handleEvaluationSubmit = async () => {
    try {
      await reviewsApi.markComplete(evaluationSessionId);
      showToast("Evaluation submitted and review marked complete!", "success");
      setShowEmbeddedEvaluation(false);
      await loadTeamData();
    } catch (error: any) {
      showToast(error.message || "Failed to mark complete", "error");
    }
  };

  const handleSendReviewMessage = async (
    reviewType: ReviewType,
    content: string,
    links?: string[],
  ) => {
    const session =
      reviewType === "review_1"
        ? review1Session
        : reviewType === "review_2"
        ? review2Session
        : finalReviewSession;
    if (!session?.id) {
      showToast("Review session not found", "error");
      return;
    }
    try {
      await reviewsApi.addMessage({ sessionId: session.id, content, links: links || [] });
      showToast("Message sent!", "success");
      await loadTeamData();
    } catch (error: any) {
      showToast(error.message || "Failed to send message", "error");
    }
  };

  const renderEvaluationView = (evaluation: ReviewEvaluation) => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div>
        <h3 className="font-semibold">Submitted Evaluation</h3>
        <p className="text-sm text-gray-600">
          Filled on {evaluation.filledAt ? new Date(evaluation.filledAt).toLocaleDateString() : "-"}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <p><span className="font-medium">Division:</span> {evaluation.division || "-"}</p>
        <p><span className="font-medium">Guide:</span> {evaluation.projectGuide || "-"}</p>
        <p className="md:col-span-2"><span className="font-medium">Title:</span> {evaluation.projectTitle || "-"}</p>
        <p><span className="font-medium">Completion:</span> {evaluation.completionPercentage ?? 0}%</p>
        {evaluation.reviewType === "review_1" ? (
          <>
            <p><span className="font-medium">Category:</span> {evaluation.projectCategory || "-"}</p>
            <p><span className="font-medium">Type:</span> {evaluation.projectType || "-"}</p>
          </>
        ) : (
          <>
            <p><span className="font-medium">Domain:</span> {evaluation.projectDomain || "-"}</p>
            <p><span className="font-medium">Quality Grade:</span> {evaluation.qualityGrade || "-"}</p>
            <p><span className="font-medium">Nature:</span> {evaluation.projectNature || "-"}</p>
          </>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Student-wise Marks</p>
        {evaluation.studentGrades.map((grade) => (
          <div key={grade.id} className="rounded border bg-gray-50 p-2 text-sm">
            <p className="font-medium">{grade.student?.name || "Student"}</p>
            {evaluation.reviewType === "review_1" ? (
              <p className="text-gray-700">
                Progress: {grade.progressMarks ?? 0}, Contribution: {grade.contributionMarks ?? 0}, Publication:{" "}
                {grade.publicationMarks ?? 0}
              </p>
            ) : (
              <p className="text-gray-700">
                Tech: {grade.techUsageMarks ?? 0}, Innovation: {grade.innovationMarks ?? 0}, Presentation:{" "}
                {grade.presentationMarks ?? 0}, Activity: {grade.activityMarks ?? 0}, Synopsis:{" "}
                {grade.synopsisMarks ?? 0}
              </p>
            )}
            <p className="font-medium">Total: {grade.totalMarks}/25</p>
          </div>
        ))}
      </div>
      {evaluation.remarks && (
        <p className="text-sm"><span className="font-medium">Remarks:</span> {evaluation.remarks}</p>
      )}
    </div>
  );

  if (loading || !profile || !group) {
    return (
      <DashboardLayout title="Faculty Dashboard">
        <div className="max-w-4xl mx-auto py-8 text-center text-gray-500">Loading team...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Faculty Dashboard">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => router.push("/dashboard/faculty")}>
            ← Back to Dashboard
          </Button>
          <Button variant="outline" onClick={loadTeamData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Group {group.groupId}</h2>
              <p className="text-sm text-gray-600">
                Mentor: <span className="font-medium">{profile.name}</span>
              </p>
            </div>
            {hasApprovedTopic && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Approved Topic</p>
                <p className="font-medium text-green-700 max-w-[280px] truncate">
                  {topics.find((t) => t.status === "approved")?.title}
                </p>
              </div>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="topic">Topic</TabsTrigger>
            <TabsTrigger value="review1" disabled={!hasApprovedTopic || !hasTopicApprovalDoc}>
              Review 1
            </TabsTrigger>
            <TabsTrigger
              value="review2"
              disabled={!hasApprovedTopic || !hasTopicApprovalDoc || review1Session?.status !== "completed"}
            >
              Review 2
            </TabsTrigger>
            <TabsTrigger
              value="final"
              disabled={!hasApprovedTopic || !hasTopicApprovalDoc || review2Session?.status !== "completed"}
            >
              Final
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topic" className="space-y-6">
            <TopicApprovalFormUpload
              document={topicApprovalDoc}
              isLeader={false}
              currentUserRole="faculty"
              onDocumentChange={loadTeamData}
            />
            <TopicApprovalSection
              topics={topics}
              messages={topicMessages}
              currentUserId={profile.id}
              currentUserName={profile.name}
              currentUserRole="faculty"
              groupId={group.id}
              isLeader={false}
              onSubmitTopic={handleSubmitTopic}
              onUpdateTopic={handleEditTopic}
              onApproveTopic={handleApproveTopic}
              onRejectTopic={handleRejectTopic}
              onRequestRevision={handleRequestRevision}
              onSendMessage={handleSendTopicMessage}
              meetLink={group.meetLink ?? undefined}
            />
          </TabsContent>

          <TabsContent value="review1" className="space-y-6">
            {showEmbeddedEvaluation && evaluationReviewType === "review_1" ? (
              <ReviewEvaluationForm
                sessionId={evaluationSessionId}
                groupId={group.id}
                reviewType="review_1"
                open={true}
                embedded
                onSubmit={() => handleEvaluationSubmit()}
                onCancel={() => setShowEmbeddedEvaluation(false)}
              />
            ) : (
              <ReviewSection
                reviewType="review_1"
                session={review1Session}
                messages={review1Messages}
                currentUserId={profile.id}
                currentUserName={profile.name}
                currentUserRole="faculty"
                isRolledOut={review1RolledOut}
                isUnlocked={hasApprovedTopic && hasTopicApprovalDoc}
                isLeader={false}
                onSubmitProgress={() => showToast("Only students can submit progress", "error")}
                onUpdateProgress={() => showToast("Only students can update progress", "error")}
                onSubmitFeedback={(f) => handleSubmitFeedback("review_1", f)}
                onSendMessage={(c, l) => handleSendReviewMessage("review_1", c, l)}
                onMarkComplete={() => handleMarkComplete("review_1")}
                meetLink={review1Session?.meetLink ?? undefined}
              />
            )}
            {!showEmbeddedEvaluation && review1Evaluation && renderEvaluationView(review1Evaluation)}
          </TabsContent>

          <TabsContent value="review2" className="space-y-6">
            {showEmbeddedEvaluation && evaluationReviewType === "review_2" ? (
              <ReviewEvaluationForm
                sessionId={evaluationSessionId}
                groupId={group.id}
                reviewType="review_2"
                open={true}
                embedded
                onSubmit={() => handleEvaluationSubmit()}
                onCancel={() => setShowEmbeddedEvaluation(false)}
              />
            ) : (
              <ReviewSection
                reviewType="review_2"
                session={review2Session}
                messages={review2Messages}
                currentUserId={profile.id}
                currentUserName={profile.name}
                currentUserRole="faculty"
                isRolledOut={review2RolledOut}
                isUnlocked={hasApprovedTopic && hasTopicApprovalDoc && review1Session?.status === "completed"}
                isLeader={false}
                onSubmitProgress={() => showToast("Only students can submit progress", "error")}
                onUpdateProgress={() => showToast("Only students can update progress", "error")}
                onSubmitFeedback={(f) => handleSubmitFeedback("review_2", f)}
                onSendMessage={(c, l) => handleSendReviewMessage("review_2", c, l)}
                onMarkComplete={() => handleMarkComplete("review_2")}
                meetLink={review2Session?.meetLink ?? undefined}
              />
            )}
            {!showEmbeddedEvaluation && review2Evaluation && renderEvaluationView(review2Evaluation)}
          </TabsContent>

          <TabsContent value="final" className="space-y-6">
            <ReviewSection
              reviewType="final_review"
              session={finalReviewSession}
              messages={finalReviewMessages}
              currentUserId={profile.id}
              currentUserName={profile.name}
              currentUserRole="faculty"
              isRolledOut={finalReviewRolledOut}
              isUnlocked={hasApprovedTopic && hasTopicApprovalDoc && review2Session?.status === "completed"}
              isLeader={false}
              onSubmitProgress={() => showToast("Only students can submit progress", "error")}
              onUpdateProgress={() => showToast("Only students can update progress", "error")}
              onSubmitFeedback={(f) => handleSubmitFeedback("final_review", f)}
              onSendMessage={(c, l) => handleSendReviewMessage("final_review", c, l)}
              onMarkComplete={() => handleMarkComplete("final_review")}
              meetLink={finalReviewSession?.meetLink ?? undefined}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

