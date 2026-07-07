"use client";

import * as React from "react";
import {
  CheckCircle,
  AlertCircle,
  Save,
  User,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Select } from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { ReviewType, ReviewEvaluation } from "@/types";
import { EvaluationPreFillData, evaluationsApi } from "@/lib/api";

interface ReviewEvaluationFormProps {
  sessionId: string;
  groupId: string;
  reviewType: ReviewType;
  onSubmit: (evaluation: ReviewEvaluation) => void;
  onCancel: () => void;
  open: boolean;
  embedded?: boolean;
}

interface StudentGradeInput {
  profileId: string;
  studentName: string;
  rollNumber: string;
  // R1 grades
  progressMarks: number;
  contributionMarks: number;
  publicationMarks: number;
  // R2 grades
  techUsageMarks: number;
  innovationMarks: number;
  presentationMarks: number;
  activityMarks: number;
  synopsisMarks: number;
}

const PROJECT_CATEGORIES = [
  { value: "A", label: "A - Very Good" },
  { value: "B", label: "B - Good" },
  { value: "C", label: "C - Satisfactory" },
];

const PROJECT_TYPES = [
  { value: "Research", label: "Research" },
  { value: "Application", label: "Application" },
  { value: "Product", label: "Product" },
  { value: "Industry", label: "Industry" },
  { value: "Social Cause", label: "Social Cause" },
];

const PROJECT_DOMAINS = [
  { value: "AI ML", label: "AI / Machine Learning" },
  { value: "NLP", label: "Natural Language Processing" },
  { value: "Web Development", label: "Web Development" },
  { value: "Mobile App", label: "Mobile App Development" },
  { value: "Security", label: "Cyber Security" },
  { value: "Big Data", label: "Big Data" },
  { value: "IoT", label: "Internet of Things" },
  { value: "Blockchain", label: "Blockchain" },
  { value: "Cloud Computing", label: "Cloud Computing" },
  { value: "Other", label: "Other" },
];

const QUALITY_GRADES = [
  { value: "A", label: "A - Excellent" },
  { value: "B", label: "B - Good" },
  { value: "C", label: "C - Satisfactory" },
];

const PROJECT_NATURES = [
  { value: "Research", label: "Research" },
  { value: "Application based", label: "Application Based" },
  { value: "Product based", label: "Product Based" },
  { value: "Social", label: "Social" },
];

export function ReviewEvaluationForm({
  sessionId,
  groupId,
  reviewType,
  onSubmit,
  onCancel,
  open,
  embedded = false,
}: ReviewEvaluationFormProps) {
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [prefillData, setPrefillData] = React.useState<EvaluationPreFillData | null>(null);

  // Form fields
  const [evaluationDate, setEvaluationDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [division, setDivision] = React.useState("A");
  const [projectGuide, setProjectGuide] = React.useState("");
  const [projectTitle, setProjectTitle] = React.useState("");
  const [completionPercentage, setCompletionPercentage] = React.useState(0);
  const [remarks, setRemarks] = React.useState("");

  // Review 1 specific
  const [projectCategory, setProjectCategory] = React.useState("B");
  const [projectType, setProjectType] = React.useState("Application");

  // Review 2 specific
  const [projectDomain, setProjectDomain] = React.useState("Web Development");
  const [qualityGrade, setQualityGrade] = React.useState("B");
  const [projectNature, setProjectNature] = React.useState("Application based");

  // Student grades
  const [studentGrades, setStudentGrades] = React.useState<StudentGradeInput[]>([]);

  // Load prefill data
  React.useEffect(() => {
    if (open && sessionId) {
      loadPrefillData();
    }
  }, [open, sessionId]);

  const loadPrefillData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await evaluationsApi.getPreFillData(sessionId);
      setPrefillData(data);
      
      // Set prefilled values
      setProjectGuide(data.projectGuide);
      setProjectTitle(data.projectTitle);
      setCompletionPercentage(data.completionPercentage);
      
      // Initialize student grades
      setStudentGrades(
        data.members.map((m) => ({
          profileId: m.profileId,
          studentName: m.name,
          rollNumber: m.rollNumber || "",
          progressMarks: 0,
          contributionMarks: 0,
          publicationMarks: 0,
          techUsageMarks: 0,
          innovationMarks: 0,
          presentationMarks: 0,
          activityMarks: 0,
          synopsisMarks: 0,
        }))
      );
    } catch (err: any) {
      setError(err.message || "Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const updateStudentGrade = (
    index: number,
    field: keyof StudentGradeInput,
    value: number
  ) => {
    const maxByField: Partial<Record<keyof StudentGradeInput, number>> = {
      progressMarks: 10,
      contributionMarks: 10,
      publicationMarks: 5,
      techUsageMarks: 5,
      innovationMarks: 5,
      presentationMarks: 5,
      activityMarks: 5,
      synopsisMarks: 5,
    };

    const max = maxByField[field];
    const safeValue = Number.isFinite(value) ? value : 0;
    const clampedValue =
      max !== undefined ? Math.max(0, Math.min(safeValue, max)) : Math.max(0, safeValue);

    if (max !== undefined && safeValue > max) {
      setError(`${String(field).replace("Marks", "")} cannot exceed ${max}`);
    } else if (safeValue < 0) {
      setError("Marks cannot be negative");
    } else if (error?.includes("cannot exceed") || error?.includes("cannot be negative")) {
      setError(null);
    }

    setStudentGrades((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: clampedValue };
      return updated;
    });
  };

  const calculateTotal = (grade: StudentGradeInput): number => {
    if (reviewType === "review_1") {
      return (
        (grade.progressMarks || 0) +
        (grade.contributionMarks || 0) +
        (grade.publicationMarks || 0)
      );
    } else {
      return (
        (grade.techUsageMarks || 0) +
        (grade.innovationMarks || 0) +
        (grade.presentationMarks || 0) +
        (grade.activityMarks || 0) +
        (grade.synopsisMarks || 0)
      );
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const evaluation = await evaluationsApi.create({
        sessionId,
        groupId,
        reviewType,
        evaluationDate,
        division,
        projectGuide,
        projectTitle,
        projectCategory: reviewType === "review_1" ? projectCategory : undefined,
        projectType: reviewType === "review_1" ? projectType : undefined,
        projectDomain: reviewType === "review_2" ? projectDomain : undefined,
        qualityGrade: reviewType === "review_2" ? qualityGrade : undefined,
        projectNature: reviewType === "review_2" ? projectNature : undefined,
        completionPercentage,
        remarks: remarks || undefined,
        studentGrades: studentGrades.map((g) => ({
          profileId: g.profileId,
          studentName: g.studentName,
          rollNumber: g.rollNumber,
          progressMarks: reviewType === "review_1" ? g.progressMarks : undefined,
          contributionMarks: reviewType === "review_1" ? g.contributionMarks : undefined,
          publicationMarks: reviewType === "review_1" ? g.publicationMarks : undefined,
          techUsageMarks: reviewType === "review_2" ? g.techUsageMarks : undefined,
          innovationMarks: reviewType === "review_2" ? g.innovationMarks : undefined,
          presentationMarks: reviewType === "review_2" ? g.presentationMarks : undefined,
          activityMarks: reviewType === "review_2" ? g.activityMarks : undefined,
          synopsisMarks: reviewType === "review_2" ? g.synopsisMarks : undefined,
        })),
      });

      onSubmit(evaluation);
    } catch (err: any) {
      setError(err.message || "Failed to submit evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewTitle = reviewType === "review_1" ? "Review 1" : "Review 2";
  const showSelectsAsInputs = true;

  const formContent = (
    <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
            <Award className="h-5 w-5" />
            {reviewTitle} Evaluation Form
          </DialogTitle>
          <DialogDescription className="px-4 sm:px-6">
            Fill out the evaluation form to complete this review. Grades will be visible to the super admin.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-500">Loading form data...</p>
          </div>
        ) : error && !prefillData ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <Button variant="outline" onClick={loadPrefillData} className="mt-3">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-6 px-4 pb-4 sm:px-6 sm:pb-6 overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Header Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evaluation Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={evaluationDate}
                    onChange={(e) => setEvaluationDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Division</Label>
                  {showSelectsAsInputs ? (
                    <Input value={division} onChange={(e) => setDivision(e.target.value)} placeholder="A or B" />
                  ) : (
                    <Select value={division} onChange={(e) => setDivision(e.target.value)}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                    </Select>
                  )}
                </div>
                <div>
                  <Label>Group ID</Label>
                  <Input value={prefillData?.groupDisplayId || ""} disabled />
                </div>
                <div>
                  <Label>Project Guide</Label>
                  <Input
                    value={projectGuide}
                    onChange={(e) => setProjectGuide(e.target.value)}
                    placeholder="Mentor name"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Project Title</Label>
                  <Input
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Approved project title"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Review Type Specific Fields */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Project Classification</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviewType === "review_1" ? (
                  <>
                    <div>
                      <Label>Category of Project</Label>
                      {showSelectsAsInputs ? (
                        <Input value={projectCategory} onChange={(e) => setProjectCategory(e.target.value)} placeholder="A / B / C" />
                      ) : (
                        <Select value={projectCategory} onChange={(e) => setProjectCategory(e.target.value)}>
                          {PROJECT_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                    <div>
                      <Label>Project Type</Label>
                      {showSelectsAsInputs ? (
                        <Input value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder="Research / Application / Product / Industry / Social Cause" />
                      ) : (
                        <Select value={projectType} onChange={(e) => setProjectType(e.target.value)}>
                          {PROJECT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Domain of Project</Label>
                      {showSelectsAsInputs ? (
                        <Input value={projectDomain} onChange={(e) => setProjectDomain(e.target.value)} placeholder="AI ML / NLP / Web Development / ..." />
                      ) : (
                        <Select value={projectDomain} onChange={(e) => setProjectDomain(e.target.value)}>
                          {PROJECT_DOMAINS.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                    <div>
                      <Label>Quality Grade</Label>
                      {showSelectsAsInputs ? (
                        <Input value={qualityGrade} onChange={(e) => setQualityGrade(e.target.value)} placeholder="A / B / C" />
                      ) : (
                        <Select value={qualityGrade} onChange={(e) => setQualityGrade(e.target.value)}>
                          {QUALITY_GRADES.map((g) => (
                            <option key={g.value} value={g.value}>
                              {g.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label>Nature of Project</Label>
                      {showSelectsAsInputs ? (
                        <Input value={projectNature} onChange={(e) => setProjectNature(e.target.value)} placeholder="Research / Application based / Product based / Social" />
                      ) : (
                        <Select value={projectNature} onChange={(e) => setProjectNature(e.target.value)}>
                          {PROJECT_NATURES.map((n) => (
                            <option key={n.value} value={n.value}>
                              {n.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                  </>
                )}
                <div>
                  <Label>Completion Percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={completionPercentage}
                      onChange={(e) => setCompletionPercentage(Number(e.target.value))}
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {studentGrades.map((grade) => (
                    <div key={grade.profileId} className="rounded-lg border bg-gray-50 p-3">
                      <p className="text-sm font-medium truncate">{grade.studentName}</p>
                      <p className="text-xs text-gray-600 mt-1">{grade.rollNumber || "No roll number"}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Grading Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Evaluation Grades (Max 25 Marks)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto hidden md:block">
                  <table className="w-full text-sm min-w-[920px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 border-b min-w-[150px]">Student Name</th>
                        {reviewType === "review_1" ? (
                          <>
                            <th className="text-center p-2 border-b min-w-[100px]">
                              Progress (10)
                            </th>
                            <th className="text-center p-2 border-b min-w-[100px]">
                              Contribution (10)
                            </th>
                            <th className="text-center p-2 border-b min-w-[100px]">
                              Publication (5)
                            </th>
                          </>
                        ) : (
                          <>
                            <th className="text-center p-2 border-b min-w-[80px]">
                              Tech (5)
                            </th>
                            <th className="text-center p-2 border-b min-w-[80px]">
                              Innovation (5)
                            </th>
                            <th className="text-center p-2 border-b min-w-[80px]">
                              Presentation (5)
                            </th>
                            <th className="text-center p-2 border-b min-w-[80px]">
                              Activity (5)
                            </th>
                            <th className="text-center p-2 border-b min-w-[80px]">
                              Synopsis (5)
                            </th>
                          </>
                        )}
                        <th className="text-center p-2 border-b min-w-[80px] bg-gray-100">
                          Total (25)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentGrades.map((grade, index) => (
                        <tr key={grade.profileId} className="border-b last:border-b-0">
                          <td className="p-2 font-medium">{grade.studentName}</td>
                          {reviewType === "review_1" ? (
                            <>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={10}
                                  className="w-16 mx-auto text-center"
                                  value={grade.progressMarks}
                                  onChange={(e) =>
                                    updateStudentGrade(index, "progressMarks", Number(e.target.value))
                                  }
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={10}
                                  className="w-16 mx-auto text-center"
                                  value={grade.contributionMarks}
                                  onChange={(e) =>
                                    updateStudentGrade(index, "contributionMarks", Number(e.target.value))
                                  }
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={5}
                                  className="w-16 mx-auto text-center"
                                  value={grade.publicationMarks}
                                  onChange={(e) =>
                                    updateStudentGrade(index, "publicationMarks", Number(e.target.value))
                                  }
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={5}
                                  className="w-14 mx-auto text-center"
                                  value={grade.techUsageMarks}
                                  onChange={(e) =>
                                    updateStudentGrade(index, "techUsageMarks", Number(e.target.value))
                                  }
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={5}
                                  className="w-14 mx-auto text-center"
                                  value={grade.innovationMarks}
                                  onChange={(e) =>
                                    updateStudentGrade(index, "innovationMarks", Number(e.target.value))
                                  }
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={5}
                                  className="w-14 mx-auto text-center"
                                  value={grade.presentationMarks}
                                  onChange={(e) =>
                                    updateStudentGrade(index, "presentationMarks", Number(e.target.value))
                                  }
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={5}
                                  className="w-14 mx-auto text-center"
                                  value={grade.activityMarks}
                                  onChange={(e) =>
                                    updateStudentGrade(index, "activityMarks", Number(e.target.value))
                                  }
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={5}
                                  className="w-14 mx-auto text-center"
                                  value={grade.synopsisMarks}
                                  onChange={(e) =>
                                    updateStudentGrade(index, "synopsisMarks", Number(e.target.value))
                                  }
                                />
                              </td>
                            </>
                          )}
                          <td className="p-2 text-center font-bold bg-gray-50">
                            {calculateTotal(grade)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile grading cards */}
                <div className="md:hidden space-y-3">
                  {studentGrades.map((grade, index) => (
                    <div key={grade.profileId} className="border rounded-lg p-3 bg-white">
                      <div className="mb-3">
                        <p className="font-medium text-sm">{grade.studentName}</p>
                        <p className="text-xs text-gray-500">{grade.rollNumber}</p>
                      </div>
                      {reviewType === "review_1" ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Progress (10)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              value={grade.progressMarks}
                              onChange={(e) =>
                                updateStudentGrade(index, "progressMarks", Number(e.target.value))
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Contribution (10)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              value={grade.contributionMarks}
                              onChange={(e) =>
                                updateStudentGrade(index, "contributionMarks", Number(e.target.value))
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Publication (5)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={5}
                              value={grade.publicationMarks}
                              onChange={(e) =>
                                updateStudentGrade(index, "publicationMarks", Number(e.target.value))
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Tech (5)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={5}
                              value={grade.techUsageMarks}
                              onChange={(e) =>
                                updateStudentGrade(index, "techUsageMarks", Number(e.target.value))
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Innovation (5)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={5}
                              value={grade.innovationMarks}
                              onChange={(e) =>
                                updateStudentGrade(index, "innovationMarks", Number(e.target.value))
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Presentation (5)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={5}
                              value={grade.presentationMarks}
                              onChange={(e) =>
                                updateStudentGrade(index, "presentationMarks", Number(e.target.value))
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Activity (5)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={5}
                              value={grade.activityMarks}
                              onChange={(e) =>
                                updateStudentGrade(index, "activityMarks", Number(e.target.value))
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Synopsis (5)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={5}
                              value={grade.synopsisMarks}
                              onChange={(e) =>
                                updateStudentGrade(index, "synopsisMarks", Number(e.target.value))
                              }
                            />
                          </div>
                        </div>
                      )}
                      <div className="mt-3 text-sm font-semibold text-right">
                        Total: {calculateTotal(grade)} / 25
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Remarks */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Remarks (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any additional remarks or feedback..."
                  className="min-h-[80px]"
                />
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="px-4 pb-4 sm:px-6 sm:pb-6 flex-col-reverse sm:flex-row gap-2">
          <Button className="w-full sm:w-auto" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || submitting || !prefillData}
            className="gap-2 w-full sm:w-auto whitespace-normal text-center"
          >
            {submitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Submitting...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Submit Evaluation & Mark Complete
              </>
            )}
          </Button>
        </DialogFooter>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{formContent}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto">
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
