import { prisma, run, getSeedTeams } from "./shared";

interface TopicSeed {
  title: string;
  description: string;
  domains: string[]; // names from seedDomains.ts
}

// Team number -> topics they submit (first = primary choice). Teams 3, 5, 6 and 9
// submit more than one so the "multiple topics per team" UI can be tested.
const TOPICS: Record<number, TopicSeed[]> = {
  1: [
    {
      title: "AI-Powered Student Attendance System",
      description:
        "Face-recognition based attendance marking for classrooms using a lightweight CNN, with a dashboard for faculty to view trends and flag irregular attendance.",
      domains: ["AI, ML & NLP", "Image Processing"],
    },
  ],
  2: [
    {
      title: "Smart Campus Energy Monitoring",
      description:
        "IoT sensors and a cloud dashboard that track electricity usage across campus buildings and suggest savings using simple forecasting.",
      domains: ["IoT & Embedded System"],
    },
  ],
  3: [
    {
      title: "Blockchain-Based Certificate Verification",
      description:
        "Issue tamper-proof academic certificates on a permissioned blockchain so employers can verify them instantly with a QR code.",
      domains: ["Network Security & Blockchain"],
    },
    {
      title: "Decentralised Voting Platform for College Elections",
      description:
        "A transparent, auditable e-voting system for student council elections using smart contracts.",
      domains: ["Network Security & Blockchain", "Web App & Mobile App Development"],
    },
  ],
  4: [
    {
      title: "Crop Disease Detection from Leaf Images",
      description:
        "A mobile app that identifies common crop diseases from photos and recommends treatments, trained on a public plant-disease dataset.",
      domains: ["Image Processing", "AI, ML & NLP"],
    },
  ],
  5: [
    {
      title: "AR Lab Safety Trainer",
      description:
        "An augmented reality app that walks first-year students through lab equipment and safety procedures using their phone camera.",
      domains: ["Augmented and Virtual Reality"],
    },
    {
      title: "Sentiment Analysis of Course Feedback",
      description:
        "NLP pipeline that summarises open-text course feedback into themes and sentiment for department heads.",
      domains: ["AI, ML & NLP", "Big Data & Data Science"],
    },
    {
      title: "Placement Analytics Dashboard",
      description:
        "Interactive dashboards over several years of placement data to reveal trends by branch, package and company.",
      domains: ["Big Data & Data Science"],
    },
  ],
  6: [
    {
      title: "Cloud-Native Hostel Management System",
      description:
        "Containerised microservices for room allocation, mess billing and complaint tracking, deployed with CI/CD on a managed Kubernetes cluster.",
      domains: ["Cloud Computing & DevOps", "Web App & Mobile App Development"],
    },
    {
      title: "Automated Lab Booking Portal",
      description:
        "Web portal for booking lab slots with conflict detection and calendar sync.",
      domains: ["Web App & Mobile App Development"],
    },
  ],
  7: [
    {
      title: "Autonomous Line-Following Delivery Robot",
      description:
        "A low-cost robot that carries documents between departments, following a marked route and avoiding obstacles.",
      domains: ["Robotics & Automation", "IoT & Embedded System"],
    },
  ],
  8: [
    {
      title: "Personal Finance Tracker with Spending Insights",
      description:
        "Mobile app that categorises expenses automatically from SMS alerts and gives students monthly budgeting suggestions.",
      domains: ["FinTech", "Web App & Mobile App Development"],
    },
  ],
  9: [
    {
      title: "Mental Health Chatbot for Students",
      description:
        "A supportive conversational assistant offering coping exercises and directing students to counsellors when needed.",
      domains: ["HealthTech & Bio-Informatics", "AI, ML & NLP"],
    },
    {
      title: "Wearable Stress Monitor",
      description:
        "A wristband prototype that estimates stress levels from heart rate variability and logs trends in an app.",
      domains: ["HealthTech & Bio-Informatics", "IoT & Embedded System"],
    },
  ],
  10: [
    {
      title: "Educational 2D Puzzle Game for Data Structures",
      description:
        "A game that teaches stacks, queues and trees through levelled puzzles with progress tracking.",
      domains: ["Game Development"],
    },
  ],
};

// Stage 4: every team submits its topic(s). All start as "submitted" (awaiting mentor review).
run(async () => {
  const teams = await getSeedTeams();

  const domainRows = await prisma.domain.findMany();
  const domainId = (name: string) => {
    const row = domainRows.find((d) => d.name === name);
    if (!row) {
      throw new Error(`Domain "${name}" not found. Run seedDomains.ts first.`);
    }
    return row.id;
  };

  for (const team of teams) {
    const topics = TOPICS[team.teamNo];
    if (!topics) continue;

    const existing = await prisma.projectTopic.count({
      where: { groupId: team.group.id },
    });
    if (existing > 0) {
      console.log(`Skipped ${team.group.groupId} (already has ${existing} topic(s))`);
      continue;
    }

    for (let i = 0; i < topics.length; i++) {
      const t = topics[i];
      await prisma.projectTopic.create({
        data: {
          groupId: team.group.id,
          title: t.title,
          description: t.description,
          status: "submitted",
          submittedBy: team.leader.id,
          // Later topics were submitted a bit after the first.
          submittedAt: new Date(Date.now() + i * 60_000),
          domains: { connect: t.domains.map((name) => ({ id: domainId(name) })) },
        },
      });
    }

    console.log(
      `${team.group.groupId}: submitted ${topics.length} topic(s) - "${topics[0].title}"`,
    );
  }

  console.log("\nTopics submitted (all awaiting review).");
});
