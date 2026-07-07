"use client";

import * as React from "react";
import {
  CheckCircle,
  Clock,
  Lock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  Percent,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { ThreadPanel, ThreadMessage } from "./thread-panel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import {
  ReviewSession,
  ReviewStatus,
  ReviewMessage,
  ReviewType,
} from "@/types";

interface ReviewSectionProps {
  reviewType: ReviewType;
  session: ReviewSession | null;
  messages: ReviewMessage[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: "student" | "faculty";
  isRolledOut: boolean;
  isUnlocked: boolean; // true if previous phase is complete
  isLeader?: boolean;
  onSubmitProgress: (percentage: number, description: string) => void;
  onUpdateProgress: (percentage: number, description: string) => void;
  onSubmitFeedback: (feedback: string) => void;
  onSendMessage: (content: string, links?: string[]) => void;
  onMarkComplete: () => void;
  meetLink?: string;
  onSetMeetLink?: (link: string) => void;
}

function getReviewTitle(type: ReviewType): string {
  switch (type) {
    case "review_1":
      return "Review 1";
    case "review_2":
      return "Review 2";
    case "final_review":
      return "Final Review";
  }
}

function getReviewDescription(type: ReviewType): string {
  switch (type) {
    case "review_1":
      return "Submit your progress after 2-3 weeks of development. Share what you've implemented and get feedback from your mentor.";
    case "review_2":
      return "Project should be 90% complete. Share your progress and address any remaining suggestions.";
    case "final_review":
      return "Present your completed project with all suggestions from previous reviews addressed.";
  }
}

function getStatusConfig(status: ReviewStatus) {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        variant: "success" as const,
        icon: CheckCircle,
      };
    case "feedback_given":
      return {
        label: "Feedback Received",
        variant: "secondary" as const,
        icon: MessageSquare,
      };
    case "submitted":
      return {
        label: "Submitted",
        variant: "outline" as const,
        icon: FileText,
      };
    case "in_progress":
      return {
        label: "In Progress",
        variant: "warning" as const,
        icon: Clock,
      };
    default:
      return {
        label: "Not Started",
        variant: "outline" as const,
        icon: Clock,
      };
  }
}

function ProgressRing({
  percentage,
  size = 80,
}: {
  percentage: number;
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-primary transition-all duration-500"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{percentage}%</span>
      </div>
    </div>
  );
}

export function ReviewSection({
  reviewType,
  session,
  messages,
  currentUserId,
  currentUserName,
  currentUserRole,
  isRolledOut,
  isUnlocked,
  isLeader = false,
  onSubmitProgress,
  onUpdateProgress,
  onSubmitFeedback,
  onSendMessage,
  onMarkComplete,
  meetLink,
  onSetMeetLink,
}: ReviewSectionProps) {
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = React.useState(false);
  const [percentage, setPercentage] = React.useState(
    session?.progressPercentage || 0,
  );
  const [description, setDescription] = React.useState(
    session?.progressDescription || "",
  );
  const [feedback, setFeedback] = React.useState("");
  const [showChat, setShowChat] = React.useState(true);

  const title = getReviewTitle(reviewType);
  const reviewDescription = getReviewDescription(reviewType);
  const statusConfig = session
    ? getStatusConfig(session.status)
    : getStatusConfig("not_started");
  const StatusIcon = statusConfig.icon;

  // Convert ReviewMessages to ThreadMessages
  const threadMessages: ThreadMessage[] = messages.map((m) => ({
    id: m.id,
    authorId: m.authorId,
    authorName: m.authorName,
    authorRole: m.authorRole,
    content: m.content,
    links: m.links,
    createdAt: m.createdAt,
  }));

  const handleSubmitProgress = () => {
    if (description.trim()) {
      if (session) {
        onUpdateProgress(percentage, description.trim());
      } else {
        onSubmitProgress(percentage, description.trim());
      }
      setShowSubmitDialog(false);
    }
  };

  const handleSubmitFeedback = () => {
    if (feedback.trim()) {
      onSubmitFeedback(feedback.trim());
      setFeedback("");
      setShowFeedbackDialog(false);
    }
  };

  // Locked state
  if (!isUnlocked) {
    return (
      <Card className="border-gray-200 bg-gray-50/50">
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Lock className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <h3 className="font-medium text-gray-700">{title} - Locked</h3>
            <p className="text-sm mt-1">
              Complete the previous phase to unlock this review.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not rolled out yet
  if (!isRolledOut) {
    return (
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="py-8">
          <div className="text-center text-amber-700">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-70" />
            <h3 className="font-medium">{title} - Coming Soon</h3>
            <p className="text-sm mt-1">
              This review phase will be activated by your department admin soon.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div
        className={`rounded-lg p-4 border ${
          session?.status === "completed"
            ? "bg-green-50 border-green-200"
            : session?.status === "feedback_given"
              ? "bg-blue-50 border-blue-200"
              : "bg-gray-50 border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon
              className={`h-5 w-5 ${
                session?.status === "completed"
                  ? "text-green-600"
                  : session?.status === "feedback_given"
                    ? "text-blue-600"
                    : "text-gray-600"
              }`}
            />
            <span className="font-medium">{title}</span>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
          {session && <ProgressRing percentage={session.progressPercentage} />}
        </div>
        <p className="text-sm text-gray-600 mt-2">{reviewDescription}</p>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Progress Update</CardTitle>
            {currentUserRole === "student" &&
              isLeader &&
              session?.status !== "completed" && (
                <Button
                  size="sm"
                  onClick={() => {
                    setPercentage(session?.progressPercentage || 0);
                    setDescription(session?.progressDescription || "");
                    setShowSubmitDialog(true);
                  }}
                >
                  {session ? "Update Progress" : "Submit Progress"}
                </Button>
              )}
            {currentUserRole === "faculty" &&
              session &&
              session.status === "submitted" && (
                <Button size="sm" onClick={() => setShowFeedbackDialog(true)}>
                  Add Feedback
                </Button>
              )}
          </div>
        </CardHeader>
        <CardContent>
          {!session ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No progress submitted yet.</p>
              {currentUserRole === "student" && isLeader && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowSubmitDialog(true)}
                >
                  Submit your progress
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress Display */}
              <div className="flex items-center gap-4">
                <ProgressRing
                  percentage={session.progressPercentage}
                  size={100}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Percent className="h-4 w-4" />
                    Progress: {session.progressPercentage}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${session.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Progress Description */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  What&apos;s been implemented:
                </h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                  {session.progressDescription}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Last updated: {new Date(session.submittedAt).toLocaleString()}
                </p>
              </div>

              {/* Mentor Feedback */}
              {session.mentorFeedback && (
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-purple-800 mb-1">
                    Mentor Feedback:
                  </h4>
                  <p className="text-sm text-purple-700 whitespace-pre-wrap">
                    {session.mentorFeedback}
                  </p>
                  {session.feedbackGivenAt && (
                    <p className="text-xs text-purple-500 mt-1">
                      {new Date(session.feedbackGivenAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Mark Complete Button */}
              {currentUserRole === "faculty" &&
                session.status === "feedback_given" && (
                  <Button onClick={onMarkComplete} className="w-full gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Mark Review as Complete
                  </Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discussion Thread */}
      <Card>
        <CardHeader className="pb-2">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowChat(!showChat)}
          >
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Discussion
              <span className="text-sm font-normal text-gray-500">
                ({messages.length} messages)
              </span>
            </CardTitle>
            {showChat ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </CardHeader>
        {showChat && (
          <CardContent>
            <ThreadPanel
              title={`${title} Discussion`}
              messages={threadMessages}
              onSendMessage={onSendMessage}
              currentUserRole={currentUserRole}
              placeholder="Discuss progress, ask questions, or share updates..."
              emptyMessage="Start the discussion about this review"
              showHeader={false}
              maxHeight="300px"
              pinnedMeetLink={meetLink}
              onSetMeetLink={onSetMeetLink}
              canSetMeetLink={isLeader}
            />
          </CardContent>
        )}
      </Card>

      {/* Submit Progress Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {session ? "Update Progress" : "Submit Progress"}
            </DialogTitle>
            <DialogDescription>
              Share your current progress with your mentor. Be specific about
              what you&apos;ve implemented.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Progress Percentage
              </label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentage}
                  onChange={(e) => setPercentage(parseInt(e.target.value))}
                  className="flex-1"
                />
                <div className="flex items-center gap-1 w-20">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={percentage}
                    onChange={(e) =>
                      setPercentage(
                        Math.min(
                          100,
                          Math.max(0, parseInt(e.target.value) || 0),
                        ),
                      )
                    }
                    className="text-center"
                  />
                  <span className="text-gray-500">%</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                What have you implemented?
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the features you've implemented, challenges faced, and next steps..."
                className="mt-1 min-h-[150px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitProgress}
              disabled={!description.trim()}
            >
              <Send className="h-4 w-4 mr-1" />
              {session ? "Update" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Feedback Dialog (Faculty) */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Feedback</DialogTitle>
            <DialogDescription>
              Provide constructive feedback and suggestions for the
              student&apos;s progress.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your suggestions, areas for improvement, or commendations..."
              className="min-h-[150px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFeedbackDialog(false);
                setFeedback("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitFeedback} disabled={!feedback.trim()}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
