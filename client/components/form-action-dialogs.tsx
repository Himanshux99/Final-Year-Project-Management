"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { mentorFormApi } from "@/lib/api";

const CONFIRM_WORD = "DELETE";

interface FormDialogProps {
  open: boolean;
  formId: string;
  department?: string;
  onOpenChange: (open: boolean) => void;
  // Should perform the action; the dialog stays open and shows progress until it settles.
  onConfirm: () => Promise<void>;
}

// Withdraws ("retakes") the published form. Submissions and assignments are kept.
export function RetakeFormDialog({
  open,
  department,
  onOpenChange,
  onConfirm,
}: Omit<FormDialogProps, "formId">) {
  const [busy, setBusy] = React.useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The caller already reported the error; keep the dialog open.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-600" />
            Retake the published form?
          </DialogTitle>
          <DialogDescription>
            This withdraws the mentor allocation form
            {department ? ` for ${department}` : ""}. Students will no longer be
            able to submit preferences.
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>Existing submissions and mentor assignments are kept.</li>
          <li>You can pick mentors and roll out a new form afterwards.</li>
        </ul>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={confirm} disabled={busy}>
            {busy ? "Withdrawing..." : "Retake Form"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Permanently deletes the form and everything submitted against it.
// Two steps: review what will be lost, then type DELETE to confirm.
export function DeleteFormDialog({
  open,
  formId,
  department,
  onOpenChange,
  onConfirm,
}: FormDialogProps) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [summary, setSummary] = React.useState<{
    preferences: number;
    allocations: number;
    acceptedAllocations: number;
  } | null>(null);
  const [summaryError, setSummaryError] = React.useState("");

  // Reset and load counts each time the dialog opens
  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setTyped("");
    setSummary(null);
    setSummaryError("");
    let cancelled = false;
    mentorFormApi
      .getSummary(formId)
      .then((data) => !cancelled && setSummary(data))
      .catch(
        (e: any) =>
          !cancelled &&
          setSummaryError(e.message || "Could not load submission counts"),
      );
    return () => {
      cancelled = true;
    };
  }, [open, formId]);

  const confirm = async () => {
    if (typed !== CONFIRM_WORD) return;
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The caller already reported the error; keep the dialog open.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Delete the form permanently?
          </DialogTitle>
          <DialogDescription>
            Step {step} of 2 — this cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Deleting the mentor allocation form
              {department ? ` for ${department}` : ""} will also delete{" "}
              <strong>all of its submissions</strong>:
            </p>
            {summary ? (
              <ul className="space-y-1.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <li>
                  <strong>{summary.preferences}</strong> student preference
                  submission{summary.preferences === 1 ? "" : "s"}
                </li>
                <li>
                  <strong>{summary.allocations}</strong> mentor allocation
                  {summary.allocations === 1 ? "" : "s"}, including{" "}
                  <strong>{summary.acceptedAllocations}</strong> accepted mentor
                  assignment{summary.acceptedAllocations === 1 ? "" : "s"}
                </li>
              </ul>
            ) : summaryError ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {summaryError}. Everything submitted against this form will
                still be deleted.
              </p>
            ) : (
              <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            )}
            {summary && summary.acceptedAllocations > 0 && (
              <p className="text-sm font-medium text-red-700">
                Groups with an accepted mentor from this form will be left
                without a mentor.
              </p>
            )}
            <p className="text-sm text-gray-600">
              If you only want to close the form for students, use{" "}
              <strong>Retake Form</strong> instead — it keeps everything.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Final confirmation. Type{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-red-700">
                {CONFIRM_WORD}
              </code>{" "}
              to permanently delete the form and all of its submissions.
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirm();
              }}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
              autoFocus
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              step === 2 ? setStep(1) : onOpenChange(false)
            }
            disabled={busy}
          >
            {step === 2 ? "Back" : "Cancel"}
          </Button>
          {step === 1 ? (
            <Button variant="destructive" onClick={() => setStep(2)}>
              Continue
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={confirm}
              disabled={typed !== CONFIRM_WORD || busy}
            >
              {busy ? "Deleting..." : "Delete Form & Submissions"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Unpublishes a rolled-out review phase. Submissions and grades are kept.
export function UnpublishReviewDialog({
  open,
  reviewName,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  reviewName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The caller already reported the error; keep the dialog open.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-600" />
            Unpublish {reviewName}?
          </DialogTitle>
          <DialogDescription>
            Teams will no longer be able to submit or update progress for{" "}
            {reviewName}.
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>
            Existing submissions, mentor feedback and evaluations are kept.
          </li>
          <li>You can activate {reviewName} again at any time.</li>
        </ul>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={confirm} disabled={busy}>
            {busy ? "Unpublishing..." : `Unpublish ${reviewName}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
