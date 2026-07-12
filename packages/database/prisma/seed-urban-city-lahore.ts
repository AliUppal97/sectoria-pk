/**
 * Seeds Urban City Lahore — the benchmark society profile (v2) with real data
 * from urbancitylahore.com: districts, payment plans, media, milestones, and
 * developer track record.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { AtlStatus, UserRole } from "@sectoria/types";
import { computeSocietyStartingPricePkr } from "../src/society-starting-price.js";
import {
  URBAN_CITY_CDN,
  URBAN_CITY_FILE_SIZES,
  URBAN_CITY_IDENTITY,
  URBAN_CITY_INVENTORY,
  URBAN_CITY_SLUG,
  URBAN_CITY_VIDEOS,
} from "./fixtures/urban-city-lahore.js";

const SEED_EPOCH = new Date("2026-01-05T09:00:00.000Z").getTime();
const FBR_ZONE = "Zone-II";

export interface SeededCategory {
  readonly id: string;
  readonly societyId: string;
  readonly plotType: "RESIDENTIAL" | "COMMERCIAL";
  readonly sizeSqft: number;
  readonly pricePerSqftRupees: number;
  readonly fbrValuationZone: string;
  readonly paymentPlanIds: string[];
  readonly plotIds: string[];
  nextPlotIndex: number;
}

export interface SeededSocietyResult {
  readonly id: string;
  readonly adminUserId: string;
  readonly categories: SeededCategory[];
}

function fakePhone(seq: number): string {
  return `+92300${String(1000000 + (seq % 9000000))}`;
}

function boundaryAround(lat: number, lng: number): Prisma.InputJsonValue {
  const delta = 0.045;
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - delta, lat - delta],
        [lng + delta, lat - delta],
        [lng + delta, lat + delta],
        [lng - delta, lat + delta],
        [lng - delta, lat - delta],
      ],
    ],
  };
}

export async function seedUrbanCityLahore(
  prisma: PrismaClient,
  options: {
    readonly superAdminId: string;
    readonly developerId: string;
    readonly userSeqStart: number;
  },
): Promise<{ society: SeededSocietyResult; nextUserSeq: number }> {
  let userSeq = options.userSeqStart;

  const society = await prisma.society.create({
    data: {
      slug: URBAN_CITY_SLUG,
      name: URBAN_CITY_IDENTITY.name,
      city: URBAN_CITY_IDENTITY.city,
      citySlug: URBAN_CITY_IDENTITY.citySlug,
      authority: URBAN_CITY_IDENTITY.authority,
      lopReferenceNo: URBAN_CITY_IDENTITY.lopReferenceNo,
      nocReferenceNo: URBAN_CITY_IDENTITY.nocReferenceNo,
      hsmsLinked: URBAN_CITY_IDENTITY.hsmsLinked,
      verificationTier: URBAN_CITY_IDENTITY.verificationTier,
      description: URBAN_CITY_IDENTITY.description,
      amenities: [...URBAN_CITY_IDENTITY.amenities],
      latitude: URBAN_CITY_IDENTITY.latitude,
      longitude: URBAN_CITY_IDENTITY.longitude,
      developmentStage: URBAN_CITY_IDENTITY.developmentStage,
      developmentPct: URBAN_CITY_IDENTITY.developmentPct,
      heroImageUrl: URBAN_CITY_IDENTITY.heroImageUrl,
      addressLine: URBAN_CITY_IDENTITY.addressLine,
      district: URBAN_CITY_IDENTITY.district,
      totalLandKanal: new Prisma.Decimal(
        URBAN_CITY_IDENTITY.totalLandKanal.toFixed(2),
      ),
      developedLandKanal: new Prisma.Decimal(
        URBAN_CITY_IDENTITY.developedLandKanal.toFixed(2),
      ),
      boundaryGeoJson: boundaryAround(
        URBAN_CITY_IDENTITY.latitude,
        URBAN_CITY_IDENTITY.longitude,
      ),
      bookingStatus: URBAN_CITY_IDENTITY.bookingStatus,
      publishStatus: "PUBLISHED",
      publishedAt: new Date(SEED_EPOCH),
      createdById: options.superAdminId,
      developerId: options.developerId,
      virtualTourUrl: URBAN_CITY_VIDEOS.virtualTour,
      promoVideoUrl: URBAN_CITY_VIDEOS.promoEmbed,
    },
  });

  await prisma.societyUpdate.createMany({
    data: [
      {
        societyId: society.id,
        title: "Grand Balloting Event of City Oasis",
        body: "Mark your calendars for 11 January 2025 as we unveil City Oasis through a grand balloting event. Pay before 10 January 2025 to get your surcharge waived and secure your future in this exceptional community.",
        category: "BOOKING",
        publishedAt: new Date("2025-01-05T00:00:00.000Z"),
        isPublished: true,
      },
      {
        societyId: society.id,
        title: "Record-Breaking Sewerage & Asphalt Work",
        body: "Setting new industry standards with world-class sewerage and asphalt infrastructure completed in record time across Urban City Lahore.",
        category: "DEVELOPMENT",
        publishedAt: new Date("2024-11-15T00:00:00.000Z"),
        isPublished: true,
      },
      {
        societyId: society.id,
        title: "Urban City & Indus Hospital MOU",
        body: "Urban City proudly partnered with Indus Hospital for a state-of-the-art facility within the community, including a Rs 100 million donation toward construction.",
        category: "GENERAL",
        publishedAt: new Date("2024-02-01T00:00:00.000Z"),
        isPublished: true,
      },
    ],
  });

  userSeq += 1;
  const admin = await prisma.user.create({
    data: {
      name: "Urban City Lahore Admin",
      phone: fakePhone(userSeq),
      email: `admin@${URBAN_CITY_SLUG}.pk`,
      role: UserRole.SOCIETY_ADMIN,
      atlStatus: AtlStatus.FILER,
      nadraVerified: true,
      societyId: society.id,
    },
  });

  const categories: SeededCategory[] = [];

  for (const spec of URBAN_CITY_INVENTORY) {
    const pricePerSqftRupees = spec.totalPricePkr / spec.sizeSqft;

    const category = await prisma.inventoryCategory.create({
      data: {
        societyId: society.id,
        slug: spec.slug,
        phase: spec.phase,
        block: spec.block,
        plotType: spec.plotType,
        sizeLabel: spec.sizeLabel,
        sizeSqft: spec.sizeSqft,
        pricePerSqft: new Prisma.Decimal(pricePerSqftRupees.toFixed(2)),
        totalUnits: spec.totalUnits,
        availableUnits: spec.availableUnits,
        allocationStrategy: spec.allocationStrategy,
        fbrValuationZone: FBR_ZONE,
      },
    });

    const plan = await prisma.paymentPlan.create({
      data: {
        categoryId: category.id,
        label: spec.paymentPlan.label,
        downPaymentPct: new Prisma.Decimal(spec.paymentPlan.downPaymentPct),
        installmentCount: spec.paymentPlan.installmentCount,
        installmentInterval: spec.paymentPlan.installmentInterval,
      },
    });

    const plotIds: string[] = [];
    const plotSampleCount = Math.min(6, spec.availableUnits > 0 ? 6 : 3);
    for (let p = 0; p < plotSampleCount; p += 1) {
      const plot = await prisma.plot.create({
        data: {
          categoryId: category.id,
          serialNo: `${spec.slug}-${String(p + 1).padStart(3, "0")}`,
          plotNo: `${spec.phase.replace(/\s+/g, "")}-${100 + p}`,
          status: spec.availableUnits > 0 ? "AVAILABLE" : "ALLOCATED",
        },
      });
      plotIds.push(plot.id);
    }

    categories.push({
      id: category.id,
      societyId: society.id,
      plotType: spec.plotType,
      sizeSqft: spec.sizeSqft,
      pricePerSqftRupees,
      fbrValuationZone: FBR_ZONE,
      paymentPlanIds: [plan.id],
      plotIds,
      nextPlotIndex: 0,
    });
  }

  // Seeds bypass inventoryCategory router, so recompute never runs —
  // set denormalized startingPricePkr here (H1a / ADR-010).
  // Use persisted Decimal rounding (toFixed(2)), not the raw float used
  // before create — otherwise seed drifts from recompute/backfill (H1b).
  await prisma.society.update({
    where: { id: society.id },
    data: {
      startingPricePkr: computeSocietyStartingPricePkr(
        categories.map((category) => ({
          pricePerSqft: Number(category.pricePerSqftRupees.toFixed(2)),
          sizeSqft: category.sizeSqft,
        })),
      ),
    },
  });

  // M1 — media (official CDN URLs stored as absolute storage keys)
  await prisma.societyMedia.createMany({
    data: [
      {
        societyId: society.id,
        kind: "HERO",
        storageKey: URBAN_CITY_CDN.heroAvif,
        alt: "Urban City Lahore aerial view",
        sortOrder: 0,
        width: 1920,
        height: 1080,
      },
      {
        societyId: society.id,
        kind: "GALLERY",
        storageKey: URBAN_CITY_CDN.cityOasisHero,
        alt: "City Oasis district at Urban City Lahore",
        caption: "City Oasis — A retreat in the city",
        sortOrder: 0,
        width: 1600,
        height: 900,
      },
      {
        societyId: society.id,
        kind: "GALLERY",
        storageKey: URBAN_CITY_CDN.cityVentureDistrict,
        alt: "City Venture district on Main GT Road",
        caption: "City Venture — Adventure at every step",
        sortOrder: 1,
        width: 1600,
        height: 900,
      },
      {
        societyId: society.id,
        kind: "GALLERY",
        storageKey: URBAN_CITY_CDN.droneView,
        alt: "Urban City Lahore drone view",
        caption: "Urban City drone view",
        sortOrder: 2,
        width: 1600,
        height: 900,
      },
      {
        societyId: society.id,
        kind: "GALLERY",
        storageKey: URBAN_CITY_CDN.golfCourse,
        alt: "International standard golf course at Urban City Lahore",
        caption: "International Standard Golf Course",
        sortOrder: 3,
        width: 1600,
        height: 900,
      },
      {
        societyId: society.id,
        kind: "GALLERY",
        storageKey: URBAN_CITY_CDN.grandMosque,
        alt: "90 kanal grand mosque inspired by Turkey's Blue Mosque",
        caption: "90 Kanal Grand Mosque",
        sortOrder: 4,
        width: 1600,
        height: 900,
      },
      {
        societyId: society.id,
        kind: "GALLERY",
        storageKey: URBAN_CITY_CDN.boulevardNight,
        alt: "Urban City Lahore 250 ft mega main boulevard at night",
        caption: "250 ft Mega Main Boulevard",
        sortOrder: 5,
        width: 1600,
        height: 900,
      },
      {
        societyId: society.id,
        kind: "GALLERY",
        storageKey: URBAN_CITY_CDN.gateRender,
        alt: "Grand entrance gate on Narowal Road",
        caption: "Main GT Road Grand Entrance",
        sortOrder: 6,
        width: 1600,
        height: 900,
      },
      {
        societyId: society.id,
        kind: "GALLERY",
        storageKey: URBAN_CITY_CDN.cityVentureBridge,
        alt: "City Venture bridge view at Urban City Lahore",
        caption: "City Venture — We dream big and make it happen",
        sortOrder: 7,
        width: 1600,
        height: 900,
      },
      {
        societyId: society.id,
        kind: "PROGRESS",
        storageKey: URBAN_CITY_CDN.aerialDec2024,
        alt: "Development progress — December 2024",
        capturedAt: new Date("2024-12-14T00:00:00.000Z"),
        sortOrder: 0,
        width: 1200,
        height: 800,
      },
      {
        societyId: society.id,
        kind: "PROGRESS",
        storageKey: URBAN_CITY_CDN.progressDec2024B,
        alt: "Development progress — December 2024 (site aerial)",
        capturedAt: new Date("2024-12-14T12:00:00.000Z"),
        sortOrder: 1,
        width: 1200,
        height: 800,
      },
      {
        societyId: society.id,
        kind: "PROGRESS",
        storageKey: URBAN_CITY_CDN.progressDec2024C,
        alt: "Development progress — December 2024 (infrastructure)",
        capturedAt: new Date("2024-12-14T18:00:00.000Z"),
        sortOrder: 2,
        width: 1200,
        height: 800,
      },
      {
        societyId: society.id,
        kind: "PROGRESS",
        storageKey: URBAN_CITY_CDN.aerialOct2024,
        alt: "Development progress — October 2024",
        capturedAt: new Date("2024-10-26T00:00:00.000Z"),
        sortOrder: 3,
        width: 1200,
        height: 800,
      },
      {
        societyId: society.id,
        kind: "PROGRESS",
        storageKey: URBAN_CITY_CDN.parkPlayArea,
        alt: "Kids play area development — Phase 5",
        capturedAt: new Date("2024-08-01T00:00:00.000Z"),
        sortOrder: 4,
        width: 1200,
        height: 800,
      },
      {
        societyId: society.id,
        kind: "FLOORPLAN",
        storageKey: URBAN_CITY_CDN.cityOasisMapPng,
        alt: "City Oasis district master layout",
        caption: "City Oasis district map",
        sortOrder: 0,
        width: 1400,
        height: 1000,
      },
      {
        societyId: society.id,
        kind: "FLOORPLAN",
        storageKey: URBAN_CITY_CDN.cityOasisMapLayer,
        alt: "City Oasis location overview map",
        caption: "Your guide to City Oasis",
        sortOrder: 1,
        width: 1400,
        height: 1000,
      },
    ],
  });

  // M2 — documents (only verified public PDFs from urbancitylahore.com)
  await prisma.societyDocument.createMany({
    data: [
      {
        societyId: society.id,
        kind: "MASTER_PLAN",
        title: "City Oasis District Marketing Map",
        storageKey: URBAN_CITY_CDN.cityOasisMapPdf,
        fileSize: URBAN_CITY_FILE_SIZES.cityOasisMapPdf,
        contentType: "application/pdf",
        isPublic: true,
        sortOrder: 0,
      },
      {
        societyId: society.id,
        kind: "PAYMENT_PLAN",
        title: "City Oasis Payment Plan (View PDF)",
        storageKey: URBAN_CITY_CDN.cityOasisMapPdf,
        fileSize: URBAN_CITY_FILE_SIZES.cityOasisMapPdf,
        contentType: "application/pdf",
        isPublic: true,
        sortOrder: 1,
      },
    ],
  });

  // M3 — amenities & highlights
  await prisma.amenityFeature.createMany({
    data: [
      {
        societyId: society.id,
        title: "International Standard Golf Course",
        description:
          "Tee off in style at our world-class golf course, designed to meet global standards for a premium golfing experience.",
        icon: "flag",
        sortOrder: 0,
      },
      {
        societyId: society.id,
        title: "90 Kanal Grand Mosque",
        description:
          "Located in Downtown UCL, our 90-kanal mosque is inspired by Turkey's Blue Mosque, reflecting cultural beauty and architectural excellence.",
        icon: "building",
        sortOrder: 1,
      },
      {
        societyId: society.id,
        title: "Tech Park & Smart Data Center",
        description:
          "Built for innovators and forward-thinkers — premium offices, business hub, and seamless connectivity for the future.",
        icon: "cpu",
        sortOrder: 2,
      },
      {
        societyId: society.id,
        title: "Theme Park & Fairytale Garden",
        description:
          "Adventure at every step with a world-class theme park, nature trails, stargazing glamping, and magical garden escapes.",
        icon: "sparkles",
        sortOrder: 3,
      },
      {
        societyId: society.id,
        title: "Indus Hospital",
        description:
          "Urban City donated Rs 100 million toward a state-of-the-art Indus Hospital facility within the community.",
        icon: "heart-pulse",
        sortOrder: 4,
      },
      {
        societyId: society.id,
        title: "100+ Parks",
        description:
          "Enjoy a healthier, happier lifestyle with over 100 parks designed for leisure, play, and relaxation.",
        icon: "trees",
        sortOrder: 5,
      },
    ],
  });

  await prisma.societyHighlight.createMany({
    data: [
      {
        societyId: society.id,
        label: "Total Area",
        value: "80,000+ kanal",
        icon: "map",
        sortOrder: 0,
      },
      {
        societyId: society.id,
        label: "Plots Delivered",
        value: "100,000+",
        icon: "home",
        sortOrder: 1,
      },
      {
        societyId: society.id,
        label: "Main Front",
        value: "2,200 ft",
        icon: "maximize",
        sortOrder: 2,
      },
      {
        societyId: society.id,
        label: "Mega Boulevard",
        value: "250 ft wide",
        icon: "road",
        sortOrder: 3,
      },
      {
        societyId: society.id,
        label: "Authority",
        value: "TMA Muridke / PHATA",
        icon: "badge-check",
        sortOrder: 4,
      },
    ],
  });

  // M4 — connectivity landmarks (from urbancitylahore.com homepage)
  await prisma.nearbyLandmark.createMany({
    data: [
      {
        societyId: society.id,
        name: "McDonald's Kala Shah Kaku",
        category: "HIGHWAY",
        distanceKm: new Prisma.Decimal("0.5"),
        driveTimeMins: 1,
        sortOrder: 0,
      },
      {
        societyId: society.id,
        name: "KFC Kala Shah Kaku",
        category: "HIGHWAY",
        distanceKm: new Prisma.Decimal("0.5"),
        driveTimeMins: 1,
        sortOrder: 1,
      },
      {
        societyId: society.id,
        name: "UET KSK Campus",
        category: "SCHOOL",
        distanceKm: new Prisma.Decimal("2.0"),
        driveTimeMins: 5,
        sortOrder: 2,
      },
      {
        societyId: society.id,
        name: "GC University KSK Campus",
        category: "SCHOOL",
        distanceKm: new Prisma.Decimal("2.5"),
        driveTimeMins: 5,
        sortOrder: 3,
      },
      {
        societyId: society.id,
        name: "University of Health Sciences (UHS)",
        category: "HOSPITAL",
        distanceKm: new Prisma.Decimal("3.0"),
        driveTimeMins: 5,
        sortOrder: 4,
      },
      {
        societyId: society.id,
        name: "Qarshi Interchange (M-11)",
        category: "INTERCHANGE",
        distanceKm: new Prisma.Decimal("4.0"),
        driveTimeMins: 5,
        sortOrder: 5,
      },
      {
        societyId: society.id,
        name: "Lahore Ring Road",
        category: "HIGHWAY",
        distanceKm: new Prisma.Decimal("5.0"),
        driveTimeMins: 3,
        sortOrder: 6,
      },
      {
        societyId: society.id,
        name: "Allama Iqbal International Airport",
        category: "AIRPORT",
        distanceKm: new Prisma.Decimal("35.0"),
        driveTimeMins: 35,
        sortOrder: 7,
      },
      {
        societyId: society.id,
        name: "DHA Lahore",
        category: "HIGHWAY",
        distanceKm: new Prisma.Decimal("18.0"),
        driveTimeMins: 15,
        sortOrder: 8,
      },
      {
        societyId: society.id,
        name: "Muridke Hospital",
        category: "HOSPITAL",
        distanceKm: new Prisma.Decimal("3.5"),
        driveTimeMins: 10,
        sortOrder: 9,
      },
    ],
  });

  // M6 — milestone roadmap (Charting the Path to Excellence)
  await prisma.societyMilestone.createMany({
    data: [
      {
        societyId: society.id,
        title: "Urban City Lahore Ground Breaking",
        description: "City of Possibilities — official ground breaking ceremony.",
        occurredOn: new Date("2023-03-01T00:00:00.000Z"),
        status: "COMPLETED",
        sortOrder: 0,
      },
      {
        societyId: society.id,
        title: "District City Venture Launched",
        description: "City Venture commercial and residential district launched on Main GT Road.",
        occurredOn: new Date("2023-04-01T00:00:00.000Z"),
        status: "COMPLETED",
        sortOrder: 1,
      },
      {
        societyId: society.id,
        title: "District City Oasis Launched",
        description: "City Oasis district launched on Narowal–Muridke Road near Qarshi Interchange.",
        occurredOn: new Date("2023-07-01T00:00:00.000Z"),
        status: "COMPLETED",
        sortOrder: 2,
      },
      {
        societyId: society.id,
        title: "Main GT Road Grand Entrance",
        description: "Grand entrance completed on Main GT Road opposite McDonald's & KFC Kala Shah Kaku.",
        occurredOn: new Date("2023-11-01T00:00:00.000Z"),
        status: "COMPLETED",
        sortOrder: 3,
      },
      {
        societyId: society.id,
        title: "City Oasis Grand Ballot",
        description: "Grand balloting event held on 11 January 2025 with map reveal.",
        occurredOn: new Date("2025-01-11T00:00:00.000Z"),
        status: "COMPLETED",
        sortOrder: 4,
      },
      {
        societyId: society.id,
        title: "Accelerated Development at City Oasis",
        description: "Record-breaking sewerage, asphalt, and infrastructure work across City Oasis.",
        occurredOn: new Date("2025-01-20T00:00:00.000Z"),
        status: "IN_PROGRESS",
        sortOrder: 5,
      },
      {
        societyId: society.id,
        title: "City Tech District Launch",
        description: "Premium offices, business hub, tech park, and smart data center district.",
        occurredOn: new Date("2026-06-01T00:00:00.000Z"),
        status: "PLANNED",
        sortOrder: 6,
      },
      {
        societyId: society.id,
        title: "City Fest District Launch",
        description: "Art museum, open-air cinema, light festival, and performing arts centre.",
        occurredOn: new Date("2026-12-01T00:00:00.000Z"),
        status: "PLANNED",
        sortOrder: 7,
      },
    ],
  });

  // M8 — blog articles from Urban City content hub
  await prisma.article.createMany({
    data: [
      {
        slug: "why-urban-city-future-real-estate-investment",
        title: "Why Urban City is the Future of Real Estate Investment",
        excerpt:
          "Unmatched rates, city-scale infrastructure, and a prime GT Road location make Urban City Lahore a smart investment choice.",
        body: "## Why Urban City stands out\n\nUrban City Lahore spans more than 80,000 kanal with four distinct districts — City Oasis, City Venture, City Tech, and City Fest.\n\n### Investment highlights\n\n- Joint venture by Al-Hafeez and Al-Rehman Developers\n- Direct access from GT Road, M-11, and Ring Road\n- Flexible 3–3.5 year payment plans",
        coverKey: URBAN_CITY_CDN.blogCoverInvestment,
        authorName: "Urban City Editorial",
        publishedAt: new Date("2024-11-29T00:00:00.000Z"),
        isPublished: true,
        societyId: society.id,
        developerId: options.developerId,
      },
      {
        slug: "urban-city-green-spaces-communities",
        title: "The Role of Green Spaces in Enhancing Urban Communities",
        excerpt:
          "With 100+ parks, fairytale gardens, and sustainable design, Urban City puts green living at the centre of community life.",
        body: "## Green spaces at scale\n\nUrban City Lahore integrates nature trails, parks, and eco-friendly design across every district.\n\n### What residents gain\n\n- Healthier lifestyles with walkable green corridors\n- Family-friendly play areas in every phase\n- Sustainable, future-ready urban planning",
        coverKey: URBAN_CITY_CDN.blogCoverGreenSpaces,
        authorName: "Urban City Editorial",
        publishedAt: new Date("2024-11-29T00:00:00.000Z"),
        isPublished: true,
        societyId: society.id,
      },
      {
        slug: "urban-city-redefining-modern-living-lahore",
        title: "How Urban City is Redefining Modern Living in Lahore",
        excerpt:
          "From a 250 ft mega boulevard to international-standard amenities, Urban City is building the city of tomorrow on GT Road.",
        body: "## Modern living, city scale\n\nUrban City connects Lahore to Pakistan with state-of-the-art infrastructure and world-class amenities.\n\n### Lifestyle amenities\n\n- International standard golf course\n- 90 kanal grand mosque\n- Tech park and expo hub",
        coverKey: URBAN_CITY_CDN.blogCoverModernLiving,
        authorName: "Urban City Editorial",
        publishedAt: new Date("2024-11-29T00:00:00.000Z"),
        isPublished: true,
        societyId: society.id,
      },
    ],
  });

  return {
    society: {
      id: society.id,
      adminUserId: admin.id,
      categories,
    },
    nextUserSeq: userSeq,
  };
}

export async function seedUrbanCityDevelopers(prisma: PrismaClient): Promise<{
  readonly urbanCityDeveloperId: string;
  readonly alHafeezDeveloperId: string;
  readonly alRehmanDeveloperId: string;
}> {
  const alHafeez = await prisma.developer.create({
    data: {
      slug: "al-hafeez-developers",
      name: "Al-Hafeez Developers",
      description:
        "Known for creating vibrant communities, Al-Hafeez Developers bring expertise and care to every project — including Al Hafeez Gardens, Dawood Residency, and Lahore Trade Centre.",
      logoKey: URBAN_CITY_CDN.logo,
      websiteUrl: "https://www.urbancitylahore.com/developers",
      foundedYear: 2005,
    },
  });

  await prisma.developerProject.createMany({
    data: [
      {
        developerId: alHafeez.id,
        name: "Al-Hafeez Gardens (Phase 1, 2 & 5)",
        description: "Redefining residential living with thoughtful planning and design.",
        city: "Lahore",
        year: 2010,
        sortOrder: 0,
      },
      {
        developerId: alHafeez.id,
        name: "Dawood Residency",
        description: "A modern residential enclave offering comfort and convenience.",
        city: "Lahore",
        year: 2015,
        sortOrder: 1,
      },
      {
        developerId: alHafeez.id,
        name: "Lahore Trade Centre",
        description: "A thriving commercial space for businesses to grow and connect.",
        city: "Lahore",
        year: 2018,
        sortOrder: 2,
      },
    ],
  });

  const alRehman = await prisma.developer.create({
    data: {
      slug: "al-rehman-developers",
      name: "Al-Rehman Developers",
      description:
        "From Al Rehman Gardens to iconic residential and commercial developments, Al-Rehman Developers are synonymous with reliability, quality, and growth.",
      logoKey: URBAN_CITY_CDN.logo,
      websiteUrl: "https://www.urbancitylahore.com/developers",
      foundedYear: 2008,
    },
  });

  await prisma.developerProject.createMany({
    data: [
      {
        developerId: alRehman.id,
        name: "Al-Rehman Gardens (Phase 1, 2 & 7)",
        description: "Vibrant neighborhoods designed to enhance urban lifestyles.",
        city: "Lahore",
        year: 2012,
        sortOrder: 0,
      },
      {
        developerId: alRehman.id,
        name: "Al-Rehman Square Mall",
        description: "Contemporary shopping with retail, dining, and entertainment.",
        city: "Lahore",
        year: 2019,
        sortOrder: 1,
      },
      {
        developerId: alRehman.id,
        name: "Al-Rehman Education System",
        description: "Empowering future generations with quality education.",
        city: "Lahore",
        year: 2016,
        sortOrder: 2,
      },
    ],
  });

  const urbanCity = await prisma.developer.create({
    data: {
      slug: "urban-city-lahore-developers",
      name: "Urban City Lahore",
      description:
        "A groundbreaking collaboration between Al-Hafeez Developers and Al-Rehman Developers — building the city of tomorrow on Main GT Road, Kala Shah Kaku.",
      logoKey: URBAN_CITY_CDN.logo,
      websiteUrl: "https://www.urbancitylahore.com",
      foundedYear: 2023,
    },
  });

  await prisma.developerProject.createMany({
    data: [
      {
        developerId: urbanCity.id,
        name: "Urban City Lahore — City Oasis",
        description: "Tranquil retreat district on Narowal–Muridke Road.",
        city: "Lahore",
        year: 2023,
        sortOrder: 0,
      },
      {
        developerId: urbanCity.id,
        name: "Urban City Lahore — City Venture",
        description: "Growth and investment hub on Main GT Road Kala Shah Kaku.",
        city: "Lahore",
        year: 2023,
        sortOrder: 1,
      },
    ],
  });

  return {
    urbanCityDeveloperId: urbanCity.id,
    alHafeezDeveloperId: alHafeez.id,
    alRehmanDeveloperId: alRehman.id,
  };
}
