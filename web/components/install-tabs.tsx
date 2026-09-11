'use client';

import { useState, type ReactNode } from 'react';
import { tabsListVariants } from '@/components/ui/tabs';
import ButtonCopy from '@/components/smoothui/button-copy';
import { cn } from '@/lib/cn';
import { installCommands, type InstallKind } from '@/lib/install';

const triggerClass = cn(
  'relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all',
  'hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring',
  'data-[active=true]:bg-background data-[active=true]:text-foreground',
  'dark:text-muted-foreground dark:data-[active=true]:border-input dark:data-[active=true]:bg-input/30 dark:data-[active=true]:text-foreground',
  'max-lg:min-h-11',
);

export function InstallTabs({
  kind = 'global',
  defaultManager = 'npm',
  children,
}: {
  kind?: InstallKind;
  defaultManager?: string;
  children?: ReactNode;
}) {
  const commands = installCommands(kind);
  const managers = Object.keys(commands);
  const initial = managers.includes(defaultManager) ? defaultManager : managers[0];
  const [value, setValue] = useState(initial);
  const command = commands[value as keyof typeof commands];

  return (
    <div className="w-full rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Package manager"
          className={cn(
            tabsListVariants({ variant: 'default' }),
            'max-w-full flex-wrap max-lg:h-auto max-lg:min-h-11 max-lg:p-0.5',
          )}
        >
          {managers.map((manager) => (
            <button
              key={manager}
              type="button"
              aria-pressed={value === manager}
              data-active={value === manager || undefined}
              className={triggerClass}
              onClick={() => setValue(manager)}
            >
              {manager}
            </button>
          ))}
        </div>
        <ButtonCopy
          loadingDuration={0}
          duration={1600}
          onCopy={() => navigator.clipboard.writeText(command)}
        />
      </div>
      <pre className="vmup-code-scroll mt-3 overflow-x-auto font-mono text-[13px] leading-relaxed text-foreground sm:text-sm">
        <code>{command}</code>
      </pre>
      {children}
    </div>
  );
}

const FIRST_RUN = `vmup init
vmup shot.png notes.pdf`;

export function FirstRunCommands() {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Then
        </p>
        <ButtonCopy
          loadingDuration={0}
          duration={1600}
          onCopy={() => navigator.clipboard.writeText(FIRST_RUN)}
        />
      </div>
      <pre className="vmup-code-scroll mt-2 overflow-x-auto font-mono text-[13px] leading-relaxed text-foreground sm:text-sm">
        <code>{FIRST_RUN}</code>
      </pre>
    </div>
  );
}
