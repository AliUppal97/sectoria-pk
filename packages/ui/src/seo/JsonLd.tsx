import type { JSX } from "react";

/**
 * A schema.org JSON-LD object. The `@context`/`@type` keys are the
 * schema.org discriminators; callers pass an already-shaped, validated
 * object (validation against schema.org shapes lives in `packages/types`,
 * per `seo.mdc`) — this component only serializes and renders it.
 */
export type JsonLdSchema = Record<string, unknown> & {
  "@context"?: string;
  "@type": string;
};

export interface JsonLdProps {
  /** One schema object, or several to emit as separate script tags. */
  schema: JsonLdSchema | JsonLdSchema[];
}

const SCHEMA_ORG_CONTEXT = "https://schema.org";

/**
 * Renders one `<script type="application/ld+json">` tag per schema, with a
 * default `@context` of schema.org when the caller omits it. Reusable
 * across every entity type (Organization, RealEstateListing,
 * AggregateRating, BreadcrumbList) so structured data is declared the same
 * way everywhere.
 *
 * Presentational only — it never fetches or derives data; the caller
 * supplies the fully-formed schema object(s).
 */
export function JsonLd({ schema }: JsonLdProps): JSX.Element {
  const schemas = Array.isArray(schema) ? schema : [schema];

  return (
    <>
      {schemas.map((entry, index) => {
        const withContext: JsonLdSchema = {
          "@context": SCHEMA_ORG_CONTEXT,
          ...entry,
        };
        return (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(withContext) }}
          />
        );
      })}
    </>
  );
}
