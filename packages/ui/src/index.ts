/**
 * `@sectoria/ui` — the Sectoria design system.
 *
 * Tokens live in `./theme.css` (Tailwind v4 `@theme`) — apps import that
 * file once. Components are presentational only: no data fetching, no tRPC,
 * no business logic. Money/CNIC/date display goes through the `lib` helpers.
 */

// Tokens are a CSS side-effect import for consumers: `@sectoria/ui/theme.css`.

// Helpers
export { formatPKR } from "./lib/format-pkr.js";
export { maskCnic } from "./lib/mask-cnic.js";
export { formatDate } from "./lib/format-date.js";
export { cn } from "./lib/utils.js";

// Hooks
export { useDebouncedValue } from "./hooks/use-debounced-value.js";

// SEO
export { JsonLd, type JsonLdProps, type JsonLdSchema } from "./seo/JsonLd.js";

// Primitives
export { Button, buttonVariants, type ButtonProps } from "./components/button.js";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/card.js";
export { Input, Label, FieldError, type InputProps } from "./components/input.js";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "./components/select.js";
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  type TableCellProps,
} from "./components/table.js";
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/dialog.js";
export { Skeleton } from "./components/skeleton.js";
export { EmptyState, type EmptyStateProps } from "./components/empty-state.js";
export { ErrorState, type ErrorStateProps } from "./components/error-state.js";
export { ProgressBar, type ProgressBarProps } from "./components/progress-bar.js";

// Status & trust badges
export {
  StatusBadge,
  TrustBadge,
  statusBadgeVariants,
  trustBadgeVariants,
  trustBadgeMeta,
  type StatusBadgeProps,
  type TrustBadgeProps,
} from "./components/badge.js";

// Domain display components
export {
  TaxBreakdownCard,
  TaxBreakdownCardSkeleton,
  type TaxBreakdownCardProps,
} from "./components/tax-breakdown-card.js";
export {
  IdentityCard,
  IdentityCardSkeleton,
  type IdentityCardProps,
} from "./components/identity-card.js";
export {
  CertificateCard,
  CertificateCardSkeleton,
  type CertificateCardProps,
  type CertificateDetail,
} from "./components/certificate-card.js";
