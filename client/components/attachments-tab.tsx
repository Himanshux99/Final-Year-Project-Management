"use client";

import * as React from "react";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Attachment, MAX_ATTACHMENTS_PER_GROUP, MAX_FILE_SIZE_MB } from "@/types";

interface AttachmentsTabProps {
  attachments: Attachment[];
  isLeader: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (attachmentId: string) => Promise<void>;
  loading?: boolean;
}

const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024; // 5 MB in bytes

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType.includes("pdf")) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  }
  return <File className="h-5 w-5 text-gray-500" />;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AttachmentsTab({
  attachments,
  isLeader,
  onUpload,
  onDelete,
  loading,
}: AttachmentsTabProps) {
  const [uploading, setUploading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const canUpload = attachments.length < MAX_ATTACHMENTS_PER_GROUP;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds ${MAX_FILE_SIZE_MB} MB limit`);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    setDeletingId(attachmentId);
    try {
      await onDelete(attachmentId);
    } catch (err: any) {
      setError(err.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (fileUrl: string, filename: string) => {
    // Open file in new tab for preview
    // console.log(`Previewing file: ${filename} at ${fileUrl}`);
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
            <p>Loading attachments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Project Attachments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Upload project-related documents. Maximum {MAX_ATTACHMENTS_PER_GROUP} files, {MAX_FILE_SIZE_MB} MB each.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Supported formats: PDF, Word, PowerPoint, Excel, Images, ZIP, RAR, TXT
          </p>
          
          {!isLeader && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Only the group leader can upload or delete attachments.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Button */}
      {isLeader && (
        <Card>
          <CardContent className="py-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip,.rar,.txt"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !canUpload}
              className="w-full gap-2"
            >
              {uploading ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {canUpload 
                    ? "Upload File" 
                    : `Maximum ${MAX_ATTACHMENTS_PER_GROUP} files reached`
                  }
                </>
              )}
            </Button>
            {canUpload && (
              <p className="text-xs text-gray-500 text-center mt-2">
                {attachments.length} of {MAX_ATTACHMENTS_PER_GROUP} files uploaded
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {attachments.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No files uploaded yet</p>
              {isLeader && (
                <p className="text-sm mt-1">Click the button above to upload your first file</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Uploaded Files</span>
              <Badge variant="outline">{attachments.length} / {MAX_ATTACHMENTS_PER_GROUP}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
                >
                  {getFileIcon(attachment.mimeType)}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      title={attachment.filename}
                    >
                      {attachment.filename}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatFileSize(attachment.fileSize)}</span>
                      <span>•</span>
                      <span>{formatDate(attachment.uploadedAt)}</span>
                      {attachment.uploader && (
                        <>
                          <span>•</span>
                          <span>by {attachment.uploader.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(attachment.fileUrl, attachment.filename)}
                      className="p-2 hover:bg-blue-100 rounded-md transition-colors"
                      title="View/Preview"
                    >
                      <Eye className="h-4 w-4 text-blue-600" />
                    </button>
                    <a
                      href={attachment.fileUrl}
                      download={attachment.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4 text-gray-600" />
                    </a>
                    {isLeader && (
                      <button
                        onClick={() => handleDelete(attachment.id)}
                        disabled={deletingId === attachment.id}
                        className="p-2 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === attachment.id ? (
                          <Clock className="h-4 w-4 text-red-600 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-600" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="text-center text-sm text-gray-500">
        {attachments.length} of {MAX_ATTACHMENTS_PER_GROUP} files uploaded
      </div>
    </div>
  );
}
