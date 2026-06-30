"use client";

import { useActionState } from "react";
import { Button, Input } from "@sectoria/ui";
import { LeadSource } from "@sectoria/types";
import {
  createLeadAction,
  type CreateLeadState,
} from "@/lib/actions/create-lead";

const initialState: CreateLeadState = { status: "idle" };

export interface QuoteRequestFormProps {
  societyIds: string[];
  categoryId?: string;
  source: (typeof LeadSource)[keyof typeof LeadSource];
  heading?: string;
  description?: string;
}

export function QuoteRequestForm({
  societyIds,
  categoryId,
  source,
  heading = "Get the best price",
  description = "A Sectoria advisor will compare authorized dealer rates and call you with a quote — no dealer contact shared upfront.",
}: QuoteRequestFormProps) {
  const [state, formAction, pending] = useActionState(
    createLeadAction,
    initialState,
  );

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-border-base bg-surface-card p-6">
        <h3 className="font-sans text-lg font-bold text-text-primary">
          Request received
        </h3>
        <p className="mt-2 font-sans text-sm text-text-secondary">
          Our team will contact you shortly with the best available price for
          your selection. Reference: {state.leadId.slice(-8).toUpperCase()}
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-border-base bg-surface-card p-6"
    >
      <div>
        <h3 className="font-sans text-lg font-bold text-text-primary">
          {heading}
        </h3>
        <p className="mt-1 font-sans text-sm text-text-secondary">
          {description}
        </p>
      </div>

      <input type="hidden" name="societyIds" value={societyIds.join(",")} />
      <input type="hidden" name="source" value={source} />
      {categoryId ? (
        <input type="hidden" name="categoryId" value={categoryId} />
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="lead-name" className="font-sans text-sm font-medium text-text-primary">
          Full name
        </label>
        <Input id="lead-name" name="name" required autoComplete="name" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="lead-phone" className="font-sans text-sm font-medium text-text-primary">
          Phone number
        </label>
        <Input
          id="lead-phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+923001234567"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="lead-email" className="font-sans text-sm font-medium text-text-primary">
          Email (optional)
        </label>
        <Input id="lead-email" name="email" type="email" autoComplete="email" />
      </div>

      {state.status === "error" ? (
        <p className="font-sans text-sm text-text-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Submitting…" : "Request best price"}
      </Button>
    </form>
  );
}
