"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import {
  Button,
  FieldError,
  Input,
  Label,
  StatusBadge,
} from "@sectoria/ui";
import type { DemoAccount } from "@/lib/auth/demo-accounts";

interface LoginFormProps {
  callbackUrl: string;
  demoAccounts: DemoAccount[];
  /** The fixed development OTP, shown as a hint in non-production only. */
  devOtp?: string;
}

type Phase = "phone" | "otp";

/**
 * Phone-first, OTP-based sign-in (auth-and-access-control.mdc). Two explicit
 * phases — request a code for a phone, then enter it — mirroring how Pakistani
 * users expect to authenticate. OTP delivery is mocked in development (the code
 * is shown as a hint); a production build wires a real SMS issue/verify step.
 */
export function LoginForm({
  callbackUrl,
  demoAccounts,
  devOtp,
}: LoginFormProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startOtp(forPhone: string) {
    setPhone(forPhone);
    setError(null);
    setPhase("otp");
  }

  function handleRequestCode(event: FormEvent) {
    event.preventDefault();
    if (phone.trim().length === 0) {
      setError("Enter the phone number registered to your account.");
      return;
    }
    startOtp(phone.trim());
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn("phone-otp", {
        phone,
        otp,
        redirect: false,
      });
      if (!result || result.error) {
        setError(
          "That code didn't match, or no account uses this phone number. Check both and try again.",
        );
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-navy font-sans text-lg font-bold text-text-inverse"
        >
          S
        </span>
        <h1 className="mt-4 font-sans text-xl font-bold text-text-primary">
          Sign in to Sectoria
        </h1>
        <p className="mt-1 font-sans text-sm text-text-tertiary">
          {phase === "phone"
            ? "Enter your phone number to receive a one-time code."
            : "Enter the one-time code sent to your phone."}
        </p>
      </div>

      {phase === "phone" ? (
        <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              mono
              placeholder="+923001234567"
              value={phone}
              invalid={error !== null}
              onChange={(event) => {
                setPhone(event.target.value);
                setError(null);
              }}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </div>
          <Button type="submit" size="lg" className="w-full">
            Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => {
              setPhase("phone");
              setOtp("");
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 self-start font-sans text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Use a different number
          </button>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp">One-time code</Label>
            <Input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              mono
              placeholder="000000"
              value={otp}
              invalid={error !== null}
              onChange={(event) => {
                setOtp(event.target.value);
                setError(null);
              }}
            />
            <p className="font-sans text-xs text-text-tertiary">
              Code sent to <span className="font-mono">{phone}</span>
            </p>
            {error ? <FieldError>{error}</FieldError> : null}
          </div>

          {devOtp ? (
            <p className="rounded-md border border-info-border bg-info-bg px-3 py-2 font-sans text-xs text-info-text">
              Development mode — use code{" "}
              <span className="font-mono font-semibold">{devOtp}</span>.
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting || otp.trim().length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Verify & sign in"
            )}
          </Button>
        </form>
      )}

      {demoAccounts.length > 0 ? (
        <div className="mt-8 border-t border-border-base pt-6">
          <p className="mb-3 font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">
            Demo accounts (development)
          </p>
          <ul className="flex flex-col gap-2">
            {demoAccounts.map((account) => (
              <li key={account.phone}>
                <button
                  type="button"
                  onClick={() => startOtp(account.phone)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-border-base bg-surface-card px-3 py-2 text-left transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light"
                >
                  <span className="min-w-0">
                    <span className="block font-sans text-sm font-medium text-text-primary">
                      {account.name}
                    </span>
                    <span className="block truncate font-mono text-xs text-text-tertiary">
                      {account.phone}
                    </span>
                  </span>
                  {account.nadraVerified ? (
                    <StatusBadge variant="success">
                      <ShieldCheck aria-hidden="true" className="h-3 w-3" />
                      NADRA
                    </StatusBadge>
                  ) : (
                    <StatusBadge variant="warning">Unverified</StatusBadge>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-sans text-xs text-text-tertiary">
            Pick <span className="font-medium">platform admin</span> for the
            society onboarding console, or an{" "}
            <span className="font-medium">Unverified</span> buyer to walk the
            full NADRA verification step.
          </p>
        </div>
      ) : null}
    </div>
  );
}
