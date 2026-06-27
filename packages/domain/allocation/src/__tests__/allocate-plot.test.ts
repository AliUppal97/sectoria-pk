import { describe, expect, it } from "vitest";
import {
  AllocationOutcome,
  AllocationStrategy,
  idSchema,
  type BookingSnapshot,
  type InventoryCategorySnapshot,
  type PlotSlot,
} from "@sectoria/types";
import { allocatePlot } from "../allocate-plot.js";
import { NoAvailableUnitsError } from "../errors.js";

function plot(id: string, serialNo: string): PlotSlot {
  return { plotId: idSchema.parse(id), serialNo };
}

function booking(id = "booking_a"): BookingSnapshot {
  return { bookingId: idSchema.parse(id) };
}

function category(
  strategy: InventoryCategorySnapshot["allocationStrategy"],
  availablePlots: PlotSlot[],
  id = "cat_1",
): InventoryCategorySnapshot {
  return {
    categoryId: idSchema.parse(id),
    allocationStrategy: strategy,
    availablePlots,
  };
}

describe("allocatePlot — FIFO strategy", () => {
  it("assigns the lowest available serial number, regardless of input order", () => {
    const result = allocatePlot(
      category(AllocationStrategy.FIFO, [
        plot("plot_3", "0003"),
        plot("plot_1", "0001"),
        plot("plot_2", "0002"),
      ]),
      booking(),
    );

    expect(result.outcome).toBe(AllocationOutcome.ASSIGNED);
    expect(result.strategy).toBe(AllocationStrategy.FIFO);
    if (result.outcome !== AllocationOutcome.ASSIGNED) {
      throw new Error("expected an ASSIGNED result");
    }
    expect(result.plot.serialNo).toBe("0001");
    expect(result.plot.plotId).toBe(idSchema.parse("plot_1"));
    expect(result.bookingId).toBe(idSchema.parse("booking_a"));
  });

  it("assigns the single available plot when only one remains", () => {
    const result = allocatePlot(
      category(AllocationStrategy.FIFO, [plot("plot_only", "0007")]),
      booking(),
    );

    expect(result.outcome).toBe(AllocationOutcome.ASSIGNED);
    if (result.outcome !== AllocationOutcome.ASSIGNED) {
      throw new Error("expected an ASSIGNED result");
    }
    expect(result.plot.serialNo).toBe("0007");
  });

  it("does not mutate the caller's availablePlots array", () => {
    const plots = [plot("plot_2", "0002"), plot("plot_1", "0001")];
    const snapshot = category(AllocationStrategy.FIFO, plots);

    allocatePlot(snapshot, booking());

    expect(plots.map((p) => p.serialNo)).toEqual(["0002", "0001"]);
  });
});

describe("allocatePlot — BALLOT strategy", () => {
  it("returns a pending result with no plot assigned", () => {
    const result = allocatePlot(
      category(AllocationStrategy.BALLOT, [
        plot("plot_1", "0001"),
        plot("plot_2", "0002"),
      ]),
      booking(),
    );

    expect(result.outcome).toBe(AllocationOutcome.PENDING_BALLOT);
    expect(result.strategy).toBe(AllocationStrategy.BALLOT);
    expect(result).not.toHaveProperty("plot");
  });

  it("queues the booking as a ballot entry the draw can consume", () => {
    const result = allocatePlot(
      category(AllocationStrategy.BALLOT, [plot("plot_1", "0001")]),
      { bookingId: idSchema.parse("booking_x"), buyerId: idSchema.parse("buyer_x") },
    );

    if (result.outcome !== AllocationOutcome.PENDING_BALLOT) {
      throw new Error("expected a PENDING_BALLOT result");
    }
    expect(result.ballotEntry.bookingId).toBe(idSchema.parse("booking_x"));
    expect(result.ballotEntry.buyerId).toBe(idSchema.parse("buyer_x"));
    expect(result.bookingId).toBe(idSchema.parse("booking_x"));
  });

  it("omits buyerId from the ballot entry when the booking has none", () => {
    const result = allocatePlot(
      category(AllocationStrategy.BALLOT, [plot("plot_1", "0001")]),
      booking(),
    );

    if (result.outcome !== AllocationOutcome.PENDING_BALLOT) {
      throw new Error("expected a PENDING_BALLOT result");
    }
    expect(result.ballotEntry.buyerId).toBeUndefined();
  });
});

describe("allocatePlot — zero availability (typed error)", () => {
  it("throws NoAvailableUnitsError for a FIFO category with no available plots", () => {
    expect(() =>
      allocatePlot(category(AllocationStrategy.FIFO, []), booking()),
    ).toThrow(NoAvailableUnitsError);
  });

  it("throws NoAvailableUnitsError for a BALLOT category with no available plots", () => {
    expect(() =>
      allocatePlot(category(AllocationStrategy.BALLOT, []), booking()),
    ).toThrow(NoAvailableUnitsError);
  });

  it("includes the offending categoryId on the thrown error", () => {
    try {
      allocatePlot(category(AllocationStrategy.FIFO, [], "cat_empty"), booking());
      throw new Error("expected allocatePlot to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(NoAvailableUnitsError);
      expect((error as NoAvailableUnitsError).categoryId).toBe("cat_empty");
    }
  });
});
