"use server";

import { createLeadInputSchema, LeadSource } from "@sectoria/types";
import { getApi } from "@/lib/trpc/server";

export type CreateLeadState =
  | { status: "idle" }
  | { status: "success"; leadId: string }
  | { status: "error"; message: string };

export async function createLeadAction(
  _prev: CreateLeadState,
  formData: FormData,
): Promise<CreateLeadState> {
  const societyIdsRaw = formData.get("societyIds");
  const societyIds =
    typeof societyIdsRaw === "string"
      ? societyIdsRaw.split(",").filter(Boolean)
      : [];

  const budgetRaw = formData.get("budgetPkr");
  const budgetPkr =
    typeof budgetRaw === "string" && budgetRaw.length > 0
      ? Number.parseInt(budgetRaw.replace(/,/g, ""), 10)
      : undefined;

  const parsed = createLeadInputSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    societyIds,
    categoryId: formData.get("categoryId") || undefined,
    budgetPkr: budgetPkr !== undefined && !Number.isNaN(budgetPkr) ? budgetPkr : undefined,
    paymentPlanPreference: formData.get("paymentPlanPreference") || undefined,
    source: formData.get("source") ?? LeadSource.SUPPORT,
  });

  if (!parsed.success) {
    return { status: "error", message: "Please fill in all required fields." };
  }

  try {
    const api = getApi();
    const lead = await api.lead.create(parsed.data);
    return { status: "success", leadId: lead.id };
  } catch {
    return {
      status: "error",
      message: "We could not submit your request. Please try again.",
    };
  }
}
