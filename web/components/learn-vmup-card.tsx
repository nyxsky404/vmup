'use client';

import Link from 'next/link';
import ButtonCopy from '@/components/smoothui/button-copy';

const commands = [
  {
    label: 'Install',
    value: 'npm install -g @nyxsky404/vmup',
    copyLabels: {
      idle: 'Copy install command',
      loading: 'Copying install command',
      success: 'Install command copied',
    },
  },
  {
    label: 'Capture screenshots',
    value: 'vmup --clip',
    copyLabels: {
      idle: 'Copy clipboard command',
      loading: 'Copying clipboard command',
      success: 'Clipboard command copied',
    },
  },
] as const;

export function LearnVmupCard({ isGuide }: { isGuide: boolean }) {
  return (
    <aside
      aria-labelledby="vmup-fast-path-heading"
      className="mt-8 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="px-5 pt-5">
        <h2
          id="vmup-fast-path-heading"
          className="text-base font-medium tracking-tight text-foreground"
        >
          The easiest way to send screenshots and files to your remote machine
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Collect copied screenshots, upload one SSH batch, and paste the remote
          folder prompt into your agent.
        </p>
      </div>

      <div className="mx-5 mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
        {commands.map((command) => (
          <div
            key={command.value}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-2 pl-4"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                {command.label}
              </p>
              <code className="mt-1 block !border-0 !bg-transparent !p-0 font-mono text-[13px] leading-relaxed !whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
                {command.value}
              </code>
            </div>
            <ButtonCopy
              ariaLabels={command.copyLabels}
              duration={1600}
              loadingDuration={0}
              onCopy={() => navigator.clipboard.writeText(command.value)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-border px-5 py-4 text-sm">
        <Link
          href={isGuide ? '/docs/quickstart' : '/learn/vmup-remote-agent-files'}
          className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4"
        >
          {isGuide
            ? 'Install vmup and send your first file'
            : 'See the complete vmup workflow'}
        </Link>
      </div>
    </aside>
  );
}
