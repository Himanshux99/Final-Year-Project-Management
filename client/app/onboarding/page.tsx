"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { profileApi } from "@/lib/api";
import { Department } from "@/types";

// e.g. 24101B0035 = 24 (admission year) + 101 (branch code) + B (division) + 0035 (roll no.)
const ROLL_NUMBER_REGEX = /^\d{2}\d{3}[A-Z]\d{4}$/;

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, profile, refreshAuth, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [department, setDepartment] = useState<Department>("IT");
  const [rollNumber, setRollNumber] = useState("");
  const [semester, setSemester] = useState("1");
  const [rollNumberError, setRollNumberError] = useState("");

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Check if profile already exists
    if (profile) {
      router.push("/dashboard");
    }
  }, [user, profile, router, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast("Please login first", "error");
      router.push("/auth/login");
      return;
    }

    const normalizedRoll = rollNumber.trim().toUpperCase();
    if (!ROLL_NUMBER_REGEX.test(normalizedRoll)) {
      setRollNumberError(
        "Use the format 24101B0035: 2-digit year, 3-digit branch code, 1 division letter, 4-digit roll number",
      );
      return;
    }

    setLoading(true);

    try {
      const profileData = {
        name,
        email: user.email,
        role: "student" as const,
        department,
        rollNumber: normalizedRoll,
        semester: parseInt(semester),
      };

      await profileApi.create(profileData);
      await refreshAuth();
      showToast("Profile created successfully!", "success");
      router.push("/dashboard");
    } catch (error: any) {
      showToast(error.message || "Failed to create profile", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <GraduationCap className="h-10 w-10 text-primary" />
          <span className="text-3xl font-bold text-gray-900">ProjectHub</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Complete Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input type="email" value={user.email} disabled />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Department
                </label>
                <Select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                  required
                >
                  <option value="IT">Information Technology (IT)</option>
                  <option value="CS">Computer Science (CS)</option>
                  <option value="ECS">
                    Electronics & Computer Science (ECS)
                  </option>
                  <option value="ETC">
                    Electronics & Telecommunication (ETC)
                  </option>
                  <option value="BM">Biomedical Engineering (BM)</option>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Roll Number
                  </label>
                  <Input
                    type="text"
                    placeholder="24101B0035"
                    value={rollNumber}
                    maxLength={10}
                    onChange={(e) => {
                      setRollNumber(e.target.value.toUpperCase());
                      setRollNumberError("");
                    }}
                    required
                  />
                  {rollNumberError ? (
                    <p className="text-xs text-red-600 mt-1">
                      {rollNumberError}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Year (2) + branch code (3) + division letter (1) + roll
                      no. (4)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Semester
                  </label>
                  <Select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating profile..." : "Complete Setup"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
