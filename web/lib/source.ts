import { llms, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsRoute, learnRoute } from './shared';
import { defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

const learn = defineDocs({
  dir: 'content/learn',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export const learnSource = loader({
  baseUrl: learnRoute,
  source: learn.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

function renderLlmsPage(page: {
  data: { title: string; getText: (type: 'processed') => Promise<string> };
  url: string;
}) {
  return page.data.getText('processed').then(
    (body) => `# ${page.data.title} (${page.url})

${body}`,
  );
}

export const docsLlms = llms(source, {
  renderPage: async (page) => renderLlmsPage(page),
});

export const learnLlms = llms(learnSource, {
  renderPage: async (page) => renderLlmsPage(page),
});
