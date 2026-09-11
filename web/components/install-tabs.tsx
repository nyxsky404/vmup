'use client';

import { useState, type ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ButtonCopy from '@/components/smoothui/button-copy';
import { installCommands, type InstallKind } from '@/lib/install';

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
      <Tabs value={value} onValueChange={setValue}>
        <TabsList className="h-auto max-w-full min-h-11 flex-wrap">
          {managers.map((manager) => (
            <TabsTrigger key={manager} value={manager}>
              {manager}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="mt-3 flex items-start justify-between gap-2">
        <pre className="vmup-code-scroll min-w-0 flex-1 overflow-x-auto font-mono text-[13px] leading-relaxed text-foreground sm:text-sm">
          <code>{command}</code>
        </pre>
        <ButtonCopy
          loadingDuration={0}
          duration={1600}
          onCopy={() => navigator.clipboard.writeText(command)}
        />
      </div>
      {children}
    </div>
  );
}

const FIRST_RUN = `vmup init
vmup shot.png notes.pdf`;

export function FirstRunCommands() {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        Then
      </p>
      <div className="mt-2 flex items-start justify-between gap-2">
        <pre className="vmup-code-scroll min-w-0 flex-1 overflow-x-auto font-mono text-[13px] leading-relaxed text-foreground sm:text-sm">
          <code>{FIRST_RUN}</code>
        </pre>
        <ButtonCopy
          loadingDuration={0}
          duration={1600}
          onCopy={() => navigator.clipboard.writeText(FIRST_RUN)}
        />
      </div>
    </div>
  );
}
