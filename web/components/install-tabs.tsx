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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="max-w-full flex-wrap max-lg:h-auto max-lg:min-h-11 max-lg:p-0.5">
            {managers.map((manager) => (
              <TabsTrigger key={manager} value={manager} className="max-lg:min-h-11">
                {manager}
              </TabsTrigger>
            ))}
          </TabsList>
          <ButtonCopy
            loadingDuration={0}
            duration={1600}
            onCopy={() => navigator.clipboard.writeText(command)}
          />
        </div>
      </Tabs>
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
