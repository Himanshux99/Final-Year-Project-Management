import { PrismaClient, Role, Department } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const PASSWORD = "Himanshu";

const faculty = [
  {
    name: "Dr. Vidya Chitre",
    domains: [
      "Big Data & Data Science",
      "Image Processing",
      "AI, ML & NLP",
    ],
  },
  {
    name: "Dr. Varsha Bhosale",
    domains: [
      "Big Data & Data Science",
      "Image Processing",
    ],
  },
  {
    name: "Dr. Dilip Motwani",
    domains: [
      "Big Data & Data Science",
      "Web App & Mobile App Development",
      "AI, ML & NLP",
      "Network Security & Blockchain",
    ],
  },
  {
    name: "Dr. Sushopti Gawade",
    domains: [
      "Big Data & Data Science",
      "Web App & Mobile App Development",
      "Image Processing",
      "Augmented and Virtual Reality",
      "AI, ML & NLP",
    ],
  },
  {
    name: "Prof. Ajitkumar Khachane",
    domains: [
      "IoT & Embedded System",
      "Image Processing",
    ],
  },
  {
    name: "Dr. Santosh Tamboli",
    domains: [
      "Big Data & Data Science",
      "Augmented and Virtual Reality",
      "AI, ML & NLP",
    ],
  },
  {
    name: "Dr. Rugved Deolekar",
    domains: [
      "Big Data & Data Science",
      "Web App & Mobile App Development",
      "AI, ML & NLP",
    ],
  },
  {
    name: "Dr. Shashikant Mahajan",
    domains: [
      "Web App & Mobile App Development",
      "Image Processing",
      "Network Security & Blockchain",
    ],
  },
  {
    name: "Dr. Digambar Puri",
    domains: [
      "Image Processing",
      "AI, ML & NLP",
    ],
  },
  {
    name: "Dr. Rasika Ransing",
    domains: [
      "Big Data & Data Science",
      "IoT & Embedded System",
      "Network Security & Blockchain",
    ],
  },
  {
    name: "Dr. Neha Kudu",
    domains: [
      "Big Data & Data Science",
      "Image Processing",
      "AI, ML & NLP",
      "Network Security & Blockchain",
    ],
  },
  {
    name: "Dr. Akshay Loke",
    domains: [
      "Web App & Mobile App Development",
      "Image Processing",
    ],
  },
  {
    name: "Prof. Debarati Ghosal",
    domains: [
      "Big Data & Data Science",
      "Web App & Mobile App Development",
      "Image Processing",
      "AI, ML & NLP",
    ],
  },
  {
    name: "Prof. Deepali Shrikhande",
    domains: [
      "Web App & Mobile App Development",
      "AI, ML & NLP",
    ],
  },
  {
    name: "Prof. Bhanu Tekwani",
    domains: [
      "Big Data & Data Science",
      "Web App & Mobile App Development",
      "Augmented and Virtual Reality",
      "AI, ML & NLP",
    ],
  },
  {
    name: "Prof. Kanchan Dhuri",
    domains: [
      "Web App & Mobile App Development",
      "IoT & Embedded System",
      "Image Processing",
      "AI, ML & NLP",
    ],
  },
  {
    name: "Prof. Vinita Bhandiwad",
    domains: [
      "IoT & Embedded System",
      "Image Processing",
      "Network Security & Blockchain",
    ],
  },
  {
    name: "Prof. Shruti Agarwal",
    domains: [
      "Big Data & Data Science",
      "Augmented and Virtual Reality",
      "AI, ML & NLP",
    ],
  },
  {
    name: "Prof. Pallavi Kharat",
    domains: [
      "Big Data & Data Science",
      "Image Processing",
      "AI, ML & NLP",
    ],
  },
  {
    name: "Prof. Dhanashree Tamhane",
    domains: [
      "Big Data & Data Science",
      "Web App & Mobile App Development",
      "AI, ML & NLP",
    ],
  },
];

function emailFromName(name: string) {
  const cleaned = name
    .replace(/^Dr\.\s*/i, "")
    .replace(/^Prof\.\s*/i, "")
    .trim();

  const parts = cleaned.split(/\s+/);

  const first = parts[0].toLowerCase();
  const last = parts[parts.length - 1].toLowerCase();

  return `${first}.${last}@vit.edu.in`;
}

async function main() {
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  for (const f of faculty) {
    const email = emailFromName(f.name);

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log(`Skipped ${email}`);
      continue;
    }

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        profile: {
          create: {
            name: f.name,
            email,
            role: Role.faculty,
            department: Department.IT,
            domains: f.domains.join(", "),
          },
        },
      },
    });

    console.log(`Created ${email}`);
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });