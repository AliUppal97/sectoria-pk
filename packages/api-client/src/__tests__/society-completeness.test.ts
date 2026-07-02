import { describe, expect, it } from "vitest";
import { calculateSocietyCompleteness } from "../lib/society-completeness.js";

const complete = {
  name: "DHA Lahore",
  slug: "dha-lahore",
  citySlug: "lahore",
  authority: "LDA",
  latitude: 31.4697,
  longitude: 74.4117,
  lopReferenceNo: "LOP-LDA-2024-100",
  nocReferenceNo: "NOC-LDA-2024-200",
  heroImageUrl: "https://images.sectoria.pk/dha-lahore.jpg",
  description: "A verified society.",
  amenities: ["parks"],
  developmentStage: "Possession Underway",
  addressLine: "Main Boulevard",
};

describe("calculateSocietyCompleteness", () => {
  it("scores a fully-populated society 100 and marks it publishable", () => {
    const result = calculateSocietyCompleteness(complete);
    expect(result.score).toBe(100);
    expect(result.missing).toEqual([]);
    expect(result.isPublishable).toBe(true);
  });

  it("blocks publishing when a required field is missing", () => {
    const result = calculateSocietyCompleteness({
      ...complete,
      heroImageUrl: null,
      lopReferenceNo: "",
    });
    expect(result.isPublishable).toBe(false);
    expect(result.missing).toContain("Hero image");
    expect(result.missing).toContain("LOP reference number");
  });

  it("treats missing coordinates as a single required item", () => {
    const result = calculateSocietyCompleteness({
      ...complete,
      latitude: null,
      longitude: null,
    });
    expect(result.missing).toContain("Map location (latitude & longitude)");
    expect(result.isPublishable).toBe(false);
  });

  it("counts recommended fields toward the score but not the publish gate", () => {
    const result = calculateSocietyCompleteness({
      ...complete,
      description: "",
      amenities: [],
      developmentStage: "",
      addressLine: null,
    });
    expect(result.isPublishable).toBe(true);
    expect(result.score).toBeLessThan(100);
  });

  it("returns 0 and every required label for an empty society", () => {
    const result = calculateSocietyCompleteness({});
    expect(result.score).toBe(0);
    expect(result.isPublishable).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});
