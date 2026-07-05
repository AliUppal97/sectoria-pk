"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, FieldError, Input, Label } from "@sectoria/ui";
import { trpcVanilla } from "@/lib/trpc/react";

interface ProfileBasicsInitial {
  description: string;
  amenities: string[];
  developmentStage: string;
  developmentPct: number;
  virtualTourUrl: string | null;
  promoVideoUrl: string | null;
}

export function SocietyProfileBasicsForm({
  societyId,
  initial,
}: {
  societyId: string;
  initial: ProfileBasicsInitial;
}) {
  const router = useRouter();
  const [description, setDescription] = useState(initial.description);
  const [amenitiesText, setAmenitiesText] = useState(
    initial.amenities.join(", "),
  );
  const [developmentStage, setDevelopmentStage] = useState(
    initial.developmentStage,
  );
  const [developmentPct, setDevelopmentPct] = useState(
    String(initial.developmentPct),
  );
  const [virtualTourUrl, setVirtualTourUrl] = useState(
    initial.virtualTourUrl ?? "",
  );
  const [promoVideoUrl, setPromoVideoUrl] = useState(
    initial.promoVideoUrl ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const pct = Number.parseInt(developmentPct, 10);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError("Development percentage must be between 0 and 100.");
      return;
    }
    const amenities = amenitiesText
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setPending(true);
    void trpcVanilla.society.update
      .mutate({
        societyId,
        data: {
          description: description.trim(),
          amenities,
          developmentStage: developmentStage.trim(),
          developmentPct: pct,
          virtualTourUrl:
            virtualTourUrl.trim() === "" ? null : virtualTourUrl.trim(),
          promoVideoUrl:
            promoVideoUrl.trim() === "" ? null : promoVideoUrl.trim(),
        },
      })
      .then(() => {
        setSaved(true);
        router.refresh();
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setPending(false));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="profile-description">Description</Label>
        <textarea
          id="profile-description"
          className="mt-1.5 min-h-32 w-full rounded-md border border-border-base bg-surface-card px-3 py-2 font-sans text-sm text-text-primary"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="profile-amenities">
          Quick amenity tags (comma-separated)
        </Label>
        <Input
          id="profile-amenities"
          className="mt-1.5"
          value={amenitiesText}
          onChange={(e) => setAmenitiesText(e.target.value)}
          placeholder="Gated community, 24/7 security, parks"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="profile-stage">Development stage</Label>
          <Input
            id="profile-stage"
            className="mt-1.5"
            value={developmentStage}
            onChange={(e) => setDevelopmentStage(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="profile-pct">Development %</Label>
          <Input
            id="profile-pct"
            type="number"
            min={0}
            max={100}
            className="mt-1.5"
            value={developmentPct}
            onChange={(e) => setDevelopmentPct(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="profile-virtual-tour">Virtual tour URL (optional)</Label>
        <Input
          id="profile-virtual-tour"
          type="url"
          className="mt-1.5"
          value={virtualTourUrl}
          onChange={(e) => setVirtualTourUrl(e.target.value)}
          placeholder="https://"
        />
      </div>
      <div>
        <Label htmlFor="profile-promo-video">Promo video URL (optional)</Label>
        <Input
          id="profile-promo-video"
          type="url"
          className="mt-1.5"
          value={promoVideoUrl}
          onChange={(e) => setPromoVideoUrl(e.target.value)}
          placeholder="https://"
        />
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
      {saved ? (
        <p className="font-sans text-sm text-success" aria-live="polite">
          Profile saved — changes appear on your public page.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
