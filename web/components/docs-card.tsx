import Link from 'next/link';
import { cn } from '@/lib/cn';

export function Card({
  title,
  description,
  href,
  className,
}: {
  title: string;
  description?: string;
  href?: string;
  className?: string;
}) {
  const classNames = cn(
    'block rounded-xl border bg-fd-card p-4 text-fd-card-foreground transition-colors @max-lg:col-span-full max-lg:min-h-11',
    href && 'hover:bg-fd-accent/80',
    className,
  );

  const body = (
    <>
      <p className="not-prose mb-1 text-sm font-medium">{title}</p>
      {description ? (
        <p className="my-0! text-sm text-fd-muted-foreground">{description}</p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} data-card className={classNames}>
        {body}
      </Link>
    );
  }

  return (
    <div data-card className={classNames}>
      {body}
    </div>
  );
}
