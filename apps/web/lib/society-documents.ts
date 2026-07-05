import { SocietyDocumentKind } from "@sectoria/types";

/** Public document row from `document.listForSociety` (signed URL, no storage key). */
export interface SocietyDocumentPublic {
  readonly id: string;
  readonly societyId: string;
  readonly kind: (typeof SocietyDocumentKind)[keyof typeof SocietyDocumentKind];
  readonly title: string;
  readonly url: string;
  readonly fileSize: number;
  readonly contentType: string;
  readonly isPublic: boolean;
  readonly sortOrder: number;
  readonly createdAt: string;
}

/** Profile display order for document kind groups. */
export const SOCIETY_DOCUMENT_KIND_ORDER: readonly (typeof SocietyDocumentKind)[keyof typeof SocietyDocumentKind][] =
  [
    SocietyDocumentKind.MASTER_PLAN,
    SocietyDocumentKind.BROCHURE,
    SocietyDocumentKind.PAYMENT_PLAN,
    SocietyDocumentKind.LOP,
    SocietyDocumentKind.NOC,
    SocietyDocumentKind.OTHER,
  ];

export const SOCIETY_DOCUMENT_KIND_LABEL: Record<
  (typeof SocietyDocumentKind)[keyof typeof SocietyDocumentKind],
  string
> = {
  [SocietyDocumentKind.MASTER_PLAN]: "Master plan",
  [SocietyDocumentKind.BROCHURE]: "Brochure",
  [SocietyDocumentKind.PAYMENT_PLAN]: "Payment plan",
  [SocietyDocumentKind.LOP]: "Letter of permission",
  [SocietyDocumentKind.NOC]: "No objection certificate",
  [SocietyDocumentKind.OTHER]: "Other documents",
};

/** Human-readable file type label from an allow-listed MIME type. */
export function formatDocumentContentType(contentType: string): string {
  switch (contentType) {
    case "application/pdf":
      return "PDF";
    case "image/jpeg":
      return "JPEG";
    case "image/png":
      return "PNG";
    default:
      return contentType.split("/").pop()?.toUpperCase() ?? "File";
  }
}

/** Compact byte size for pre-download disclosure — e.g. "4.3 MB". */
export function formatDocumentFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

export interface SocietyDocumentGroup {
  readonly kind: (typeof SocietyDocumentKind)[keyof typeof SocietyDocumentKind];
  readonly label: string;
  readonly items: readonly SocietyDocumentPublic[];
}

/** Group public documents by kind in profile display order. */
export function groupSocietyDocumentsByKind(
  documents: readonly SocietyDocumentPublic[],
): SocietyDocumentGroup[] {
  const byKind = new Map<
    (typeof SocietyDocumentKind)[keyof typeof SocietyDocumentKind],
    SocietyDocumentPublic[]
  >();

  for (const doc of documents) {
    const list = byKind.get(doc.kind) ?? [];
    list.push(doc);
    byKind.set(doc.kind, list);
  }

  return SOCIETY_DOCUMENT_KIND_ORDER.flatMap((kind) => {
    const items = (byKind.get(kind) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    if (items.length === 0) return [];
    return [{ kind, label: SOCIETY_DOCUMENT_KIND_LABEL[kind], items }];
  });
}
