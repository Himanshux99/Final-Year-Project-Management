/**
 * Export utilities for CSV and PDF generation
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MentorOverview, MentorGroupInfo, ReviewStatus } from "@/types";

// Helper to format review status (CSV-safe characters)
function formatReviewStatus(
  status: ReviewStatus | null,
  progress: number | null,
): string {
  if (!status || status === "not_started") return "-";
  if (status === "completed") return "Complete";
  if (status === "feedback_given") return "Feedback";
  if (status === "submitted" || status === "in_progress")
    return `${progress || 0}%`;
  return "-";
}

// Helper to format topic status
function formatTopicStatus(status: MentorGroupInfo["topicStatus"]): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "pending":
      return "Pending";
    case "rejected":
      return "Rejected";
    case "revision_requested":
      return "Revision";
    default:
      return "Not Submitted";
  }
}

/**
 * Generate CSV content from mentor overview data
 */
export function generateMentorOverviewCSV(mentors: MentorOverview[]): string {
  const headers = [
    "Mentor Name",
    "Mentor Email",
    "Domains",
    "Group ID",
    "Team Code",
    "Leader",
    "All Members",
    "Member Count",
    "Topic Status",
    "Topic Title",
    "Review 1",
    "Review 2",
    "Final Review",
  ];

  const rows: string[][] = [];

  mentors.forEach((mentor) => {
    if (mentor.assignedGroups.length === 0) {
      // Mentor with no groups
      rows.push([
        mentor.name,
        mentor.email,
        mentor.domains || "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    } else {
      mentor.assignedGroups.forEach((group, index) => {
        // Format all members with name and roll number
        const membersFormatted = group.members
          .map((m) => `${m.name}${m.rollNumber ? ` (${m.rollNumber})` : ""}`)
          .join("; ");
        
        rows.push([
          index === 0 ? mentor.name : "",
          index === 0 ? mentor.email : "",
          index === 0 ? mentor.domains || "" : "",
          group.groupId,
          group.teamCode,
          group.leaderName,
          membersFormatted,
          group.memberCount.toString(),
          formatTopicStatus(group.topicStatus),
          group.approvedTopicTitle || "",
          formatReviewStatus(group.review1Status, group.review1Progress),
          formatReviewStatus(group.review2Status, group.review2Progress),
          formatReviewStatus(group.finalReviewStatus, group.finalReviewProgress),
        ]);
      });
    }
  });

  // Escape CSV values
  const escapeCSV = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes(";")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\n");

  // Add UTF-8 BOM for Excel compatibility
  return "\uFEFF" + csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate PDF report from mentor overview data
 */
export function generateMentorOverviewPDF(
  mentors: MentorOverview[],
  department: string,
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Mentor & Group Progress Report", pageWidth / 2, 20, {
    align: "center",
  });

  // Subtitle
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Department: ${department}`, pageWidth / 2, 28, { align: "center" });
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 35, {
    align: "center",
  });

  // Summary stats
  const totalMentors = mentors.length;
  const totalGroups = mentors.reduce((sum, m) => sum + m.totalGroups, 0);
  const topicsApproved = mentors
    .flatMap((m) => m.assignedGroups)
    .filter((g) => g.topicStatus === "approved").length;
  const projectsCompleted = mentors
    .flatMap((m) => m.assignedGroups)
    .filter((g) => g.finalReviewStatus === "completed").length;

  doc.setFontSize(10);
  doc.text(
    `Active Mentors: ${totalMentors} | Assigned Groups: ${totalGroups} | Topics Approved: ${topicsApproved} | Projects Completed: ${projectsCompleted}`,
    pageWidth / 2,
    45,
    { align: "center" },
  );

  let yOffset = 55;

  // For each mentor
  mentors.forEach((mentor, mentorIndex) => {
    // Check if we need a new page
    if (yOffset > 250) {
      doc.addPage();
      yOffset = 20;
    }

    // Mentor header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${mentor.name}`, 14, yOffset);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${mentor.email}${mentor.domains ? ` | ${mentor.domains}` : ""}`, 14, yOffset + 5);
    doc.text(`Groups: ${mentor.totalGroups}`, 14, yOffset + 10);

    yOffset += 15;

    if (mentor.assignedGroups.length > 0) {
      // Table for groups
      const tableData = mentor.assignedGroups.map((group) => {
        // Format members list for PDF
        const membersList = group.members
          .map((m) => `${m.name}${m.rollNumber ? ` (${m.rollNumber})` : ""}`)
          .join(", ");
        
        return [
          group.groupId,
          group.leaderName,
          membersList,
          formatTopicStatus(group.topicStatus),
          formatReviewStatus(group.review1Status, group.review1Progress),
          formatReviewStatus(group.review2Status, group.review2Progress),
          formatReviewStatus(group.finalReviewStatus, group.finalReviewProgress),
        ];
      });

      autoTable(doc, {
        startY: yOffset,
        head: [["Group", "Leader", "Members", "Topic", "R1", "R2", "Final"]],
        body: tableData,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        columnStyles: {
          2: { cellWidth: 50 }, // Members column wider
        },
        margin: { left: 14, right: 14 },
        tableWidth: "auto",
      });

      // @ts-ignore - autoTable adds lastAutoTable property
      yOffset = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(128);
      doc.text("No groups assigned", 20, yOffset);
      doc.setTextColor(0);
      yOffset += 10;
    }
  });

  // Save the PDF
  const timestamp = new Date().toISOString().split("T")[0];
  doc.save(`mentor-overview-${department}-${timestamp}.pdf`);
}

/**
 * Export mentor overview as CSV
 */
export function exportMentorOverviewAsCSV(
  mentors: MentorOverview[],
  department: string,
): void {
  const csv = generateMentorOverviewCSV(mentors);
  const timestamp = new Date().toISOString().split("T")[0];
  downloadCSV(csv, `mentor-overview-${department}-${timestamp}.csv`);
}

/**
 * Export mentor overview as PDF
 */
export function exportMentorOverviewAsPDF(
  mentors: MentorOverview[],
  department: string,
): void {
  generateMentorOverviewPDF(mentors, department);
}
