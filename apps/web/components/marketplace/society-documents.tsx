import {
  BookOpen,
  Download,
  FileCheck,
  FileText,
  LayoutGrid,
  Receipt,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { EmptyState, Skeleton } from "@sectoria/ui";
import { SocietyDocumentKind } from "@sectoria/types";
import { BentoCell } from "@/components/marketplace/bento";
import {
  formatDocumentContentType,
  formatDocumentFileSize,
  groupSocietyDocumentsByKind,
  type SocietyDocumentPublic,
} from "@/lib/society-documents";

const KIND_ICON: Record<
  (typeof SocietyDocumentKind)[keyof typeof SocietyDocumentKind],
  LucideIcon
> = {
  [SocietyDocumentKind.MASTER_PLAN]: LayoutGrid,
  [SocietyDocumentKind.BROCHURE]: BookOpen,
  [SocietyDocumentKind.PAYMENT_PLAN]: Receipt,
  [SocietyDocumentKind.LOP]: ShieldCheck,
  [SocietyDocumentKind.NOC]: FileCheck,
  [SocietyDocumentKind.OTHER]: FileText,
};

function DocumentDownloadCard({ document }: { document: SocietyDocumentPublic }) {
  const Icon = KIND_ICON[document.kind];
  const fileType = formatDocumentContentType(document.contentType);
  const fileSize = formatDocumentFileSize(document.fileSize);

  return (
    <a
      href={document.url}
      download
      rel="noopener noreferrer"
      target="_blank"
      className="group flex min-h-[44px] items-start gap-3 rounded-xl border border-border-base bg-surface-base p-4 transition-colors duration-200 ease-default hover:border-brand-navy-light hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light focus-visible:ring-offset-2"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-brand-navy-mid transition-colors duration-200 ease-default group-hover:bg-surface-card">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-sans text-sm font-semibold text-text-primary">
          {document.title}
        </span>
        <span className="font-sans text-xs text-text-tertiary">
          {fileType} · {fileSize}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 font-sans text-xs font-medium text-text-accent">
        <Download aria-hidden="true" className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only">Download</span>
      </span>
    </a>
  );
}

/** Content-shaped skeleton for Suspense or deferred document loads. */
export function SocietyDocumentsSkeleton() {
  return (
    <BentoCell size="wide" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </BentoCell>
  );
}

/**
 * Download cards for public society documents (M2) — grouped by kind with
 * file size and type shown before download. Renders inside the trust bento
 * when documents exist; hidden cleanly when empty.
 */
export function SocietyDocuments({
  societyName,
  documents,
  degraded = false,
  loading = false,
}: {
  societyName: string;
  documents: readonly SocietyDocumentPublic[];
  /** When the documents query failed server-side. */
  degraded?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <SocietyDocumentsSkeleton />;
  }

  if (degraded) {
    return (
      <BentoCell size="wide" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-sans text-md font-semibold text-text-primary">
            Documents & downloads
          </h2>
          <p className="font-sans text-sm text-text-secondary">
            Official master plan, brochure, and compliance PDFs published by{" "}
            {societyName}.
          </p>
        </div>
        <EmptyState
          heading="Documents temporarily unavailable"
          description="We couldn't load downloadable files for this society right now. Please refresh the page or try again shortly."
        />
      </BentoCell>
    );
  }

  if (documents.length === 0) return null;

  const groups = groupSocietyDocumentsByKind(documents);

  return (
    <BentoCell size="wide" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-sans text-md font-semibold text-text-primary">
          Documents & downloads
        </h2>
        <p className="font-sans text-sm text-text-secondary">
          Official master plan, brochure, payment plan, and compliance documents
          for {societyName}. File type and size are shown before you download.
        </p>
      </div>

      <div className="flex flex-col gap-6" aria-live="polite">
        {groups.map((group) => {
          const GroupIcon = KIND_ICON[group.kind];
          return (
            <section key={group.kind} aria-labelledby={`doc-group-${group.kind}`}>
              <div className="mb-3 flex items-center gap-2">
                <GroupIcon
                  aria-hidden="true"
                  className="h-4 w-4 text-text-tertiary"
                />
                <h3
                  id={`doc-group-${group.kind}`}
                  className="font-sans text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary"
                >
                  {group.label}
                </h3>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {group.items.map((document) => (
                  <li key={document.id}>
                    <DocumentDownloadCard document={document} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </BentoCell>
  );
}
