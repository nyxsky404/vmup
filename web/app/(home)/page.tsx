import Link from 'next/link';
import { Coffee, Star } from 'lucide-react';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { HeroHeading } from '@/components/hero-heading';
import { FirstRunCommands, InstallTabs } from '@/components/install-tabs';
import { JsonLd } from '@/components/json-ld';
import { BrandMark } from '@/components/logo';
import { WorkflowDiagram } from '@/components/workflow-diagram';
import { BUY_ME_A_COFFEE_URL, GITHUB_URL, NPM_URL } from '@/lib/install';
import { homeJsonLd } from '@/lib/schema';
import {
  absoluteUrl,
  appDescription,
  appName,
  appTitle,
  homeOgImage,
} from '@/lib/shared';

export const metadata: Metadata = {
  title: { absolute: appTitle },
  description: appDescription,
  alternates: {
    canonical: absoluteUrl('/'),
    types: {
      'text/plain': '/llms.txt',
    },
  },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/'),
    title: appTitle,
    description: appDescription,
    siteName: appName,
    images: [homeOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: appTitle,
    description: appDescription,
    images: [homeOgImage.url],
  },
};

const beats = [
  {
    n: '01',
    title: 'Collect',
    body: 'Files as arguments, the native picker, the clipboard loop, or a watched folder.',
  },
  {
    n: '02',
    title: 'Upload',
    body: 'OpenSSH carries the batch. A spinner reports uploaded bytes against the total.',
  },
  {
    n: '03',
    title: 'Paste the prompt',
    body: 'The prompt lands on your clipboard with the remote folder path inside it. Stay in the thread.',
  },
];

const reasons = [
  {
    title: 'No extra daemon',
    body: (
      <>
        Files go over <code>ssh</code> you already have. No
        browser upload, no agent plugin.
      </>
    ),
  },
  {
    title: 'The agent only needs a directory',
    body: 'You paste the prompt. You do not configure Cursor, Claude Code, or anything else.',
  },
  {
    title: 'One path per batch',
    body: 'Screenshots, PDFs, and recordings stay in one listing the agent can inspect.',
  },
  {
    title: 'Expires by default',
    body: 'Remote batches expire. Default TTL is 5 minutes.',
  },
];

const modes = [
  {
    title: 'Files',
    cmd: 'vmup shot.png notes.pdf',
    best: 'One-off uploads. A directory sends its immediate files.',
  },
  {
    title: 'Picker',
    cmd: 'vmup',
    best: 'Native multi-select when the files are already on disk.',
  },
  {
    title: 'Clipboard',
    cmd: 'vmup --clip',
    best: (
      <>
        Screenshots and copied files. macOS images need <code>pngpaste</code>.
      </>
    ),
  },
  {
    title: 'Watch',
    cmd: 'vmup watch',
    best: 'Files added after start. Default folder is Desktop on macOS.',
  },
];

const facts: { id: string; body: ReactNode }[] = [
  {
    id: 'package',
    body: (
      <>
        npm package <code>@nyxsky404/vmup</code>; the command is <code>vmup</code>
      </>
    ),
  },
  {
    id: 'deps',
    body: (
      <>
        Node 18+ and OpenSSH (<code>ssh</code>) on your{' '}
        <code>PATH</code>
      </>
    ),
  },
  {
    id: 'remote',
    body: (
      <>
        Default remote root <code>~/vmup</code>; batch id{' '}
        <code>{'agents-<date>-<time>-<uuid>'}</code>
      </>
    ),
  },
  {
    id: 'names',
    body: (
      <>
        Staged names <code>image-01</code>, <code>video-01</code>,{' '}
        <code>file-01</code> so the listing is stable
      </>
    ),
  },
  {
    id: 'ttl',
    body: 'Default TTL 5 minutes; sweeper cron every minute; prune --all wipes now',
  },
  {
    id: 'limits',
    body: 'Default max 200 MB per file; all types accepted unless you tighten config',
  },
  {
    id: 'json',
    body: (
      <>
        <code>--json</code> on stdout for scripts; spinner still on stderr
      </>
    ),
  },
  {
    id: 'clipboard',
    body: (
      <>
        After upload, the prompt is copied (
        <code>clipboard_copy = &quot;prompt&quot;</code>). Set{' '}
        <code>path</code> or <code>none</code> in config.
      </>
    ),
  },
];

export default function HomePage() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pb-24 pt-16 sm:pt-24"
      id="main-content"
      tabIndex={-1}
    >
      <JsonLd data={homeJsonLd()} />
      <div className="mb-6" aria-hidden="true">
        <BrandMark animate />
      </div>
      <p className="mb-4 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase max-sm:tracking-[0.06em]">
        For developers who run{' '}
        <span className="max-sm:whitespace-nowrap">coding agents over SSH</span>
      </p>
      <HeroHeading>
        vmup gives coding agents one folder path on the remote host
      </HeroHeading>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
        The <code>@nyxsky404/vmup</code> CLI sends screenshots, PDFs, recordings,
        and other local files to the VM your coding agent is running on. One SSH
        upload. Paste the prompt; the folder path is inside it.
      </p>

      <section id="install" className="mt-10 scroll-mt-24">
        <InstallTabs>
          <FirstRunCommands />
        </InstallTabs>
        <p className="mt-4 text-sm text-muted-foreground">
          Node 18+ and OpenSSH{' · '}
          <Link
            href="/docs/quickstart"
            className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
          >
            First upload
          </Link>
        </p>
      </section>

      <figure className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <figcaption className="border-b border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          Paste the printed prompt into the agent. It is already on your
          clipboard.
        </figcaption>
        <pre className="vmup-code-scroll overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed text-foreground sm:text-sm">
          <code>{`Uploaded 3 files → default
Agent folder: ~/vmup/agents-20260911-140128-a1b2c3d4/

Prompt:
Please inspect all files in ~/vmup/agents-20260911-140128-a1b2c3d4/`}</code>
        </pre>
      </figure>

      <section className="mt-16">
        <WorkflowDiagram />
      </section>

      <section className="mt-24">
        <h2 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
          The agent inspects a directory. Your laptop is not that directory.
        </h2>
        <div className="mt-6 max-w-xl space-y-4 text-base leading-relaxed text-foreground/85">
          <p>
            A coding agent on a VM reads files by path. The screenshot, the PDF,
            and the recording sit on your machine. Until they exist on the host,
            the agent has nothing to open.
          </p>
          <p>
            <code>scp</code> moves one file. A morning of screenshots, a notes
            PDF, and a screen recording is a different job: stage a batch,
            upload it, hand back a prompt with the folder path, delete it when
            you are done. vmup does that job.
          </p>
        </div>
      </section>

      <section className="mt-24">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Why vmup
        </h2>
        <ul className="mt-8 grid gap-8 sm:grid-cols-2">
          {reasons.map((reason) => (
            <li key={reason.title}>
              <h3 className="font-medium">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {reason.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-24">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          How it works
        </h2>
        <ol className="mt-8 grid gap-8 lg:grid-cols-3">
          {beats.map((beat) => (
            <li key={beat.n}>
              <p className="font-mono text-xs text-muted-foreground">{beat.n}</p>
              <h3 className="mt-2 font-medium">{beat.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {beat.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-24">
        <h2 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
          Choose how files enter vmup
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Every mode ends the same way: one remote folder, one prompt, clipboard
          already loaded.
        </p>
        <div className="mt-10 divide-y divide-border border-y border-border">
          <div className="hidden py-3 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase lg:grid lg:grid-cols-[7rem_1fr_1fr] lg:gap-4">
            <span>Method</span>
            <span>Command</span>
            <span>Best for</span>
          </div>
          {modes.map((mode) => (
            <div
              key={mode.cmd}
              className="grid gap-1 py-4 lg:grid-cols-[7rem_1fr_1fr] lg:items-baseline lg:gap-4"
            >
              <h3 className="font-medium">{mode.title}</h3>
              <p>
                <code>{mode.cmd}</code>
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {mode.best}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-24">
        <h2 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
          Temporary by design
        </h2>
        <div className="mt-6 max-w-xl space-y-4 text-base leading-7 text-foreground/85">
          <p>
            Remote batches expire after 5 minutes. Temporary files should not
            live forever on the VM. Change the TTL if a run needs longer.
          </p>
          <p>
            A sweeper at <code>~/vmup/.cleanup.sh</code> runs every minute and
            removes expired <code>agents-*</code> directories. It does not wipe
            the whole remote root. After you change TTL, run{' '}
            <code>vmup check --sweeper</code> so the remote script matches.
          </p>
          <p>
            <code>vmup prune</code> deletes expired batches from here.{' '}
            <code>--all</code> deletes every remote batch now, ignoring TTL.{' '}
            <code>--id</code> deletes one. <code>--local</code> also clears
            leftover staging under <code>~/.cache/vmup/</code>. Successful
            uploads already delete that cache unless you pass{' '}
            <code>--keep-local</code>.
          </p>
        </div>
      </section>

      <section className="mt-24">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Facts
        </h2>
        <ul className="mt-6 max-w-xl space-y-4 text-sm leading-7 text-foreground/85">
          {facts.map((fact) => (
            <li key={fact.id} className="flex gap-3">
              <span className="mt-[0.7em] size-1 shrink-0 rounded-full bg-muted-foreground" />
              <span>{fact.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-24">
        <h2 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
          Install, init, send a file
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          The package is <code>@nyxsky404/vmup</code>. The binary is{' '}
          <code>vmup</code>.
        </p>
        <div className="mt-8">
          <InstallTabs />
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm max-lg:gap-y-1">
          <Link
            href="/docs/install"
            className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
          >
            Install
          </Link>
          {' · '}
          <Link
            href="/docs/quickstart"
            className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
          >
            First upload
          </Link>
          {' · '}
          <Link
            href="/learn"
            className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
          >
            Learn
          </Link>
          {' · '}
          <Link
            href="/docs"
            className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
          >
            Docs
          </Link>
        </p>
      </section>

      <footer className="mt-16 border-t border-border pt-8 text-sm text-muted-foreground max-lg:pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">Found vmup useful?</p>
            <p className="mt-1 text-muted-foreground">
              A star helps other developers find it.
            </p>
          </div>
          <div className="flex flex-col gap-2 min-[24rem]:flex-row">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-3.5 font-medium text-background transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-[24rem]:w-auto motion-safe:active:scale-[0.98]"
            >
              <Star aria-hidden="true" className="size-4" strokeWidth={2} />
              Star on GitHub
            </a>
            <a
              href={BUY_ME_A_COFFEE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 font-medium text-foreground transition-[background-color,border-color] duration-150 hover:border-foreground/20 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-[24rem]:w-auto motion-safe:active:scale-[0.98]"
            >
              <Coffee
                aria-hidden="true"
                className="size-4 text-[#9a6200] dark:text-[#ffdd00]"
                strokeWidth={2}
              />
              Buy me a coffee
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <nav
              aria-label="Footer"
              className="flex flex-wrap items-center gap-x-4 max-lg:gap-y-0"
            >
              <Link
                href="/docs"
                className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
              >
                Docs
              </Link>
              <Link
                href="/learn"
                className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
              >
                Learn
              </Link>
              <Link
                href="/docs/quickstart"
                className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
              >
                Quickstart
              </Link>
              <Link
                href="/docs/changelog"
                className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
              >
                Changelog
              </Link>
              <a
                href={NPM_URL}
                className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
              >
                npm
              </a>
            </nav>
            <p className="mt-3">
              Maintained by{' '}
              <a
                href={GITHUB_URL}
                className="underline underline-offset-4"
              >
                nyxsky404
              </a>{' '}
            </p>
          </div>
          <a
            href="https://auraplusplus.com/projects/vmup-send-screenshot-to-vms-for-ai-agents-and-get-path-on-clipboard"
            target="_blank"
            rel="noopener"
            title="View this project on Aura++"
            className="inline-block w-36 shrink-0 rounded-lg opacity-55 grayscale transition-[opacity,filter] duration-150 hover:opacity-100 hover:grayscale-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <img
              src="https://auraplusplus.com/images/badges/featured-on-dark.svg"
              alt="Featured on Aura++"
              width="265"
              height="58"
              className="h-auto w-full"
            />
          </a>
        </div>
      </footer>
    </main>
  );
}
