"use client";

import { useMemo, useState } from "react";
import {
  Button,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatDate,
} from "@sectoria/ui";
import { LedgerEventType, type LedgerEvent } from "@sectoria/types";
import { BookOpen } from "lucide-react";
import { LEDGER_LABEL } from "@/lib/ledger-display";
import { api } from "@/lib/trpc/react";

const EVENT_TYPE_OPTIONS = Object.values(LedgerEventType);

interface LedgerViewerProps {
  initialEvents: LedgerEvent[];
}

/**
 * Filterable audit-ledger viewer. Desktop uses a table; mobile stacks rows as
 * cards (ui-ux-excellence.mdc — no horizontal scroll on phones).
 */
export function LedgerViewer({ initialEvents }: LedgerViewerProps) {
  const [entityId, setEntityId] = useState("");
  const [eventType, setEventType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters = useMemo(() => {
    const parsed: {
      entityId?: string;
      type?: (typeof LedgerEventType)[keyof typeof LedgerEventType];
      dateFrom?: string;
      dateTo?: string;
      limit: number;
    } = { limit: 100 };

    const trimmedEntity = entityId.trim();
    if (trimmedEntity.length > 0) parsed.entityId = trimmedEntity;

    if (eventType !== "all") {
      parsed.type = eventType as (typeof LedgerEventType)[keyof typeof LedgerEventType];
    }

    if (dateFrom.length > 0) {
      parsed.dateFrom = new Date(`${dateFrom}T00:00:00.000Z`).toISOString();
    }
    if (dateTo.length > 0) {
      parsed.dateTo = new Date(`${dateTo}T23:59:59.999Z`).toISOString();
    }

    return parsed;
  }, [entityId, eventType, dateFrom, dateTo]);

  const { data, isFetching, isError, error, refetch } = api.admin.listLedger.useQuery(
    filters,
    { initialData: initialEvents, staleTime: 0 },
  );

  const events = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 rounded-xl border border-border-base bg-surface-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="ledger-entity">Entity ID</Label>
          <Input
            id="ledger-entity"
            value={entityId}
            onChange={(event) => setEntityId(event.target.value)}
            placeholder="Filter by booking, plot, or society id"
            mono
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ledger-type">Event type</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger id="ledger-type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {EVENT_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {LEDGER_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ledger-from">From date</Label>
          <Input
            id="ledger-from"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ledger-to">To date</Label>
          <Input
            id="ledger-to"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </div>
      </div>

      {isError ? (
        <div
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-bg p-4"
        >
          <p className="font-sans text-sm text-danger-text">
            {error.message}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      ) : null}

      <div aria-live="polite" aria-busy={isFetching}>
        {events.length === 0 && !isFetching ? (
          <EmptyState
            icon={BookOpen}
            heading="No ledger events match these filters"
            description="Try clearing the entity ID or widening the date range."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{formatDate(event.createdAt)}</TableCell>
                      <TableCell>{LEDGER_LABEL[event.type]}</TableCell>
                      <TableCell mono className="max-w-[140px] truncate">
                        {event.entityId}
                      </TableCell>
                      <TableCell mono className="max-w-[120px] truncate">
                        {event.actorId ?? "System"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {extractReason(event.payload)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="flex flex-col gap-3 md:hidden">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-xl border border-border-base bg-surface-card p-4"
                >
                  <p className="font-sans text-sm font-semibold text-text-primary">
                    {LEDGER_LABEL[event.type]}
                  </p>
                  <p className="mt-1 font-sans text-xs text-text-tertiary">
                    {formatDate(event.createdAt)}
                  </p>
                  <dl className="mt-3 grid gap-2 font-sans text-xs">
                    <div>
                      <dt className="text-text-tertiary">Entity</dt>
                      <dd className="font-mono break-all">{event.entityId}</dd>
                    </div>
                    <div>
                      <dt className="text-text-tertiary">Actor</dt>
                      <dd className="font-mono break-all">
                        {event.actorId ?? "System"}
                      </dd>
                    </div>
                    {extractReason(event.payload) ? (
                      <div>
                        <dt className="text-text-tertiary">Reason</dt>
                        <dd className="text-text-secondary">
                          {extractReason(event.payload)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function extractReason(payload: Record<string, unknown>): string | null {
  const reason = payload.reason;
  return typeof reason === "string" && reason.length > 0 ? reason : null;
}
