import { describe, expect, it } from "vitest";
import {
  LedgerEventType,
  UserRole,
  idSchema,
  isoDateTimeSchema,
  type ActorRef,
  type Id,
  type IsoDateTime,
} from "@sectoria/types";
import {
  createLedgerEvent,
  type CreateLedgerEventInput,
} from "../create-ledger-event.js";
import { InvalidLedgerEventError } from "../errors.js";

const ENTITY_ID: Id = idSchema.parse("booking_test_1");
const EVENT_ID: Id = idSchema.parse("ledger_test_1");
const BOOKING_ID: Id = idSchema.parse("booking_test_1");
const CREATED_AT = "2026-06-27T11:45:00.000Z" as IsoDateTime;

const HUMAN_ACTOR: ActorRef = {
  actorId: idSchema.parse("user_test_1"),
  actorRole: UserRole.SOCIETY_ADMIN,
};

/** A valid input that maxes out every field; override per-test as needed. */
function validInput(
  overrides: Partial<CreateLedgerEventInput> = {},
): CreateLedgerEventInput {
  return {
    id: EVENT_ID,
    type: LedgerEventType.ESCROW_TRANSITIONED,
    entityId: ENTITY_ID,
    payload: { fromState: "ALLOCATED", toState: "INSTALLMENT_DUE" },
    actor: HUMAN_ACTOR,
    createdAt: CREATED_AT,
    bookingId: BOOKING_ID,
    ...overrides,
  };
}

describe("createLedgerEvent — happy path", () => {
  it("returns an event carrying every required field", () => {
    const event = createLedgerEvent(validInput());

    expect(event).toMatchObject({
      id: EVENT_ID,
      type: LedgerEventType.ESCROW_TRANSITIONED,
      entityId: ENTITY_ID,
      bookingId: BOOKING_ID,
      payload: { fromState: "ALLOCATED", toState: "INSTALLMENT_DUE" },
      actorId: HUMAN_ACTOR.actorId,
      actorRole: UserRole.SOCIETY_ADMIN,
      createdAt: CREATED_AT,
    });

    // Every required field is present (not undefined).
    for (const key of ["id", "type", "entityId", "payload", "createdAt"]) {
      expect(event[key as keyof typeof event]).toBeDefined();
    }
  });

  it("produces a createdAt that is a valid ISO 8601 string", () => {
    const event = createLedgerEvent(validInput());

    expect(typeof event.createdAt).toBe("string");
    // Round-trips through the canonical ISO schema...
    expect(() => isoDateTimeSchema.parse(event.createdAt)).not.toThrow();
    // ...and through the platform Date parser without becoming Invalid Date.
    expect(Number.isNaN(Date.parse(event.createdAt))).toBe(false);
    expect(new Date(event.createdAt).toISOString()).toBe(CREATED_AT);
  });

  it("is deterministic: identical input yields a deeply-equal event", () => {
    expect(createLedgerEvent(validInput())).toStrictEqual(
      createLedgerEvent(validInput()),
    );
  });
});

describe("createLedgerEvent — actor handling", () => {
  it("records a system event (no human actor) with null actor fields", () => {
    const event = createLedgerEvent(
      validInput({ actor: { actorId: null, actorRole: null } }),
    );

    expect(event.actorId).toBeNull();
    expect(event.actorRole).toBeNull();
  });

  it("treats an empty actor object as a system event", () => {
    const event = createLedgerEvent(validInput({ actor: {} }));

    expect(event.actorId).toBeNull();
    expect(event.actorRole).toBeNull();
  });
});

describe("createLedgerEvent — bookingId is optional", () => {
  it("omits bookingId for an event not tied to a booking", () => {
    const event = createLedgerEvent(
      validInput({ type: LedgerEventType.VERIFICATION_COMPLETED, bookingId: null }),
    );

    expect(event.bookingId).toBeUndefined();
  });
});

describe("createLedgerEvent — invalid input throws a typed error", () => {
  it("throws when input is null", () => {
    expect(() =>
      createLedgerEvent(null as unknown as CreateLedgerEventInput),
    ).toThrow(InvalidLedgerEventError);
  });

  it("throws when input is undefined", () => {
    expect(() =>
      createLedgerEvent(undefined as unknown as CreateLedgerEventInput),
    ).toThrow(InvalidLedgerEventError);
  });

  it("throws when the event id is empty", () => {
    expect(() =>
      createLedgerEvent(validInput({ id: "" as unknown as Id })),
    ).toThrow(InvalidLedgerEventError);
  });

  it("throws when entityId is empty", () => {
    expect(() =>
      createLedgerEvent(validInput({ entityId: "" as unknown as Id })),
    ).toThrow(InvalidLedgerEventError);
  });

  it("throws when the event type is not a known LedgerEventType", () => {
    expect(() =>
      createLedgerEvent(
        validInput({ type: "NOT_A_REAL_EVENT" as unknown as typeof LedgerEventType.BOOKING_CREATED }),
      ),
    ).toThrow(InvalidLedgerEventError);
  });

  it("throws when createdAt is not a valid ISO 8601 string", () => {
    expect(() =>
      createLedgerEvent(validInput({ createdAt: "27-06-2026" as IsoDateTime })),
    ).toThrow(InvalidLedgerEventError);
  });

  it("throws when createdAt lacks a timezone offset", () => {
    expect(() =>
      createLedgerEvent(
        validInput({ createdAt: "2026-06-27T11:45:00" as IsoDateTime }),
      ),
    ).toThrow(InvalidLedgerEventError);
  });
});
