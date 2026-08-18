"use client";

import * as React from "react";
import {
  getMentorAllocationStats,
  type MentorAllocationStats,
} from "@/lib/api";

import {
  Search,
  Users,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

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
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";

import { AvailableMentor, UnassignedGroup } from "@/types";

// type MentorAllocationStats = AvailableMentor & {
//   firstPreferenceCount?: number;
//   totalPreferenceCount?: number;
//   acceptedCount?: number;
//   firstPreferenceTeams?: string[];
//   totalPreferenceTeams?: string[];
//   acceptedTeams?: string[];
// };

interface ManualAllocationModalProps {
  open: boolean;
  onClose: () => void;
  unassignedGroups: UnassignedGroup[];
  availableMentors: AvailableMentor[];
  onAllocate: (groupId: string, mentorId: string) => Promise<void>;
}

export function ManualAllocationModal({
  open,
  onClose,
  unassignedGroups,
  availableMentors,
  onAllocate,
}: ManualAllocationModalProps) {
  const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null);
  const [selectedMentor, setSelectedMentor] = React.useState<string | null>(
    null,
  );

  const [groupSearch, setGroupSearch] = React.useState("");
  const [mentorSearch, setMentorSearch] = React.useState("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [mentorStats, setMentorStats] = React.useState<MentorAllocationStats[]>(
    [],
  );
  const [loadingMentorStats, setLoadingMentorStats] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    setLoadingMentorStats(true);
    getMentorAllocationStats()
      .then(setMentorStats)
      .finally(() => setLoadingMentorStats(false));
  }, [open]);

  const mentorsWithStats = React.useMemo(
    () =>
      availableMentors.map((mentor) => ({
        ...mentor,
        ...mentorStats.find((stat) => stat.id === mentor.id),
      })),
    [availableMentors, mentorStats],
  );

  const filteredGroups = unassignedGroups.filter((g) =>
    `${g.groupId} ${g.teamCode} ${g.leaderName}`
      .toLowerCase()
      .includes(groupSearch.toLowerCase()),
  );

  const filteredMentors = mentorsWithStats.filter((m) =>
    `${m.name} ${m.email} ${m.domains}`
      .toLowerCase()
      .includes(mentorSearch.toLowerCase()),
  );

  const selectedGroupData = unassignedGroups.find(
    (g) => g.id === selectedGroup,
  );

  const selectedMentorData = availableMentors.find(
    (m) => m.id === selectedMentor,
  );

  async function handleAllocate() {
    if (!selectedGroup || !selectedMentor) return;

    setIsSubmitting(true);

    try {
      await onAllocate(selectedGroup, selectedMentor);

      setSelectedGroup(null);
      setSelectedMentor(null);
      setGroupSearch("");
      setMentorSearch("");

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setSelectedGroup(null);
    setSelectedMentor(null);
    setGroupSearch("");
    setMentorSearch("");

    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Manual Mentor Allocation
          </DialogTitle>

          <DialogDescription>
            Select an unassigned group and assign an available mentor.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[2fr_3fr] gap-6 flex-1 overflow-hidden">
          {/* GROUPS */}
          <div className="flex flex-col border rounded-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/40">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Unassigned Groups</h3>
                <Badge>{unassignedGroups.length}</Badge>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  className="pl-9"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-auto p-3 space-y-3">
              {filteredGroups.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10">
                  <CheckCircle2 className="h-10 w-10 mb-3 text-green-500" />
                  All groups allocated
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const active = selectedGroup === group.id;

                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group.id)}
                      className={`w-full rounded-sm border text-left p-4 transition ${
                        active
                          ? "border-primary bg-primary/5 shadow-md"
                          : "hover:border-primary/30 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-semibold">
                            {group.groupId}{" "}
                            <span className="text-muted-foreground">
                              ({group.teamCode})
                            </span>
                          </h4>

                          <p className="text-sm text-muted-foreground">
                            {group.leaderName}
                          </p>
                        </div>

                        <Badge variant="outline">
                          <Users className="mr-1 h-3 w-3" />
                          {group.memberCount}
                        </Badge>
                      </div>

                      {group.hasSubmittedPreferences && (
                        <div className="mt-3 text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Preferences already submitted
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* MENTORS */}
          <div className="flex flex-col border rounded-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/40">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Available Mentors</h3>
                <Badge>{availableMentors.length}</Badge>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search mentors..."
                  className="pl-9"
                  value={mentorSearch}
                  onChange={(e) => setMentorSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-auto p-3 space-y-3">
              {filteredMentors.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-muted-foreground py-10">
                  <AlertCircle className="h-10 w-10 text-yellow-500 mb-3" />
                  No mentors available
                </div>
              ) : (
                filteredMentors.map((mentor) => {
                  const active = selectedMentor === mentor.id;

                  const mentorData = mentor as MentorAllocationStats;

                  const firstPreferenceCount =
                    mentorData.firstPreferenceCount ??
                    mentorData.firstPreferenceTeams?.length ??
                    0;

                  const totalRejectedCount = mentorData.totalRejectedCount ?? 0;

                  const totalPreferenceCount =
                    mentorData.totalPreferenceCount ??
                    mentorData.totalPreferenceTeams?.length ??
                    0;

                  const acceptedCount =
                    mentorData.acceptedCount ??
                    mentorData.acceptedTeams?.length ??
                    0;

                  return (
                    <button
                      key={mentor.id}
                      onClick={() => setSelectedMentor(mentor.id)}
                      className={`w-full rounded-sm border text-left p-4 transition ${
                        active
                          ? "border-primary bg-primary/5 shadow-md"
                          : "hover:border-primary/30 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">
                            {mentor.name}{" "}
                            <span className="text-muted-foreground text-sm">
                              {mentor.email}
                            </span>
                          </h4>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline">
                              1st pref: {firstPreferenceCount}
                            </Badge>

                            <Badge variant="outline">
                              Total rejected: {totalRejectedCount ?? 0}
                            </Badge>

                            <Badge variant="outline">
                              Total pref: {totalPreferenceCount}
                            </Badge>

                            <Badge variant="outline">
                              Accepted: {acceptedCount}
                            </Badge>
                          </div>
                        </div>

                        {mentor.role === "super_admin" && (
                          <Badge>Coordinator</Badge>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>


        {/* PREVIEW */}
        <div className="rounded-sm border bg-muted/40 p-4 mt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Allocation Preview
              </p>

              {selectedGroupData && selectedMentorData ? (
                <div className="flex items-center gap-5 mt-3">
                  <div>
                    <p className="font-semibold">{selectedGroupData.groupId}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedGroupData.leaderName}
                    </p>
                  </div>

                  <ArrowRight className="text-muted-foreground" />

                  <div>
                    <p className="font-semibold">{selectedMentorData.name}</p>
                    <p className="text-sm text-muted-foreground">Mentor</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm mt-2 text-muted-foreground">
                  Select a group and mentor to preview the allocation.
                </p>
              )}
            </div>

            <Button
              disabled={!selectedGroup || !selectedMentor || isSubmitting}
              onClick={handleAllocate}
              // size="lg"
            >
              {isSubmitting ? "Allocating..." : "Allocate Mentor"}
            </Button>
          </div>
        </div>

        {/* <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}
