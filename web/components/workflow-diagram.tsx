const localFiles = ['shot.png', 'notes.pdf', 'clip.mov'];
const remoteFiles = ['image-01.png', 'file-01.pdf', 'video-01.mov'];

function Panel({
  label,
  path,
  files,
  footer,
  filesMuted = false,
}: {
  label: string;
  path: string;
  files: string[];
  footer: string;
  filesMuted?: boolean;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card px-4 py-4">
      <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-3 truncate font-mono text-[13px] leading-relaxed text-foreground">
        {path}
      </p>
      <ul
        className={`mt-2 space-y-1.5 font-mono text-[13px] leading-relaxed ${
          filesMuted ? 'text-muted-foreground' : 'text-foreground'
        }`}
      >
        {files.map((file) => (
          <li key={file}>{file}</li>
        ))}
      </ul>
      <p className="mt-auto pt-4 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
        {footer}
      </p>
    </div>
  );
}

export function WorkflowDiagram() {
  return (
    <figure>
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Panel
          label="Laptop"
          path="local files"
          files={localFiles}
          footer="You"
        />
        <div
          aria-hidden="true"
          className="flex items-center justify-center gap-2 self-stretch max-sm:flex-col sm:flex-row"
        >
          <span className="h-6 w-px bg-border sm:h-px sm:w-6" />
          <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
            SSH
          </span>
          <span className="h-6 w-px bg-border sm:h-px sm:w-6" />
        </div>
        <Panel
          label="Remote host"
          path="~/vmup/agents-…/"
          files={remoteFiles}
          footer="Coding agent"
          filesMuted
        />
      </div>
      <figcaption className="mt-4 text-sm leading-relaxed text-muted-foreground">
        One SSH upload. One folder on the VM. Paste that path into the agent.
      </figcaption>
    </figure>
  );
}
