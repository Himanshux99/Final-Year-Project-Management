"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import {
  groupApi,
  mentorFormApi,
  mentorPreferenceApi,
  profileApi,
  GroupWithMembers,
} from "@/lib/api";
import { Profile } from "@/types";
import { MentorCardSkeleton } from "@/components/ui/skeleton";
import MentorCard from "@/components/mentor-card";

export default function MentorPreferencesPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [availableMentors, setAvailableMentors] = useState<Profile[]>([]);
  const [selectedMentors, setSelectedMentors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMentors, setLoadingMentors] = useState(true);
  const [formId, setFormId] = useState("");
  const [group, setGroup] = useState<GroupWithMembers | null>(null);

  const loadMentorForm = useCallback(
    async (isMounted: () => boolean) => {
      if (!profile) return;

      setLoadingMentors(true);

      try {
        // Get user's group
        const userGroup = await groupApi.getMyGroup();

        if (!userGroup) {
          showToast("You are not part of any group", "error");
          router.replace("/dashboard/student");
          return;
        }

        if (!isMounted()) return;

        setGroup(userGroup);

        // Only leader can submit
        if (userGroup.createdBy !== profile.id) {
          showToast("Only the group leader can submit preferences", "error");
          router.replace("/dashboard/student");
          return;
        }

        // Fetch these in parallel
        const [prefResponse, activeForm] = await Promise.all([
          mentorPreferenceApi.hasSubmitted(),
          mentorFormApi.getActive(),
        ]);

        if (!isMounted()) return;

        if (prefResponse.hasSubmitted) {
          showToast("Preferences already submitted", "info");
          router.replace("/dashboard/student");
          return;
        }

        if (!activeForm) {
          showToast("No active mentor allocation form", "error");
          router.replace("/dashboard/student");
          return;
        }

        setFormId(activeForm.id);
        setAvailableMentors(activeForm.availableMentors.map((am) => am.mentor));
      } catch (error: any) {
        if (!isMounted()) return;

        showToast(error.message || "Failed to load mentor form", "error");
        router.replace("/dashboard/student");
      } finally {
        if (isMounted()) {
          setLoadingMentors(false);
        }
      }
    },
    [profile, router, showToast],
  );

  useEffect(() => {
    let mounted = true;

    const isMounted = () => mounted;

    if (authLoading) return;

    if (!user || !profile) {
      router.replace("/auth/login");
      return;
    }

    if (profile.role !== "student") {
      router.replace("/dashboard");
      return;
    }

    loadMentorForm(isMounted);

    return () => {
      mounted = false;
    };
  }, [authLoading, user, profile, router, loadMentorForm]);

  const handleSelectMentor = (mentorId: string) => {
    if (selectedMentors.includes(mentorId)) {
      setSelectedMentors(selectedMentors.filter((id) => id !== mentorId));
    } else {
      if (selectedMentors.length >= 3) {
        showToast("You can select maximum 3 mentors", "error");
        return;
      }
      setSelectedMentors([...selectedMentors, mentorId]);
    }
  };

  const handleSubmit = async () => {
    if (selectedMentors.length !== 3) {
      showToast("Please select exactly 3 mentors", "error");
      return;
    }

    if (!profile || !formId) return;

    setLoading(true);
    try {
      await mentorPreferenceApi.submit({
        formId,
        mentorChoices: selectedMentors as [string, string, string],
      });
      showToast("Preferences submitted successfully!", "success");
      router.push("/dashboard/student");
    } catch (error: any) {
      showToast(error.message || "Failed to submit preferences", "error");
    } finally {
      setLoading(false);
    }
  };

  const getPreferenceNumber = (mentorId: string) => {
    const index = selectedMentors.indexOf(mentorId);
    return index === -1 ? null : index + 1;
  };

  return (
    <DashboardLayout title="Mentor Preferences">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/student")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Select Your Mentor Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-900">
                  <strong>Instructions:</strong> Select exactly 3 mentors in
                  order of preference. Click on a mentor to select them. Click
                  again to deselect.
                </p>
              </div>

              {/* Selection Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium">Selected:</span>
                <div className="flex gap-2">
                  {[1, 2, 3].map((num) => (
                    <div
                      key={num}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        selectedMentors[num - 1]
                          ? "bg-primary text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Mentors */}
              {loadingMentors ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <MentorCardSkeleton key={i} />
                  ))}
                </div>
              ) : availableMentors.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  No mentors available
                </div>
              ) : (
                <div className="space-y-4">
                  {availableMentors.map((mentor) => {
                    const preferenceNum = getPreferenceNumber(mentor.id);
                    const isSelected = preferenceNum !== null;

                    return (
                      <MentorCard
                        key={mentor.id}
                        mentor={mentor}
                        isSelected={isSelected}
                        preferenceNum={preferenceNum}
                        onSelect={handleSelectMentor}
                      />
                    );
                  })}
                </div>
              )}
              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={loading || selectedMentors.length !== 3}
                  className="w-full"
                  size="lg"
                >
                  {loading
                    ? "Submitting..."
                    : `Submit Preferences ${
                        selectedMentors.length < 3
                          ? `(${selectedMentors.length}/3 selected)`
                          : ""
                      }`}
                </Button>
                {selectedMentors.length < 3 && (
                  <p className="text-center text-sm text-gray-600 mt-2">
                    Please select {3 - selectedMentors.length} more mentor
                    {3 - selectedMentors.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
