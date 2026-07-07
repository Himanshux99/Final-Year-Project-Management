"use client";

import * as React from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
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
import { ProjectTopic, TopicStatus, TopicMessage } from "@/types";

interface TopicApprovalSectionProps {
  topics: ProjectTopic[];
  messages: TopicMessage[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: "student" | "faculty";
  groupId: string;
  isLeader?: boolean;
  onSubmitTopic: (title: string, description: string) => void;
  onApproveTopic: (topicId: string) => void;
  onRejectTopic: (topicId: string) => void;
  onRequestRevision: (topicId: string, feedback: string) => void;
  onSendMessage: (content: string, links?: string[]) => void;
  maxTopics?: number;
  meetLink?: string;
  onSetMeetLink?: (link: string) => void;
}

function getStatusConfig(status: TopicStatus) {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        variant: "success" as const,
        icon: CheckCircle,
        color: "text-green-600",
      };
    case "rejected":
      return {
        label: "Rejected",
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-red-600",
      };
    case "revision_requested":
      return {
        label: "Revision Requested",
        variant: "warning" as const,
        icon: AlertCircle,
        color: "text-amber-600",
      };
    case "under_review":
      return {
        label: "Under Review",
        variant: "secondary" as const,
        icon: Clock,
        color: "text-gray-600",
      };
    default:
      return {
        label: "Submitted",
        variant: "outline" as const,
        icon: Clock,
        color: "text-gray-500",
      };
  }
}

export function TopicApprovalSection({
  topics,
  messages,
  currentUserId,
  currentUserName,
  currentUserRole,
  groupId,
  isLeader = false,
  onSubmitTopic,
  onApproveTopic,
  onRejectTopic,
  onRequestRevision,
  onSendMessage,
  maxTopics = 3,
  meetLink,
  onSetMeetLink,
}: TopicApprovalSectionProps) {
  const [showAddTopic, setShowAddTopic] = React.useState(false);
  const [newTopicTitle, setNewTopicTitle] = React.useState("");
  const [newTopicDescription, setNewTopicDescription] = React.useState("");
  const [expandedTopic, setExpandedTopic] = React.useState<string | null>(null);
  const [showRevisionDialog, setShowRevisionDialog] = React.useState(false);
  const [selectedTopicForRevision, setSelectedTopicForRevision] =
    React.useState<string | null>(null);
  const [revisionFeedback, setRevisionFeedback] = React.useState("");
  const [showChat, setShowChat] = React.useState(true);

  const approvedTopic = topics.find((t) => t.status === "approved");
  const pendingTopics = topics.filter(
    (t) => t.status === "submitted" || t.status === "under_review",
  );
  const canAddMoreTopics =
    currentUserRole === "student" &&
    !approvedTopic &&
    topics.filter((t) => t.status !== "rejected").length < maxTopics;

  // Convert TopicMessages to ThreadMessages for the panel
  const threadMessages: ThreadMessage[] = messages.map((m) => ({
    id: m.id,
    authorId: m.authorId,
    authorName: m.authorName,
    authorRole: m.authorRole,
    content: m.content,
    links: m.links,
    createdAt: m.createdAt,
  }));

  const handleSubmitTopic = () => {
    if (newTopicTitle.trim() && newTopicDescription.trim()) {
      onSubmitTopic(newTopicTitle.trim(), newTopicDescription.trim());
      setNewTopicTitle("");
      setNewTopicDescription("");
      setShowAddTopic(false);
    }
  };

  const handleRequestRevision = () => {
    if (selectedTopicForRevision && revisionFeedback.trim()) {
      onRequestRevision(selectedTopicForRevision, revisionFeedback.trim());
      setShowRevisionDialog(false);
      setSelectedTopicForRevision(null);
      setRevisionFeedback("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      {approvedTopic ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Topic Approved!</span>
          </div>
          <p className="mt-1 text-green-700 font-semibold">
            {approvedTopic.title}
          </p>
          <p className="mt-1 text-sm text-green-600">
            {approvedTopic.description}
          </p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <Clock className="h-5 w-5" />
            <span className="font-medium">Topic Pending Approval</span>
          </div>
          <p className="mt-1 text-sm text-amber-700">
            {currentUserRole === "student"
              ? `Submit up to ${maxTopics} topics for your mentor to review. Your mentor will approve one topic for your project.`
              : "Review the submitted topics and approve one for this team's project."}
          </p>
        </div>
      )}

      {/* Topics List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Submitted Topics</CardTitle>
            {canAddMoreTopics && (
              <Button
                size="sm"
                onClick={() => setShowAddTopic(true)}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Topic
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {topics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No topics submitted yet.</p>
              {canAddMoreTopics && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowAddTopic(true)}
                >
                  Submit your first topic
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {topics.map((topic, index) => {
                const statusConfig = getStatusConfig(topic.status);
                const StatusIcon = statusConfig.icon;
                const isExpanded = expandedTopic === topic.id;

                return (
                  <div
                    key={topic.id}
                    className={`border rounded-lg overflow-hidden ${
                      topic.status === "approved"
                        ? "border-green-300 bg-green-50/50"
                        : topic.status === "rejected"
                          ? "border-red-200 bg-red-50/30"
                          : "border-gray-200"
                    }`}
                  >
                    {/* Topic Header */}
                    <div
                      className="flex items-start justify-between p-3 cursor-pointer hover:bg-gray-50/50"
                      onClick={() =>
                        setExpandedTopic(isExpanded ? null : topic.id)
                      }
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500">
                            #{index + 1}
                          </span>
                          <h4 className="font-medium text-gray-900 truncate">
                            {topic.title}
                          </h4>
                        </div>
                        {!isExpanded && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {topic.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant={statusConfig.variant}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-gray-100">
                        <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">
                          {topic.description}
                        </p>

                        <div className="text-xs text-gray-400 mt-2">
                          Submitted on{" "}
                          {new Date(topic.submittedAt).toLocaleDateString()}
                        </div>

                        {/* Faculty Actions */}
                        {currentUserRole === "faculty" &&
                          !approvedTopic &&
                          topic.status !== "rejected" && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApproveTopic(topic.id);
                                }}
                                className="gap-1"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTopicForRevision(topic.id);
                                  setShowRevisionDialog(true);
                                }}
                              >
                                Request Revision
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRejectTopic(topic.id);
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
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
              title="Topic Discussion"
              messages={threadMessages}
              onSendMessage={onSendMessage}
              currentUserRole={currentUserRole}
              placeholder={
                currentUserRole === "student"
                  ? "Discuss your topics with your mentor..."
                  : "Provide feedback or ask questions..."
              }
              emptyMessage="Start discussing topics with your team/mentor"
              showHeader={false}
              maxHeight="300px"
              pinnedMeetLink={meetLink}
              onSetMeetLink={onSetMeetLink}
              canSetMeetLink={isLeader}
            />
          </CardContent>
        )}
      </Card>

      {/* Add Topic Dialog */}
      <Dialog open={showAddTopic} onOpenChange={setShowAddTopic}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit New Topic</DialogTitle>
            <DialogDescription>
              Provide a clear title and detailed description for your project
              topic.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Topic Title
              </label>
              <Input
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder="e.g., AI-Powered Student Attendance System"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Description
              </label>
              <Textarea
                value={newTopicDescription}
                onChange={(e) => setNewTopicDescription(e.target.value)}
                placeholder="Describe your project idea, objectives, technologies you plan to use..."
                className="mt-1 min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTopic(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitTopic}
              disabled={!newTopicTitle.trim() || !newTopicDescription.trim()}
            >
              Submit Topic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Request Dialog */}
      <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Provide feedback on what changes or improvements you&apos;d like
              to see in this topic.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={revisionFeedback}
              onChange={(e) => setRevisionFeedback(e.target.value)}
              placeholder="Explain what changes you'd like the student to make..."
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRevisionDialog(false);
                setSelectedTopicForRevision(null);
                setRevisionFeedback("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestRevision}
              disabled={!revisionFeedback.trim()}
            >
              Send Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
