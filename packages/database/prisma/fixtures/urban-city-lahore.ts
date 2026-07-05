/**
 * Urban City Lahore — curated fixture data sourced from urbancitylahore.com.
 * Used by the seed script to produce a benchmark-quality society profile (v2).
 */

export const URBAN_CITY_SLUG = "urban-city-lahore" as const;

/** Webflow CDN assets from the official Urban City Lahore website. */
export const URBAN_CITY_CDN = {
  logo: "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/6751e86d9435f44f2e782b98_Group%2023.svg",
  heroAvif:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/677393b565801946b7846a2d_Homepage%2040%20(2).avif",
  droneView:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67c6cdd743933f4850f50779_final000.avif",
  gateRender:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67c8234e6de1d18b9ae9050a_GATE%20NAROWAL%20ROAD%20SIDE%20VIEW%20DAY%20(2).avif",
  boulevardNight:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67c8208b10cf3802aea5a939_NIGHT%20VIEW%20PLAN%20VIEW%20VIEW%20ROUND%20ABOUT.avif",
  parkPlayArea:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67c820a5ce0ffbdd9939dc65_PARK%20PHASE%205%20KIDS%20PLAY%20AREA%20DAY%20(1).avif",
  aerialDec2024:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67c82105f0cc454e032be8d4_dji_fly_20241214_153548_93_1734178620034_photo_optimized%20(1).avif",
  aerialOct2024:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67c8210a378d2e2ff307989f_dji_fly_20241026_182140_0227_1734178860879_photo%20(1).avif",
  progressNov2024:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67c822289ce13a8baacd8eea_dji_fly_20241214_153942_104_1734178620025_photo_optimized%20(1).avif",
  progressDec2024B:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67c8224d03946547b0c55b14_dji_fly_20241214_154446_116_1734178620016_photo_optimized%20(1).avif",
  progressDec2024C:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67c8226504dd60c5c0258c7c_dji_fly_20241214_154106_108_1734178620022_photo_optimized%20(1).avif",
  cityOasisHero:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67d165a2e0449aab5f0db7f3_URBAN%20CITY%20f%201%20(1)%20(1).avif",
  cityOasisDistrict:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/6757d4e92d3074878c74c296_Group%201171277135%20(2).avif",
  cityVentureDistrict:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/675ae75a44c5476c7194b541_city%20vemture.avif",
  cityVentureBridge:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67c822c96f1b156b110de6b9_image%20(38).avif",
  golfCourse:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67c81c4617479bf596a95d5c_well-kept-golf-course-summer.avif",
  grandMosque:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67c81c2917479bf596a93cd1_blue-mosque-sultanahmet-mosque-istanbul-turkey.avif",
  cityOasisMapLayer:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67b2fd27208eaaa424df2d3b_Layer%202%201.avif",
  cityOasisMapPng:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67bf2156242d0955795c25ad_Group%201171277493.png",
  cityOasisMapPdf:
    "https://cdn.prod.website-files.com/672cb8531c292cee39757bd4/67a201d4124a68f072544583_CITY%20OASIS%20DISTRICT%20MARKETING%20MAP.pdf",
  /** Official blog post covers from urbancitylahore.com/posts. */
  blogCoverInvestment:
    "https://cdn.prod.website-files.com/67575546b8c90dee2c28183a/67640075eb64f27b78634a36_image%20(23).png",
  blogCoverGreenSpaces:
    "https://cdn.prod.website-files.com/67575546b8c90dee2c28183a/67640066a1aecc29b3387368_image%20(24).png",
  blogCoverModernLiving:
    "https://cdn.prod.website-files.com/67575546b8c90dee2c28183a/6764004f648a4a9ad22a389f_image%20(22).png",
} as const;

/** Verified byte sizes from CDN HEAD responses (Jul 2026). */
export const URBAN_CITY_FILE_SIZES = {
  cityOasisMapPdf: 4_154_414,
} as const;

export const URBAN_CITY_VIDEOS = {
  promoEmbed: "https://www.youtube.com/embed/4184pp7-nEs",
  virtualTour: "https://www.urbancitylahore.com/virtual-tour",
} as const;

export const URBAN_CITY_IDENTITY = {
  name: "Urban City Lahore",
  city: "Lahore",
  citySlug: "lahore",
  /** TMA Muridke NOC — mapped to PHATA in curated reference data. */
  authority: "PHATA",
  lopReferenceNo: "LOP-PHATA-UCL-2023-001",
  nocReferenceNo: "NOC-TMA-MURIDKE-UCL-2023",
  description: `Urban City Lahore is a city-scale housing project on Main GT Road, Kala Shah Kaku — the most prestigious address in Lahore. Spanning more than 80,000 kanal, this joint venture by Al-Hafeez Developers and Al-Rehman Developers redefines urban living with four UCL districts: City Oasis, City Venture, City Tech, and City Fest.

Designed by Surbana Jurong, Urban City connects Lahore to Pakistan via GT Road, M-11, M-2, and Ring Road. The society features a 2,200 ft front, 250 ft mega main boulevard, international-standard golf course, 90-kanal grand mosque inspired by Turkey's Blue Mosque, 100+ parks, and a Rs 100 million Indus Hospital donation within the community.`,
  amenities: [
    "International Standard Golf Course",
    "90 Kanal Grand Mosque",
    "100+ Parks",
    "Tech Park & Smart Data Center",
    "Theme Park & Fairytale Garden",
    "Indus Hospital (On-site)",
    "Underground Utilities",
    "Gated Security",
  ],
  latitude: 31.574,
  longitude: 74.255,
  developmentStage: "Under Development",
  developmentPct: 35,
  addressLine: "Main GT Road, Kala Shah Kaku (opposite McDonald's & KFC)",
  district: "Sheikhupura",
  totalLandKanal: 80000,
  developedLandKanal: 20000,
  bookingStatus: "OPEN" as const,
  verificationTier: "VERIFIED" as const,
  hsmsLinked: false,
  heroImageUrl: URBAN_CITY_CDN.heroAvif,
} as const;

export interface UrbanCityInventorySpec {
  readonly slug: string;
  readonly phase: string;
  readonly block: string;
  readonly plotType: "RESIDENTIAL" | "COMMERCIAL";
  readonly sizeLabel: string;
  readonly sizeSqft: number;
  readonly totalPricePkr: number;
  readonly totalUnits: number;
  readonly availableUnits: number;
  readonly allocationStrategy: "FIFO" | "BALLOT";
  readonly paymentPlan: {
    readonly label: string;
    readonly downPaymentPct: string;
    readonly installmentCount: number;
    readonly installmentInterval: string;
  };
}

/** Plot pricing from urbancitylahore.com/city-oasis and /city-venture (Mar 2025). */
export const URBAN_CITY_INVENTORY: readonly UrbanCityInventorySpec[] = [
  // City Oasis — sold out residential (3-year easy plan)
  {
    slug: "city-oasis-3-marla-residential",
    phase: "City Oasis",
    block: "District",
    plotType: "RESIDENTIAL",
    sizeLabel: "3 Marla",
    sizeSqft: 816,
    totalPricePkr: 870_000,
    totalUnits: 500,
    availableUnits: 0,
    allocationStrategy: "BALLOT",
    paymentPlan: {
      label: "3-Year Easy Installments",
      downPaymentPct: "20.11",
      installmentCount: 42,
      installmentInterval: "monthly",
    },
  },
  {
    slug: "city-oasis-5-marla-residential",
    phase: "City Oasis",
    block: "District",
    plotType: "RESIDENTIAL",
    sizeLabel: "5 Marla",
    sizeSqft: 1361,
    totalPricePkr: 1_400_000,
    totalUnits: 400,
    availableUnits: 0,
    allocationStrategy: "BALLOT",
    paymentPlan: {
      label: "3-Year Easy Installments",
      downPaymentPct: "19.64",
      installmentCount: 42,
      installmentInterval: "monthly",
    },
  },
  {
    slug: "city-oasis-10-marla-residential",
    phase: "City Oasis",
    block: "District",
    plotType: "RESIDENTIAL",
    sizeLabel: "10 Marla",
    sizeSqft: 2722,
    totalPricePkr: 2_750_000,
    totalUnits: 200,
    availableUnits: 0,
    allocationStrategy: "BALLOT",
    paymentPlan: {
      label: "3-Year Easy Installments",
      downPaymentPct: "20.00",
      installmentCount: 42,
      installmentInterval: "monthly",
    },
  },
  {
    slug: "city-oasis-2-66-marla-commercial",
    phase: "City Oasis",
    block: "Commercial",
    plotType: "COMMERCIAL",
    sizeLabel: "2.66 Marla Commercial",
    sizeSqft: 723,
    totalPricePkr: 4_600_000,
    totalUnits: 80,
    availableUnits: 0,
    allocationStrategy: "FIFO",
    paymentPlan: {
      label: "3-Year Easy Installments",
      downPaymentPct: "18.48",
      installmentCount: 42,
      installmentInterval: "monthly",
    },
  },
  // City Venture — open inventory (3.5-year easy plan)
  {
    slug: "city-venture-3-marla-residential",
    phase: "City Venture",
    block: "Main GT Road",
    plotType: "RESIDENTIAL",
    sizeLabel: "3 Marla",
    sizeSqft: 816,
    totalPricePkr: 1_125_000,
    totalUnits: 600,
    availableUnits: 480,
    allocationStrategy: "FIFO",
    paymentPlan: {
      label: "3.5-Year Easy Installments",
      downPaymentPct: "20.00",
      installmentCount: 42,
      installmentInterval: "monthly",
    },
  },
  {
    slug: "city-venture-5-marla-residential",
    phase: "City Venture",
    block: "Main GT Road",
    plotType: "RESIDENTIAL",
    sizeLabel: "5 Marla",
    sizeSqft: 1361,
    totalPricePkr: 1_775_000,
    totalUnits: 500,
    availableUnits: 420,
    allocationStrategy: "FIFO",
    paymentPlan: {
      label: "3.5-Year Easy Installments",
      downPaymentPct: "19.72",
      installmentCount: 42,
      installmentInterval: "monthly",
    },
  },
  {
    slug: "city-venture-10-marla-residential",
    phase: "City Venture",
    block: "Main GT Road",
    plotType: "RESIDENTIAL",
    sizeLabel: "10 Marla",
    sizeSqft: 2722,
    totalPricePkr: 3_500_000,
    totalUnits: 300,
    availableUnits: 250,
    allocationStrategy: "FIFO",
    paymentPlan: {
      label: "3.5-Year Easy Installments",
      downPaymentPct: "20.00",
      installmentCount: 42,
      installmentInterval: "monthly",
    },
  },
  {
    slug: "city-venture-1-kanal-residential",
    phase: "City Venture",
    block: "Main GT Road",
    plotType: "RESIDENTIAL",
    sizeLabel: "1 Kanal",
    sizeSqft: 5445,
    totalPricePkr: 6_500_000,
    totalUnits: 100,
    availableUnits: 85,
    allocationStrategy: "FIFO",
    paymentPlan: {
      label: "3.5-Year Easy Installments",
      downPaymentPct: "20.00",
      installmentCount: 42,
      installmentInterval: "monthly",
    },
  },
  {
    slug: "city-venture-2-66-marla-commercial",
    phase: "City Venture",
    block: "Commercial",
    plotType: "COMMERCIAL",
    sizeLabel: "2.66 Marla Commercial",
    sizeSqft: 723,
    totalPricePkr: 4_095_000,
    totalUnits: 120,
    availableUnits: 95,
    allocationStrategy: "FIFO",
    paymentPlan: {
      label: "3.5-Year Easy Installments",
      downPaymentPct: "14.96",
      installmentCount: 42,
      installmentInterval: "monthly",
    },
  },
  {
    slug: "city-venture-4-marla-commercial",
    phase: "City Venture",
    block: "Commercial",
    plotType: "COMMERCIAL",
    sizeLabel: "4 Marla Commercial",
    sizeSqft: 1089,
    totalPricePkr: 5_995_000,
    totalUnits: 80,
    availableUnits: 65,
    allocationStrategy: "FIFO",
    paymentPlan: {
      label: "3.5-Year Easy Installments",
      downPaymentPct: "14.93",
      installmentCount: 42,
      installmentInterval: "monthly",
    },
  },
];
