import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { docsContentRoute, docsRoute } from '@/lib/shared';

const { rewrite: rewriteDocs } = rewritePath(
  `${docsRoute}{/*path}`,
  `${docsContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteSuffix } = rewritePath(
  `${docsRoute}{/*path}.md`,
  `${docsContentRoute}{/*path}/content.md`,
);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/docs/index' || pathname === '/docs/index/') {
    return NextResponse.redirect(new URL('/docs', request.url), 308);
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    const url = new URL(request.url);
    url.pathname = pathname.replace(/\/+$/, '') || '/';
    return NextResponse.redirect(url, 308);
  }

  const result = rewriteSuffix(request.nextUrl.pathname);
  if (result) {
    const response = NextResponse.rewrite(new URL(result, request.nextUrl));
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  if (isMarkdownPreferred(request)) {
    const result = rewriteDocs(request.nextUrl.pathname);

    if (result) {
      const response = NextResponse.rewrite(new URL(result, request.nextUrl), {
        // this URL has two representations, selected by `Accept`
        headers: { Vary: 'Accept' },
      });
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      response.headers.set('Vary', 'Accept');
      return response;
    }
  }

  return NextResponse.next();
}
