'use client';

import { useRef, useState } from 'react';

const remotePath = '~/vmup/agents-20261107-120000-a1b2c3d4/';
const prompt = `Please inspect all files in ${remotePath}`;
const steps = [
  {
    label: '1. Collect',
    description: 'Choose files on your laptop. Run vmup init once to save your SSH target.',
    terminal: '$ vmup shot.png notes.pdf\n\nLocal files\n  shot.png\n  notes.pdf',
  },
  {
    label: '2. Upload',
    description: 'OpenSSH transfers the batch. Files get stable names in one remote folder.',
    terminal: `$ vmup shot.png notes.pdf\n\nUploaded 2 files → default\nAgent folder: ${remotePath}\n\nRemote files\n  image-01.png\n  file-01.pdf`,
  },
  {
    label: '3. Paste',
    description: 'The CLI copies this prompt to your clipboard. Paste it into your remote agent thread.',
    terminal: `Uploaded 2 files → default\nAgent folder: ${remotePath}\nExpires: Nov 7, 2026, 12:05:00 PM UTC (5-minute TTL)\n\nPrompt:\n${prompt}`,
  },
];

const buttonClass = 'min-h-11 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring';

export function UploadDemo() {
  const [step, setStep] = useState(0);
  const [copyStatus, setCopyStatus] = useState('');
  const copyRequest = useRef(0);
  const current = steps[step];

  function selectStep(index: number) {
    copyRequest.current += 1;
    setStep(index);
    setCopyStatus('');
  }

  async function copyPrompt() {
    const request = ++copyRequest.current;
    try {
      await navigator.clipboard.writeText(prompt);
      if (request === copyRequest.current) setCopyStatus('Sample prompt copied.');
    } catch {
      if (request === copyRequest.current) {
        setCopyStatus('Clipboard unavailable. Select and copy the prompt above.');
      }
    }
  }

  return (
    <section id="demo" aria-labelledby="demo-heading" className="mt-10 scroll-mt-24">
      <div className="mb-4">
        <h2 id="demo-heading" className="font-serif text-2xl tracking-tight text-foreground">
          Two files. One folder. One prompt.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Try the workflow with sample files. This browser simulation does not upload files or connect over SSH.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div role="group" aria-label="Demo step" className="flex flex-wrap gap-2 border-b border-border p-3">
          {steps.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={step === index}
              aria-controls="demo-terminal"
              className={`${buttonClass} flex-1 aria-pressed:bg-foreground aria-pressed:text-background`}
              onClick={() => selectStep(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div aria-live="polite" aria-atomic="true">
          <p className="min-h-20 px-4 pt-4 text-sm leading-relaxed text-muted-foreground sm:min-h-16">
            {current.description}
          </p>
          <pre id="demo-terminal" tabIndex={0} aria-label="Sample terminal output" className="vmup-code-scroll min-h-64 overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring sm:text-sm">
            <code>{current.terminal}</code>
          </pre>
        </div>
        <div className="flex min-h-20 flex-wrap items-center gap-3 border-t border-border px-4 py-3">
          <button
            type="button"
            className={buttonClass}
            onClick={() => selectStep((step + 1) % steps.length)}
          >
            {step === steps.length - 1 ? 'Start again' : 'Next step →'}
          </button>
          {step === steps.length - 1 ? (
            <button type="button" className={buttonClass} onClick={copyPrompt}>
              Copy sample prompt
            </button>
          ) : null}
          <p role="status" className="text-sm text-muted-foreground">{copyStatus}</p>
        </div>
      </div>
      <noscript><p>Enable JavaScript to step through the demo, or follow the <a href="/docs/quickstart">first-upload guide</a>.</p></noscript>
    </section>
  );
}
