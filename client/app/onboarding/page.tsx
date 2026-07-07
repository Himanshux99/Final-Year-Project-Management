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
import { Role, Department, ACCESS_CODES } from "@/types";

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, profile, refreshAuth, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [department, setDepartment] = useState<Department>("IT");
  const [role, setRole] = useState<Role>("student");
  const [rollNumber, setRollNumber] = useState("");
  const [semester, setSemester] = useState("1");
  const [accessCode, setAccessCode] = useState("");
  const [domains, setDomains] = useState("");

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

    // Validate super admin access code
    if (role === "super_admin") {
      if (ACCESS_CODES[department] !== accessCode) {
        showToast("Invalid coordinator access code", "error");
        return;
      }
    }

    setLoading(true);

    try {
      const profileData: any = {
        name,
        email: user.email,
        role,
        department,
      };

      if (role === "student") {
        profileData.rollNumber = rollNumber;
        profileData.semester = parseInt(semester);
      }

      if (role === "super_admin") {
        profileData.accessCode = accessCode;
      }

      if (role === "faculty" || role === "super_admin") {
        if (domains.trim()) {
          profileData.domains = domains.trim();
        }
      }

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

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Department
                  </label>
                  <Select
                    value={department}
                    onChange={(e) =>
                      setDepartment(e.target.value as Department)
                    }
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

                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <Select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    required
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty (Mentor)</option>
                    <option value="super_admin">
                      Super Admin (Coordinator)
                    </option>
                  </Select>
                </div>
              </div>

              {role === "student" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Roll Number
                    </label>
                    <Input
                      type="text"
                      placeholder="2024IT001"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      required
                    />
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
              )}

              {role === "super_admin" && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Coordinator Access Code
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Contact your department head for the coordinator access code
                  </p>
                </div>
              )}

              {(role === "faculty" || role === "super_admin") && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Domain(s)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. AI, Web Dev, CyberSec"
                    value={domains}
                    onChange={(e) => setDomains(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your areas of expertise, separated by commas
                  </p>
                </div>
              )}

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
