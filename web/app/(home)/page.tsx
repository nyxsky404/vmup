import Link from 'next/link';
import { HeroHeading } from '@/components/hero-heading';
import { FirstRunCommands, InstallTabs } from '@/components/install-tabs';
import { BrandMark } from '@/components/logo';
import { WorkflowDiagram } from '@/components/workflow-diagram';

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
    title: 'Paste the path',
    body: 'The remote folder lands on your clipboard with Please inspect all files in … Stay in the thread.',
  },
];

const reasons = [
  {
    title: 'No extra daemon',
    body: 'Files go over ssh and scp you already have. No browser upload, no agent plugin.',
  },
  {
    title: 'The agent only needs a directory',
    body: 'You paste a path. You do not configure Cursor, Claude Code, or anything else.',
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
    best: 'Screenshots and copied files. macOS images need pngpaste.',
  },
  {
    title: 'Watch',
    cmd: 'vmup watch',
    best: 'Files added after start. Default folder is Desktop on macOS.',
  },
];

const facts = [
  'npm package @nyxsky404/vmup; the command is vmup',
  'Node 18+ and OpenSSH (ssh / scp) on your PATH',
  'Default remote root ~/vmup; batch id agents-<date>-<time>-<uuid>',
  'Staged names image-01, video-01, file-01 so the listing is stable',
  'Default TTL 5 minutes; sweeper cron every minute',
  'Default max 200 MB per file; all types accepted unless you tighten config',
  '--json on stdout for scripts; spinner still on stderr',
];

const docs = [
  { href: '/docs/quickstart', label: 'First upload' },
  { href: '/docs/guides/watch', label: 'Watch a folder' },
  { href: '/docs/guides/profiles', label: 'Profiles' },
  { href: '/docs/explain/ttl', label: 'TTL and cleanup' },
  { href: '/docs/reference/commands', label: 'Commands' },
];

export default function HomePage() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pb-24 pt-16 sm:pt-24"
      id="main-content"
      tabIndex={-1}
    >
      <div className="mb-6" aria-hidden="true">
        <BrandMark animate />
      </div>
      <p className="mb-4 text-pretty text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase sm:tracking-[0.18em]">
        For developers who run coding agents over SSH
      </p>
      <HeroHeading>
        vmup gives coding agents one folder path on the remote host
      </HeroHeading>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Send screenshots, PDFs, recordings, and other local files to the VM your
        coding agent is running on. One SSH upload. One folder path to paste.
      </p>

      <section id="install" className="mt-10 scroll-mt-24">
        <InstallTabs>
          <FirstRunCommands />
        </InstallTabs>
        <p className="mt-4 text-sm text-muted-foreground">
          Node 18+ and OpenSSH{' · '}
          <Link href="/docs/quickstart" className="underline underline-offset-4">
            First upload
          </Link>
        </p>
      </section>

      <figure className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <figcaption className="border-b border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          Paste the printed path into the agent. It is already on your
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
            scp moves one file. A morning of screenshots, a notes PDF, and a
            screen recording is a different job: stage a batch, upload it, hand
            back one path, delete it when you are done. vmup does that job.
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
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
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
          <div className="hidden py-3 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase sm:grid sm:grid-cols-[7rem_1fr_1fr] sm:gap-4">
            <span>Method</span>
            <span>Command</span>
            <span>Best for</span>
          </div>
          {modes.map((mode) => (
            <div
              key={mode.cmd}
              className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr_1fr] sm:items-baseline sm:gap-4"
            >
              <h3 className="font-medium">{mode.title}</h3>
              <p className="font-mono text-sm text-foreground">{mode.cmd}</p>
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
        <div className="mt-6 max-w-xl space-y-4 text-base leading-relaxed text-foreground/85">
          <p>
            Remote batches expire after 5 minutes. Temporary files should not
            live forever on the VM. Change the TTL if a run needs longer.
          </p>
          <p>
            A sweeper at{' '}
            <code className="font-mono text-sm">~/vmup/.cleanup.sh</code> runs
            every minute and removes expired{' '}
            <code className="font-mono text-sm">agents-*</code> directories. It
            does not wipe the whole remote root. After you change TTL, run{' '}
            <code className="font-mono text-sm">vmup check --sweeper</code> so
            the remote script matches.
          </p>
          <p>
            <code className="font-mono text-sm">vmup prune</code> deletes
            expired batches from here.{' '}
            <code className="font-mono text-sm">--id</code> deletes one.{' '}
            <code className="font-mono text-sm">--local</code> also clears
            leftover staging under{' '}
            <code className="font-mono text-sm">~/.cache/vmup/</code>. Successful
            uploads already delete that cache unless you pass{' '}
            <code className="font-mono text-sm">--keep-local</code>.
          </p>
        </div>
      </section>

      <section className="mt-24">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Facts
        </h2>
        <ul className="mt-6 max-w-xl space-y-3 text-sm leading-relaxed text-foreground/85">
          {facts.map((fact) => (
            <li key={fact} className="flex gap-3">
              <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-muted-foreground" />
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-24">
        <h2 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
          Install, init, send a file
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          The package is{' '}
          <code className="font-mono text-foreground">@nyxsky404/vmup</code>.
          The binary is <code className="font-mono text-foreground">vmup</code>.
        </p>
        <div className="mt-8">
          <InstallTabs />
        </div>
        <p className="mt-4 text-sm">
          <Link href="/docs/install" className="underline underline-offset-4">
            Install
          </Link>
          {' · '}
          <Link href="/docs/quickstart" className="underline underline-offset-4">
            First upload
          </Link>
          {' · '}
          <Link href="/docs" className="underline underline-offset-4">
            Docs
          </Link>
        </p>
      </section>

      <nav className="mt-20 flex flex-wrap gap-x-6 gap-y-3 text-sm">
        {docs.map((item) => (
          <Link
            key={item.href}
            className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <footer className="mt-24 border-t border-border pt-8 text-sm text-muted-foreground">
        MIT ·{' '}
        <a
          href="https://github.com/nyxsky404/vmup"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          GitHub
        </a>
        {' · '}
        <a
          href="https://www.npmjs.com/package/@nyxsky404/vmup"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          npm
        </a>
      </footer>
    </main>
  );
}
