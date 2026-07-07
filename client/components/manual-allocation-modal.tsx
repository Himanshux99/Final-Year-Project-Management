"use client";

import * as React from "react";
import { Users, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { UnassignedGroup, AvailableMentor } from "@/types";

interface ManualAllocationModalProps {
  open: boolean;
  onClose: () => void;
  unassignedGroups: UnassignedGroup[];
  availableMentors: AvailableMentor[];
  onAllocate: (groupId: string, mentorId: string) => Promise<void>;
  loading?: boolean;
}

export function ManualAllocationModal({
  open,
  onClose,
  unassignedGroups,
  availableMentors,
  onAllocate,
  loading,
}: ManualAllocationModalProps) {
  const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null);
  const [selectedMentor, setSelectedMentor] = React.useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAllocate = async () => {
    if (!selectedGroup || !selectedMentor) return;

    setIsSubmitting(true);
    try {
      await onAllocate(selectedGroup, selectedMentor);
      setSelectedGroup(null);
      setSelectedMentor(null);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedGroup(null);
    setSelectedMentor(null);
    onClose();
  };

  const selectedGroupData = unassignedGroups.find(
    (g) => g.id === selectedGroup,
  );
  const selectedMentorData = availableMentors.find(
    (m) => m.id === selectedMentor,
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Manual Mentor Allocation
          </DialogTitle>
          <DialogDescription>
            Assign a mentor to a group that hasn&apos;t been allocated through
            the normal flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Select Group */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">
              Step 1: Select an Unassigned Group
            </h4>
            {unassignedGroups.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  All groups have mentors assigned!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {unassignedGroups.map((group) => (
                  <label
                    key={group.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedGroup === group.id
                        ? "bg-primary/10 border-primary border"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="group"
                      checked={selectedGroup === group.id}
                      onChange={() => setSelectedGroup(group.id)}
                      className="h-4 w-4 text-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{group.groupId}</span>
                        <span className="text-xs text-gray-400 font-mono">
                          {group.teamCode}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {group.memberCount}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Leader: {group.leaderName}
                      </p>
                      {group.hasSubmittedPreferences && (
                        <p className="text-xs text-amber-600 mt-1">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          Has pending preferences (will be overridden)
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Select Mentor */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">
              Step 2: Select a Mentor
            </h4>
            {availableMentors.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
                <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  No mentors available. Roll out the mentor allocation form
                  first.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {availableMentors.map((mentor) => (
                  <label
                    key={mentor.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedMentor === mentor.id
                        ? "bg-primary/10 border-primary border"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="mentor"
                      checked={selectedMentor === mentor.id}
                      onChange={() => setSelectedMentor(mentor.id)}
                      className="h-4 w-4 text-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{mentor.name}</span>
                        {mentor.role === "super_admin" && (
                          <Badge variant="secondary" className="text-xs">
                            Coordinator
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{mentor.email}</p>
                      {mentor.domains && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {mentor.domains.split(",").map((domain, i) => (
                            <span
                              key={i}
                              className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                            >
                              {domain.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedGroup && selectedMentor && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                Allocation Summary
              </h4>
              <p className="text-sm text-blue-800">
                Assign{" "}
                <span className="font-semibold">{selectedMentorData?.name}</span>{" "}
                as mentor for group{" "}
                <span className="font-semibold">
                  {selectedGroupData?.groupId}
                </span>{" "}
                (led by {selectedGroupData?.leaderName})
              </p>
              {selectedGroupData?.hasSubmittedPreferences && (
                <p className="text-xs text-blue-700 mt-2">
                  Note: This will override the group&apos;s existing mentor
                  preferences.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleAllocate}
            disabled={!selectedGroup || !selectedMentor || isSubmitting}
          >
            {isSubmitting ? "Allocating..." : "Confirm Allocation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
