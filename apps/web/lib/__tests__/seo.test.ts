import { describe, expect, it } from "vitest";
import { SITE } from "../site";
import { webSiteSchema } from "../seo";

describe("webSiteSchema", () => {
  it("SearchAction targets free-text search on the directory", () => {
    const schema = webSiteSchema();
    const action = schema.potentialAction as {
      "@type": string;
      target: string;
      "query-input": string;
    };

    expect(action["@type"]).toBe("SearchAction");
    expect(action.target).toBe(
      `${SITE.url}/societies?search={search_term_string}`,
    );
    expect(action["query-input"]).toBe("required name=search_term_string");
  });
});
