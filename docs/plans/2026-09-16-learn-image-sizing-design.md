# Learn proof image sizing

## Decision

Proof graphics in Learn articles follow the same inline measure as the prose. They remain clickable for a full-size view, preserve their 16:9 aspect ratio, and scale down fluidly on narrow screens.

The images use one shared `LearnProofImage` MDX component backed by `next/image`. This keeps sizing, loading priority, accessibility, and responsive image behavior consistent across every article.

## Alternatives considered

- A 960px full bleed gave the diagrams more room but broke the article's alignment and made the media feel detached from the explanation.
- A smaller editorial bleed still introduced a second arbitrary reading edge.
- Exact prose alignment creates the clearest hierarchy and matches the requested result.

## Acceptance criteria

- Image and article prose have identical inline bounds at desktop widths.
- The image never overflows the viewport at mobile widths.
- Full-size image links and descriptive alternative text remain available.
- Image assets use a compact modern format without visibly degrading text.
- Learn titles, schema, sitemap, LLM endpoints, and internal links continue to build and render.
