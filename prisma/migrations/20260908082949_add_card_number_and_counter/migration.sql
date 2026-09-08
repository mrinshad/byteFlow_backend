-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "number" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "cardCounter" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing cards with chronological sequence per project
WITH numbered_cards AS (
  SELECT id, "projectId", ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "createdAt" ASC) as row_num
  FROM "Card"
)
UPDATE "Card"
SET "number" = numbered_cards.row_num
FROM numbered_cards
WHERE "Card".id = numbered_cards.id;

-- Initialize project.cardCounter to the highest existing card number in that project
UPDATE "Project" p
SET "cardCounter" = COALESCE((
  SELECT MAX("number") FROM "Card" c WHERE c."projectId" = p.id
), 0);

-- CreateIndex
CREATE INDEX "Card_projectId_number_idx" ON "Card"("projectId", "number");
