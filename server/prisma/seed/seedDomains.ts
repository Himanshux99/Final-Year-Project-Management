import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const domains = [
  "Big Data & Data Science",
  "Image Processing",
  "AI, ML & NLP",
  "Web App & Mobile App Development",
  "Network Security & Blockchain",
  "IoT & Embedded System",
  "Augmented and Virtual Reality",
  "Cloud Computing & DevOps",
  "Robotics & Automation",
  "FinTech",
  "HealthTech & Bio-Informatics",
  "Game Development",
];

async function main() {
  for (const name of domains) {
    await prisma.domain.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`Ensured domain: ${name}`);
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
