import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import {
  docsContentRoute,
  docsRoute,
  learnContentRoute,
  learnRoute,
} from '@/lib/shared';

const { rewrite: rewriteDocs } = rewritePath(
  `${docsRoute}{/*path}`,
  `${docsContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteLearn } = rewritePath(
  `${learnRoute}{/*path}`,
  `${learnContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteDocsSuffix } = rewritePath(
  `${docsRoute}{/*path}.md`,
  `${docsContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteLearnSuffix } = rewritePath(
  `${learnRoute}{/*path}.md`,
  `${learnContentRoute}{/*path}/content.md`,
);

function firstRewrite(
  pathname: string,
  ...rewrites: Array<(pathname: string) => string | false>
) {
  for (const rewrite of rewrites) {
    const next = rewrite(pathname);
    if (next) return next;
  }
  return undefined;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/docs/index' || pathname === '/docs/index/') {
    return NextResponse.redirect(new URL('/docs', request.url), 308);
  }

  if (pathname === '/learn/index' || pathname === '/learn/index/') {
    return NextResponse.redirect(new URL('/learn', request.url), 308);
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    const url = new URL(request.url);
    url.pathname = pathname.replace(/\/+$/, '') || '/';
    return NextResponse.redirect(url, 308);
  }

  const suffix = firstRewrite(
    request.nextUrl.pathname,
    rewriteDocsSuffix,
    rewriteLearnSuffix,
  );
  if (suffix) {
    const response = NextResponse.rewrite(new URL(suffix, request.nextUrl));
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  if (isMarkdownPreferred(request)) {
    const markdown = firstRewrite(
      request.nextUrl.pathname,
      rewriteDocs,
      rewriteLearn,
    );

    if (markdown) {
      const response = NextResponse.rewrite(new URL(markdown, request.nextUrl), {
        headers: { Vary: 'Accept' },
      });
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      response.headers.set('Vary', 'Accept');
      return response;
    }
  }

  return NextResponse.next();
}
