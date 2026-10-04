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
  FileText,
  Download,
  Pencil,
  Lightbulb,
  Upload,
  X,
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
import { DomainChips } from "./domain-chips";
import { ProjectTopic, TopicStatus, TopicMessage, Domain } from "@/types";

interface TopicApprovalSectionProps {
  topics: ProjectTopic[];
  messages: TopicMessage[];
  domains: Domain[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: "student" | "faculty";
  groupId: string;
  isLeader?: boolean;
  onSubmitTopic: (
    title: string,
    description: string,
    domainIds: string[],
    file?: File,
  ) => void;
  onUpdateTopic: (
    topicId: string,
    title: string,
    description: string,
    domainIds: string[],
    file?: File,
  ) => void;
  onApproveTopic: (topicId: string) => void;
  onRejectTopic: (topicId: string) => void;
  onRequestRevision: (topicId: string, feedback: string) => void;
  onSendMessage: (content: string, links?: string[]) => void;
  maxTopics?: number;
  meetLink?: string;
  onSetMeetLink?: (link: string) => void;
}

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 1000;
const MAX_DOC_BYTES = 10 * 1024 * 1024;

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
  domains,
  currentUserRole,
  isLeader = false,
  onSubmitTopic,
  onUpdateTopic,
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
  const [newTopicDomainIds, setNewTopicDomainIds] = React.useState<string[]>([]);
  const [newTopicFile, setNewTopicFile] = React.useState<File | null>(null);
  const [expandedTopic, setExpandedTopic] = React.useState<string | null>(null);
  const [showRevisionDialog, setShowRevisionDialog] = React.useState(false);
  const [selectedTopicForRevision, setSelectedTopicForRevision] =
    React.useState<string | null>(null);
  const [revisionFeedback, setRevisionFeedback] = React.useState("");
  const [showChat, setShowChat] = React.useState(true);
  const [editingTopic, setEditingTopic] = React.useState<ProjectTopic | null>(
    null,
  );

  const [fileError, setFileError] = React.useState<string | null>(null);

  const closeTopicDialog = () => {
    setShowAddTopic(false);
    setEditingTopic(null);
    setNewTopicTitle("");
    setNewTopicDescription("");
    setNewTopicDomainIds([]);
    setNewTopicFile(null);
    setFileError(null);
  };

  const openNewTopicDialog = () => {
    closeTopicDialog();
    setShowAddTopic(true);
  };

  const approvedTopic = topics.find((t) => t.status === "approved");
  const activeTopicCount = topics.filter((t) => t.status !== "rejected").length;
  const canAddMoreTopics =
    currentUserRole === "student" &&
    !approvedTopic &&
    activeTopicCount < maxTopics;

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
    if (newTopicTitle.trim() && newTopicDescription.trim() && newTopicDomainIds.length > 0) {
      if (editingTopic) {
        onUpdateTopic(
          editingTopic.id,
          newTopicTitle.trim(),
          newTopicDescription.trim(),
          newTopicDomainIds,
          newTopicFile || undefined,
        );
      } else {
        onSubmitTopic(
          newTopicTitle.trim(),
          newTopicDescription.trim(),
          newTopicDomainIds,
          newTopicFile || undefined,
        );
      }

      closeTopicDialog();
    }
  };

  const handleEditTopic = (topic: ProjectTopic) => {
    setEditingTopic(topic);

    setNewTopicTitle(topic.title);
    setNewTopicDescription(topic.description);
    // Skip domains the admin has since deactivated; they can't be re-submitted.
    setNewTopicDomainIds(
      (topic.domains ?? [])
        .map((d) => d.id)
        .filter((id) => domains.some((active) => active.id === id)),
    );
    setNewTopicFile(null);

    setShowAddTopic(true);
  };

  const handleRequestRevision = () => {
    if (selectedTopicForRevision && revisionFeedback.trim()) {
      const topic = topics.find((t) => t.id === selectedTopicForRevision);

      if (!topic) return;

      // Sort by submission time (oldest -> newest)
      const sortedTopics = [...topics].sort(
        (a, b) =>
          new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
      );

      const topicNumber = sortedTopics.findIndex((t) => t.id === topic.id) + 1;

      const formattedFeedback = `Topic #${topicNumber}: ${topic.title}\n\n${revisionFeedback.trim()}`;

      onRequestRevision(topic.id, formattedFeedback);

      setShowRevisionDialog(false);
      setSelectedTopicForRevision(null);
      setRevisionFeedback("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      {approvedTopic ? (
        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-100 p-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Approved project topic
              </p>
              <h3 className="mt-0.5 text-lg font-semibold text-green-900">
                {approvedTopic.title}
              </h3>
              {approvedTopic.domains && approvedTopic.domains.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {approvedTopic.domains.map((d) => (
                    <Badge key={d.id} variant="success">
                      {d.name}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="mt-2 whitespace-pre-wrap text-sm text-green-800/90">
                {approvedTopic.description}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-100 p-2 text-amber-700">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                Topic pending approval
              </p>
              <p className="mt-0.5 text-sm text-amber-800">
                {currentUserRole === "student"
                  ? `Submit up to ${maxTopics} topic ideas. Your mentor will approve one for your project.`
                  : "Review the submitted topics and approve one for this team's project."}
              </p>
              {currentUserRole === "student" && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex gap-1.5" aria-hidden="true">
                    {Array.from({ length: maxTopics }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-2 w-8 rounded-full ${
                          i < activeTopicCount ? "bg-amber-500" : "bg-amber-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-amber-800">
                    {activeTopicCount} of {maxTopics} slots used
                    {topics.length > activeTopicCount &&
                      " (rejected topics do not count)"}
                  </span>
                </div>
              )}
            </div>
          </div>
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
                onClick={openNewTopicDialog}
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
            <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-gray-500">
              <Lightbulb className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="font-medium text-gray-700">No topics submitted yet.</p>
              <p className="mt-0.5 text-sm">
                {currentUserRole === "student"
                  ? "Pitch your best project ideas to your mentor."
                  : "The team has not submitted any topics yet."}
              </p>
              {canAddMoreTopics && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={openNewTopicDialog}
                >
                  Submit your first topic
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {[...topics]
                .sort(
                  (a, b) =>
                    new Date(a.submittedAt).getTime() -
                    new Date(b.submittedAt).getTime(),
                )
                .reverse()
                .map((topic, _, sortedTopics) => {
                  const topicNumber =
                    sortedTopics.length -
                    sortedTopics.findIndex((t) => t.id === topic.id);

                  const statusConfig = getStatusConfig(topic.status);
                  const StatusIcon = statusConfig.icon;
                  const isExpanded = expandedTopic === topic.id;

                  return (
                    <div
                      key={topic.id}
                      className={`border rounded-xl overflow-hidden shadow-sm ${
                        topic.status === "approved"
                          ? "border-green-300 bg-green-50/50"
                          : topic.status === "rejected"
                            ? "border-red-200 bg-red-50/30"
                            : "border-gray-200"
                      }`}
                    >
                      {/* Topic Header */}
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        className="flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-gray-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        onClick={() =>
                          setExpandedTopic(isExpanded ? null : topic.id)
                        }
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedTopic(isExpanded ? null : topic.id);
                          }
                        }}
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                          {topicNumber}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h4 className="break-words font-medium text-gray-900">
                              {topic.title}
                            </h4>
                            {currentUserRole === "faculty" &&
                              topic.lastEditedAt &&
                              topic.status !== "approved" &&
                              topic.status !== "rejected" && (
                                <Badge
                                  variant="warning"
                                  className="shrink-0"
                                  title={`Edited ${new Date(topic.lastEditedAt).toLocaleString()}`}
                                >
                                  Updated by student
                                </Badge>
                              )}
                          </div>
                          {topic.domains && topic.domains.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {topic.domains.map((d) => (
                                <span
                                  key={d.id}
                                  className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                                >
                                  {d.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {!isExpanded && (
                            <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">
                              {topic.description}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                          <Badge variant={statusConfig.variant}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                          {currentUserRole === "student" &&
                            topic.status !== "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTopic(topic);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                            )}
                          {isExpanded ? (
                            <ChevronUp className="hidden h-4 w-4 text-gray-400 sm:block" />
                          ) : (
                            <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 pb-4">
                          <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">
                            {topic.description}
                          </p>

                          <div className="text-xs text-gray-400 mt-2">
                            Submitted on{" "}
                            {new Date(topic.submittedAt).toLocaleDateString()}
                          </div>

                          {topic.document && (
                            <a
                              href={topic.document.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={topic.document.filename}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              <span>{topic.document.filename}</span>
                              <Download className="h-4 w-4" />
                            </a>
                          )}

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
      <Dialog
        open={showAddTopic}
        onOpenChange={(open) =>
          open ? setShowAddTopic(true) : closeTopicDialog()
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTopic ? "Update Topic" : "Submit Topic"}
            </DialogTitle>
            <DialogDescription>
              {editingTopic
                ? "Your mentor will be notified of the changes."
                : "A clear title and a concrete description help your mentor decide faster."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Topic title
                </label>
                <span className="text-xs text-gray-400">
                  {newTopicTitle.length}/{TITLE_MAX}
                </span>
              </div>
              <Input
                value={newTopicTitle}
                maxLength={TITLE_MAX}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder="e.g., AI-Powered Student Attendance System"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Domains
                </label>
                <span className="text-xs text-gray-400">
                  {newTopicDomainIds.length > 0
                    ? `${newTopicDomainIds.length} selected`
                    : "Pick at least one"}
                </span>
              </div>
              <div className="mt-2">
                <DomainChips
                  domains={domains}
                  selectedIds={newTopicDomainIds}
                  onChange={setNewTopicDomainIds}
                />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <span className="text-xs text-gray-400">
                  {newTopicDescription.length}/{DESCRIPTION_MAX}
                </span>
              </div>
              <Textarea
                value={newTopicDescription}
                maxLength={DESCRIPTION_MAX}
                onChange={(e) => setNewTopicDescription(e.target.value)}
                placeholder="Describe the problem, objectives and the technologies you plan to use..."
                className="mt-1 min-h-[120px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Supporting document{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              {newTopicFile ? (
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-indigo-600" />
                  <span className="min-w-0 flex-1 truncate">
                    {newTopicFile.name}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {(newTopicFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <button
                    type="button"
                    aria-label="Remove file"
                    onClick={() => setNewTopicFile(null)}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-gray-300 px-4 py-5 text-center text-sm text-gray-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50/40">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span>
                    <span className="font-medium text-indigo-600">
                      Choose a file
                    </span>{" "}
                    - PDF, DOC or DOCX, up to 10 MB
                  </span>
                  {editingTopic?.document && (
                    <span className="text-xs text-gray-400">
                      Current: {editingTopic.document.filename} (uploading
                      replaces it)
                    </span>
                  )}
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f && f.size > MAX_DOC_BYTES) {
                        setFileError("Document must be 10 MB or smaller.");
                        e.target.value = "";
                        return;
                      }
                      setFileError(null);
                      setNewTopicFile(f);
                    }}
                  />
                </label>
              )}
              {fileError && (
                <p className="mt-1 text-xs text-red-600">{fileError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTopicDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitTopic}
              disabled={
                !newTopicTitle.trim() ||
                !newTopicDescription.trim() ||
                newTopicDomainIds.length === 0
              }
            >
              {editingTopic ? "Update Topic" : "Submit Topic"}
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
