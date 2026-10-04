-- Run ONCE, BEFORE `npm run db:push` drops ProjectTopic.domainId.
-- Creates the implicit many-to-many join table Prisma expects (_TopicDomains)
-- and copies each topic's existing single domain into it.
-- A = Domain.id, B = ProjectTopic.id (Prisma orders them alphabetically by model name).
CREATE TABLE IF NOT EXISTS "_TopicDomains" (
  "A" TEXT NOT NULL REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "B" TEXT NOT NULL REFERENCES "ProjectTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "_TopicDomains_AB_unique" ON "_TopicDomains"("A", "B");
CREATE INDEX IF NOT EXISTS "_TopicDomains_B_index" ON "_TopicDomains"("B");

INSERT INTO "_TopicDomains" ("A", "B")
SELECT "domainId", "id" FROM "ProjectTopic" WHERE "domainId" IS NOT NULL
ON CONFLICT DO NOTHING;
