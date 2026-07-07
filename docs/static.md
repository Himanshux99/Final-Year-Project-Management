// This we use to paste in the browser console to directly set up test data
// 4 teams of 3 students each, 3 faculty, 1 super admin
// All teams have accepted mentors so topic approval is visible

var data = JSON.parse(`{
  "projecthub_users": [
    {"id":"user-student-1","email":"student1@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-student-2","email":"student2@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-student-3","email":"student3@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-student-4","email":"student4@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-student-5","email":"student5@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-student-6","email":"student6@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-student-7","email":"student7@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-student-8","email":"student8@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-student-9","email":"student9@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-student-10","email":"student10@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-student-11","email":"student11@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-student-12","email":"student12@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-faculty-1","email":"faculty1@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-faculty-2","email":"faculty2@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-faculty-3","email":"faculty3@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"user-superadmin","email":"superadmin@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"}
  ],
  "projecthub_passwords": {
    "student1@gmail.com":"password",
    "student2@gmail.com":"password",
    "student3@gmail.com":"password",
    "student4@gmail.com":"password",
    "student5@gmail.com":"password",
    "student6@gmail.com":"password",
    "student7@gmail.com":"password",
    "student8@gmail.com":"password",
    "student9@gmail.com":"password",
    "student10@gmail.com":"password",
    "student11@gmail.com":"password",
    "student12@gmail.com":"password",
    "faculty1@gmail.com":"password",
    "faculty2@gmail.com":"password",
    "faculty3@gmail.com":"password",
    "superadmin@gmail.com":"password"
  },
  "projecthub_profiles": [
    {"userId":"user-student-1","name":"Alice Kumar","email":"student1@gmail.com","role":"student","department":"IT","rollNumber":"22101A0001","semester":7,"id":"profile-student-1","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-student-2","name":"Bob Sharma","email":"student2@gmail.com","role":"student","department":"IT","rollNumber":"22101A0002","semester":7,"id":"profile-student-2","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-student-3","name":"Charlie Singh","email":"student3@gmail.com","role":"student","department":"IT","rollNumber":"22101A0003","semester":7,"id":"profile-student-3","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-student-4","name":"Diana Patel","email":"student4@gmail.com","role":"student","department":"IT","rollNumber":"22101A0004","semester":7,"id":"profile-student-4","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-student-5","name":"Eve Gupta","email":"student5@gmail.com","role":"student","department":"IT","rollNumber":"22101A0005","semester":7,"id":"profile-student-5","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-student-6","name":"Frank Verma","email":"student6@gmail.com","role":"student","department":"IT","rollNumber":"22101A0006","semester":7,"id":"profile-student-6","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-student-7","name":"Grace Joshi","email":"student7@gmail.com","role":"student","department":"IT","rollNumber":"22101A0007","semester":7,"id":"profile-student-7","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-student-8","name":"Henry Reddy","email":"student8@gmail.com","role":"student","department":"IT","rollNumber":"22101A0008","semester":7,"id":"profile-student-8","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-student-9","name":"Ivy Nair","email":"student9@gmail.com","role":"student","department":"IT","rollNumber":"22101A0009","semester":7,"id":"profile-student-9","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-student-10","name":"Jack Mehta","email":"student10@gmail.com","role":"student","department":"IT","rollNumber":"22101A0010","semester":7,"id":"profile-student-10","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-student-11","name":"Kate Rao","email":"student11@gmail.com","role":"student","department":"IT","rollNumber":"22101A0011","semester":7,"id":"profile-student-11","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-student-12","name":"Leo Iyer","email":"student12@gmail.com","role":"student","department":"IT","rollNumber":"22101A0012","semester":7,"id":"profile-student-12","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-faculty-1","name":"Dr. Ramesh Kumar","email":"faculty1@gmail.com","role":"faculty","department":"IT","id":"profile-faculty-1","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-faculty-2","name":"Dr. Priya Sharma","email":"faculty2@gmail.com","role":"faculty","department":"IT","id":"profile-faculty-2","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-faculty-3","name":"Dr. Amit Patel","email":"faculty3@gmail.com","role":"faculty","department":"IT","id":"profile-faculty-3","createdAt":"2025-10-29T10:00:00.000Z"},
    {"userId":"user-superadmin","name":"Prof. Suresh Coordinator","email":"superadmin@gmail.com","role":"super_admin","department":"IT","id":"profile-superadmin","createdAt":"2025-10-29T10:00:00.000Z"}
  ],
  "projecthub_groups": [
    {"id":"group-1","groupId":"IT01","teamCode":"TEAM1","department":"IT","createdBy":"profile-student-1","members":["profile-student-1","profile-student-2","profile-student-3"],"isFull":true,"createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"group-2","groupId":"IT02","teamCode":"TEAM2","department":"IT","createdBy":"profile-student-4","members":["profile-student-4","profile-student-5","profile-student-6"],"isFull":true,"createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"group-3","groupId":"IT03","teamCode":"TEAM3","department":"IT","createdBy":"profile-student-7","members":["profile-student-7","profile-student-8","profile-student-9"],"isFull":true,"createdAt":"2025-10-29T10:00:00.000Z"},
    {"id":"group-4","groupId":"IT04","teamCode":"TEAM4","department":"IT","createdBy":"profile-student-10","members":["profile-student-10","profile-student-11","profile-student-12"],"isFull":true,"createdAt":"2025-10-29T10:00:00.000Z"}
  ],
  "projecthub_group_counters": {"IT":4},
  "projecthub_mentor_forms": [
    {"id":"form-1","department":"IT","isActive":true,"createdBy":"profile-superadmin","availableMentors":["profile-faculty-1","profile-faculty-2","profile-faculty-3","profile-superadmin"],"createdAt":"2025-10-29T10:00:00.000Z"}
  ],
  "projecthub_mentor_preferences": [
    {"id":"pref-1","groupId":"group-1","formId":"form-1","mentorChoices":["profile-faculty-1","profile-faculty-2","profile-faculty-3"],"submittedBy":"profile-student-1","submittedAt":"2025-10-29T11:00:00.000Z"},
    {"id":"pref-2","groupId":"group-2","formId":"form-1","mentorChoices":["profile-faculty-2","profile-faculty-3","profile-faculty-1"],"submittedBy":"profile-student-4","submittedAt":"2025-10-29T11:00:00.000Z"},
    {"id":"pref-3","groupId":"group-3","formId":"form-1","mentorChoices":["profile-faculty-3","profile-faculty-1","profile-faculty-2"],"submittedBy":"profile-student-7","submittedAt":"2025-10-29T11:00:00.000Z"},
    {"id":"pref-4","groupId":"group-4","formId":"form-1","mentorChoices":["profile-superadmin","profile-faculty-1","profile-faculty-2"],"submittedBy":"profile-student-10","submittedAt":"2025-10-29T11:00:00.000Z"}
  ],
  "projecthub_mentor_allocations": [
    {"id":"alloc-1","groupId":"group-1","mentorId":"profile-faculty-1","formId":"form-1","status":"accepted","preferenceRank":1,"createdAt":"2025-10-29T11:00:00.000Z","updatedAt":"2025-10-29T12:00:00.000Z"},
    {"id":"alloc-2","groupId":"group-2","mentorId":"profile-faculty-2","formId":"form-1","status":"accepted","preferenceRank":1,"createdAt":"2025-10-29T11:00:00.000Z","updatedAt":"2025-10-29T12:00:00.000Z"},
    {"id":"alloc-3","groupId":"group-3","mentorId":"profile-faculty-3","formId":"form-1","status":"accepted","preferenceRank":1,"createdAt":"2025-10-29T11:00:00.000Z","updatedAt":"2025-10-29T12:00:00.000Z"},
    {"id":"alloc-4","groupId":"group-4","mentorId":"profile-superadmin","formId":"form-1","status":"accepted","preferenceRank":1,"createdAt":"2025-10-29T11:00:00.000Z","updatedAt":"2025-10-29T12:00:00.000Z"}
  ],
  "projecthub_current_user": {"id":"user-student-1","email":"student1@gmail.com","createdAt":"2025-10-29T10:00:00.000Z"},
  "projecthub_project_topics": [],
  "projecthub_topic_messages": [],
  "projecthub_review_rollouts": [],
  "projecthub_review_sessions": [],
  "projecthub_review_messages": []
}`);

Object.keys(data).forEach(function (k) {
  localStorage.setItem(k, JSON.stringify(data[k]));
});

console.log("✅ Test data loaded successfully!");
console.log("📋 4 Teams created with accepted mentors:");
console.log("   IT01 (TEAM1) → Dr. Ramesh Kumar (Faculty 1)");
console.log("   IT02 (TEAM2) → Dr. Priya Sharma (Faculty 2)");
console.log("   IT03 (TEAM3) → Dr. Amit Patel (Faculty 3)");
console.log("   IT04 (TEAM4) → Prof. Suresh Coordinator (Super Admin)");
console.log("");
console.log("🔑 Login credentials (all passwords: 'password'):");
console.log("   Students: student1@gmail.com to student12@gmail.com");
console.log("   Faculty: faculty1@gmail.com, faculty2@gmail.com, faculty3@gmail.com");
console.log("   Super Admin: superadmin@gmail.com");
console.log("");
console.log("👉 Refresh the page after running this script!");