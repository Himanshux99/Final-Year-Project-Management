"use client";

import * as React from "react";
import {
  Download,
  Upload,
  FileText,
  Eye,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { TopicApprovalDocument } from "@/types";
import { topicApprovalApi } from "@/lib/api";

interface TopicApprovalFormUploadProps {
  document: TopicApprovalDocument | null;
  isLeader: boolean;
  currentUserRole: "student" | "faculty" | "super_admin";
  onDocumentChange: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TopicApprovalFormUpload({
  document,
  isLeader,
  currentUserRole,
  onDocumentChange,
}: TopicApprovalFormUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const canEdit = isLeader && currentUserRole === "student";

  const handleDownloadTemplate = () => {
    // Open template download in new tab
    const templateUrl = topicApprovalApi.getTemplateUrl();
    window.open(templateUrl, "_blank");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10 MB limit");
      return;
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Allowed: PDF, Word, PNG, JPEG");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      await topicApprovalApi.upload(file);
      onDocumentChange();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    setDeleting(true);
    try {
      await topicApprovalApi.delete();
      onDocumentChange();
    } catch (err: any) {
      setError(err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleView = () => {
    if (document?.fileUrl) {
      window.open(document.fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Topic Approval Form
          {document ? (
            <Badge variant="success" className="ml-2">
              <CheckCircle className="h-3 w-3 mr-1" />
              Uploaded
            </Badge>
          ) : (
            <Badge variant="warning" className="ml-2">
              <AlertCircle className="h-3 w-3 mr-1" />
              Required
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instructions */}
        <div className="text-sm text-gray-600">
          {currentUserRole === "student" ? (
            <>
              <p className="mb-2">
                Download the blank form, get it signed by your team members and faculty mentor, 
                then upload the signed document.
              </p>
              <p className="text-amber-700 font-medium">
                ⚠️ You must upload this form before you can access Review 1, Review 2, or Final Review tabs.
              </p>
            </>
          ) : (
            <p>
              View the signed topic approval form uploaded by the group leader.
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Action Buttons Row */}
        {currentUserRole === "student" && !document && (
          <div className="flex gap-2 sm:gap-3">
            {/* Download Template Button */}
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="flex-1 min-w-0 gap-1 sm:gap-2 px-2 sm:px-4"
            >
              <Download className="h-4 w-4" />
              <span className="truncate text-xs sm:text-sm">
                <span className="sm:hidden">Download</span>
                <span className="hidden sm:inline">Download Blank Form Template</span>
              </span>
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>

            {/* Upload Button */}
            {canEdit && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1 min-w-0 gap-1 sm:gap-2 px-2 sm:px-4 whitespace-nowrap"
                >
                  {uploading ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      <span className="truncate text-xs sm:text-sm">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span className="truncate text-xs sm:text-sm">
                        <span className="sm:hidden">Upload</span>
                        <span className="hidden sm:inline">Upload Signed Form</span>
                      </span>
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Just Download Template for students with uploaded doc */}
        {currentUserRole === "student" && document && (
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="w-full gap-2"
          >
            <Download className="h-4 w-4" />
            Download Blank Form Template
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )}

        {/* Uploaded Document */}
        {document ? (
          <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-start gap-3">
              <FileText className="h-10 w-10 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" title={document.filename}>
                  {document.filename}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <span>{formatFileSize(document.fileSize)}</span>
                  <span>•</span>
                  <span>{formatDate(document.uploadedAt)}</span>
                  {document.uploader && (
                    <>
                      <span>•</span>
                      <span>by {document.uploader.name}</span>
                    </>
                  )}
                </div>
              </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleView}
                    className="gap-1 w-full sm:w-auto"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  {canEdit && (
                  <Button
                    variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="gap-1 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                    >
                    {deleting ? (
                      <Clock className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Non-leader student message */}
        {currentUserRole === "student" && !isLeader && !document && (
          <div className="text-center py-4 text-gray-500">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Only the group leader can upload the topic approval form.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
