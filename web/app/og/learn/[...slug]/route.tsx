import { learnSource } from '@/lib/source';
import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { appName, getPageImageUrl } from '@/lib/shared';

const MARK_DOTS = [
  [14, 14],
  [32, 14],
  [50, 14],
  [14, 32],
  [32, 32],
  [50, 32],
  [14, 50],
  [32, 50],
  [50, 50],
] as const;

function VmupMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 64 64" fill="#e5e5e5">
      {MARK_DOTS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={5} />
      ))}
    </svg>
  );
}

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: RouteContext<'/og/learn/[...slug]'>,
) {
  const { slug } = await params;
  const page = learnSource.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          color: '#e5e5e5',
          padding: '64px',
          backgroundColor: '#121212',
          borderBottom: '16px solid #2a2a2a',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 52,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
          }}
        >
          {page.data.title}
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 28,
            lineHeight: 1.35,
            color: 'rgba(229,229,229,0.72)',
            maxWidth: 980,
          }}
        >
          {page.data.description}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            marginTop: 'auto',
          }}
        >
          <VmupMark />
          <div style={{ fontSize: 36, fontWeight: 600 }}>{appName}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

export function generateStaticParams() {
  return learnSource.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImageUrl(page, 'learn').segments,
  }));
}
