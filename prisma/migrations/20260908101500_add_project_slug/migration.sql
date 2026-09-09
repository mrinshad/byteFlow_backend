-- AlterTable
ALTER TABLE "Project" ADD COLUMN "slug" TEXT;

-- Backfill slug from name with clean kebab formatting
UPDATE "Project"
SET "slug" = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRIM(name),
      '[^a-zA-Z0-9]+', '-', 'g'
    ),
    '^-+|-+$', '', 'g'
  )
);

-- Handle empty names or fallback if slug became empty
UPDATE "Project"
SET "slug" = 'project-' || SUBSTRING(id FROM 1 FOR 8)
WHERE "slug" IS NULL OR "slug" = '';

-- In case of duplicate slugs, append suffix from project id
WITH ranked_projects AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY "createdAt" ASC) as rn
  FROM "Project"
)
UPDATE "Project" p
SET "slug" = rp.slug || '-' || SUBSTRING(p.id FROM 1 FOR 6)
FROM ranked_projects rp
WHERE p.id = rp.id AND rp.rn > 1;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_slug_idx" ON "Project"("slug");
