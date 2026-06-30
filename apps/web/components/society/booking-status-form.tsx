"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  FieldError,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sectoria/ui";
import { SocietyBookingStatus, type SocietyBookingStatus as BookingStatus } from "@sectoria/types";
import { api } from "@/lib/trpc/react";

interface BookingStatusFormProps {
  societyId: string;
  bookingStatus: BookingStatus;
  bookingOpensAt: string | null;
  bookingClosesAt: string | null;
}

export function BookingStatusForm({
  societyId,
  bookingStatus,
  bookingOpensAt,
  bookingClosesAt,
}: BookingStatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<BookingStatus>(bookingStatus);
  const [opensAt, setOpensAt] = useState(
    bookingOpensAt ? bookingOpensAt.slice(0, 10) : "",
  );
  const [closesAt, setClosesAt] = useState(
    bookingClosesAt ? bookingClosesAt.slice(0, 10) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = api.society.update.useMutation({
    onSuccess: () => {
      setSuccess("Booking status saved.");
      router.refresh();
    },
    onError: (err: { message: string }) => setError(err.message),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    mutation.mutate({
      societyId,
      data: {
        bookingStatus: status,
        bookingOpensAt:
          status === SocietyBookingStatus.UPCOMING && opensAt.length > 0
            ? new Date(`${opensAt}T00:00:00.000Z`).toISOString()
            : null,
        bookingClosesAt:
          status === SocietyBookingStatus.CLOSED && closesAt.length > 0
            ? new Date(`${closesAt}T00:00:00.000Z`).toISOString()
            : null,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <Label htmlFor="bookingStatus">Booking status</Label>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as BookingStatus)}
        >
          <SelectTrigger id="bookingStatus" className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SocietyBookingStatus.OPEN}>Open</SelectItem>
            <SelectItem value={SocietyBookingStatus.CLOSED}>Closed</SelectItem>
            <SelectItem value={SocietyBookingStatus.UPCOMING}>Upcoming</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {status === SocietyBookingStatus.UPCOMING ? (
        <div>
          <Label htmlFor="bookingOpensAt">Booking opens on</Label>
          <Input
            id="bookingOpensAt"
            type="date"
            className="mt-1.5"
            value={opensAt}
            onChange={(e) => setOpensAt(e.target.value)}
          />
        </div>
      ) : null}
      {status === SocietyBookingStatus.CLOSED ? (
        <div>
          <Label htmlFor="bookingClosesAt">Booking closed on</Label>
          <Input
            id="bookingClosesAt"
            type="date"
            className="mt-1.5"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
          />
        </div>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
      {success ? (
        <p className="font-sans text-sm text-success-text">{success}</p>
      ) : null}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save booking status"}
      </Button>
    </form>
  );
}
