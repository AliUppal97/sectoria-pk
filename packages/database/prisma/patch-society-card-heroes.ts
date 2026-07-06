/**
 * One-off patch: replace non-loadable `images.sectoria.pk` card heroes with
 * Unsplash URLs. Safe to re-run; idempotent for demo society slugs.
 *
 * Prefer `pnpm --filter @sectoria/database db:seed` on a fresh dev DB; use this
 * when you cannot afford a full truncate/reseed.
 */
import { PrismaClient } from "@prisma/client";
import { societyCardHeroUrl } from "./fixtures/society-card-images.js";

const DEMO_SOCIETY_SLUGS = [
  "dha-lahore",
  "bahria-town-lahore",
  "capital-smart-city",
  "dha-islamabad",
  "bahria-town-karachi",
] as const;

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  for (const slug of DEMO_SOCIETY_SLUGS) {
    const url = societyCardHeroUrl(slug);
    const society = await prisma.society.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (society === null) {
      console.warn(`skip ${slug}: not found`);
      continue;
    }

    await prisma.society.update({
      where: { id: society.id },
      data: { heroImageUrl: url },
    });
    await prisma.societyMedia.updateMany({
      where: { societyId: society.id, kind: "HERO" },
      data: { storageKey: url },
    });
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
