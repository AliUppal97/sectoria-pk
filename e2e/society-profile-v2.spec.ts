import { expect, test, type Page } from "@playwright/test";

/** Seeded published society with full profile v2 fixtures (packages/database/prisma/seed.ts). */
const PRIMARY_CITY = "lahore";
const PRIMARY_SOCIETY = "urban-city-lahore";
const PRIMARY_SOCIETY_NAME = "Urban City Lahore";
const DEVELOPER_SLUG = "urban-city-lahore-developers";
const PUBLISHED_ARTICLE_SLUG = "why-urban-city-future-real-estate-investment";
const DRAFT_SOCIETY_SLUG = "orchard-gardens-faisalabad";
const DRAFT_ARTICLE_SLUG = "draft-article-not-published";

async function readJsonLdSchemas(page: Page): Promise<Record<string, unknown>[]> {
  const scripts = page.locator('script[type="application/ld+json"]');
  const count = await scripts.count();
  const schemas: Record<string, unknown>[] = [];

  for (let index = 0; index < count; index += 1) {
    const raw = await scripts.nth(index).textContent();
    if (!raw) continue;
    schemas.push(JSON.parse(raw) as Record<string, unknown>);
  }

  return schemas;
}

function schemaTypes(schemas: readonly Record<string, unknown>[]): string[] {
  return schemas.flatMap((schema) => {
    const type = schema["@type"];
    if (typeof type === "string") return [type];
    if (Array.isArray(type)) return type.filter((entry): entry is string => typeof entry === "string");
    return [];
  });
}

test.describe("Society profile v2 — enriched sections", () => {
  test.setTimeout(120_000);

  test("renders hero, gallery, documents, landmarks, developer, and milestones", async ({
    page,
  }) => {
    await page.goto(`/societies/${PRIMARY_CITY}/${PRIMARY_SOCIETY}`);

    await expect(
      page.getByRole("heading", { level: 1, name: PRIMARY_SOCIETY_NAME }),
    ).toBeVisible();

    await expect(page.getByRole("img", { name: "Urban City Lahore aerial view" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Photos" })).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /View full size: City Oasis district at Urban City Lahore/i,
      }),
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: "Documents & downloads" })).toBeVisible();
    await expect(page.getByRole("link", { name: /City Oasis District Marketing Map/i })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Connectivity" })).toBeVisible();
    await expect(page.getByText("McDonald's Kala Shah Kaku")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Developer" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Urban City Lahore logo/i }),
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: "Development roadmap" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Urban City Lahore Ground Breaking", level: 3 }),
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: "By phase" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "City Oasis", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "City Venture", level: 3 })).toBeVisible();
  });

  test("primary purchase CTAs use concierge quote flow — no booking or dealer paths", async ({
    page,
  }) => {
    await page.goto(`/societies/${PRIMARY_CITY}/${PRIMARY_SOCIETY}`);

    await expect(page.getByRole("button", { name: /Book Now/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Start booking/i })).toHaveCount(0);

    // City Oasis categories are sold out — use an open City Venture category for quote CTA.
    await page.goto(
      `/societies/${PRIMARY_CITY}/${PRIMARY_SOCIETY}/city-venture-3-marla-residential`,
    );

    await expect(page).toHaveURL(
      `/societies/${PRIMARY_CITY}/${PRIMARY_SOCIETY}/city-venture-3-marla-residential`,
    );
    await expect(page.getByRole("button", { name: "Request best price" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start booking/i })).toHaveCount(0);
  });
});

test.describe("SEO — structured data, sitemap, and OG images", () => {
  test.setTimeout(120_000);

  test("society profile emits ImageObject and VideoObject JSON-LD via JsonLd", async ({
    page,
  }) => {
    await page.goto(`/societies/${PRIMARY_CITY}/${PRIMARY_SOCIETY}`);

    const schemas = await readJsonLdSchemas(page);
    const types = schemaTypes(schemas);

    expect(types).toContain("Organization");
    expect(types).toContain("ImageObject");
    expect(types.filter((type) => type === "ImageObject").length).toBeGreaterThanOrEqual(2);
    expect(types.filter((type) => type === "VideoObject").length).toBeGreaterThanOrEqual(2);

    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute("content", /website-files\.com/i);
  });

  test("developer and blog pages emit Organization/Article JSON-LD with dedicated OG images", async ({
    page,
  }) => {
    await page.goto(`/developers/${DEVELOPER_SLUG}`);
    let schemas = await readJsonLdSchemas(page);
    expect(schemaTypes(schemas)).toContain("Organization");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /developers\/urban-city-lahore-developers|website-files\.com/i,
    );

    await page.goto(`/blog/${PUBLISHED_ARTICLE_SLUG}`);
    schemas = await readJsonLdSchemas(page);
    expect(schemaTypes(schemas)).toContain("Article");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /website-files\.com/i,
    );
    await expect(page.getByRole("button", { name: "Request best price" })).toBeVisible();
  });

  test("sitemap includes developers and published articles; excludes draft entities", async ({
    page,
  }) => {
    const response = await page.request.get("/sitemap.xml");
    expect(response.ok()).toBe(true);

    const body = await response.text();
    expect(body).toContain(`/developers/${DEVELOPER_SLUG}`);
    expect(body).toContain(`/blog/${PUBLISHED_ARTICLE_SLUG}`);
    expect(body).toContain(`/societies/${PRIMARY_CITY}/${PRIMARY_SOCIETY}`);
    expect(body).not.toContain(DRAFT_SOCIETY_SLUG);
    expect(body).not.toContain(DRAFT_ARTICLE_SLUG);
  });
});
