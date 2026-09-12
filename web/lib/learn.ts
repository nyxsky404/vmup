export const learnPublishedAt = '2026-09-12T00:00:00.000Z';

export const learnHub = {
  title: 'Guides for remote coding agents',
  description:
    'How to get screenshots, PDFs, and other laptop files onto the VM where Claude Code, Cursor, or Codex runs. Paste fails over SSH; a remote path does not.',
};

export const learnArticleUrls = [
  '/learn/claude-code-paste-image-ssh',
  '/learn/send-files-to-remote-coding-agent',
  '/learn/cursor-remote-ssh-local-files',
  '/learn/claude-code-ssh-screenshot-tools',
  '/learn/claude-code-no-image-found-clipboard-ssh',
] as const;

export type LearnArticleUrl = (typeof learnArticleUrls)[number];

export const learnPostMeta: Record<
  LearnArticleUrl,
  { date: string; tag: string }
> = {
  '/learn/claude-code-paste-image-ssh': { date: '2026-09-12', tag: 'ssh' },
  '/learn/send-files-to-remote-coding-agent': {
    date: '2026-09-12',
    tag: 'agents',
  },
  '/learn/cursor-remote-ssh-local-files': { date: '2026-09-12', tag: 'cursor' },
  '/learn/claude-code-ssh-screenshot-tools': {
    date: '2026-09-12',
    tag: 'comparisons',
  },
  '/learn/claude-code-no-image-found-clipboard-ssh': {
    date: '2026-09-12',
    tag: 'ssh',
  },
};

export function learnDateLabel(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}

export function learnRelated(url: string) {
  return learnArticleUrls.filter((item) => item !== url);
}

export function isLearnArticleUrl(url: string): url is LearnArticleUrl {
  return (learnArticleUrls as readonly string[]).includes(url);
}

export function learnArticleSlug(url: LearnArticleUrl) {
  return url.replace('/learn/', '');
}

export function learnIsoDate(date: string) {
  return `${date}T00:00:00.000Z`;
}

export function formatLearnLlmsIndex(
  origin: string,
  posts: Array<{ url: string; title: string; description?: string }>,
) {
  const originNoSlash = origin.replace(/\/$/, '');
  const lines = [
    '# Learn',
    '',
    `> ${learnHub.description}`,
    '',
    `- [${learnHub.title}](${originNoSlash}/learn): ${learnHub.description}`,
  ];
  for (const post of posts) {
    const description = post.description ? `: ${post.description}` : '';
    lines.push(
      `- [${post.title}](${originNoSlash}${post.url})${description}`,
    );
  }
  return lines.join('\n');
}

export function formatLearnHubMarkdown(
  origin: string,
  posts: Array<{ url: string; title: string; description?: string }>,
) {
  const originNoSlash = origin.replace(/\/$/, '');
  return [
    `# ${learnHub.title} (/learn)`,
    '',
    learnHub.description,
    '',
    ...posts.map((post) => {
      const description = post.description ? `: ${post.description}` : '';
      return `- [${post.title}](${originNoSlash}${post.url})${description}`;
    }),
  ].join('\n');
}

type Faq = { name: string; text: string };

type HowTo = {
  name: string;
  steps: Array<{ name: string; text: string; hash: string }>;
};

export const learnFaqs: Record<string, Faq[]> = {
  '/learn/claude-code-paste-image-ssh': [
    {
      name: 'Can I paste a screenshot into Claude Code over SSH?',
      text: 'No. The image is on your local clipboard and Claude Code only reads the remote machine’s filesystem. Copy the file onto that machine and give Claude the path.',
    },
    {
      name: 'Does SSH forward the clipboard for images?',
      text: 'No. Terminal clipboard integration (OSC 52) copies text out of the remote session. It does not paste a PNG in.',
    },
    {
      name: 'What is the fastest way to get one screenshot onto the server?',
      text: 'Run scp bug.png user@server:/tmp/ then tell Claude to look at /tmp/bug.png. Alias that round trip if you do it more than once a day.',
    },
    {
      name: 'Can I drag an image into Claude Code over Remote-SSH?',
      text: 'Yes. With VS Code or Cursor Remote-SSH, drag the file into the Explorer sidebar so it uploads into the remote workspace, then reference the path in the integrated terminal.',
    },
    {
      name: 'Does tmux break image paste over SSH?',
      text: 'Yes. tmux adds another clipboard, and image paste was never going to survive it. A file path on the remote disk does not care.',
    },
  ],
  '/learn/send-files-to-remote-coding-agent': [
    {
      name: 'Why can’t a remote coding agent see files on my laptop?',
      text: 'The agent process reads paths on the host it runs on. A screenshot, PDF, or recording that exists only on your laptop is a path to the wrong disk.',
    },
    {
      name: 'Is scp enough to send files to Claude Code or Cursor on a VM?',
      text: 'scp is enough for one named file you want to keep. Several screenshots plus a PDF means several copies and a prompt that lists every path. A batch folder is the other job.',
    },
    {
      name: 'Can I send PDFs and recordings, not just screenshots?',
      text: 'Yes. The filesystem boundary is the same for every type. Upload the files, then give the agent a directory to inspect.',
    },
    {
      name: 'Should I use rsync to feed a coding agent?',
      text: 'Use rsync when a nested tree should stay in sync. Use a one-shot batch when the agent only needs a throwaway folder, then delete it.',
    },
  ],
  '/learn/cursor-remote-ssh-local-files': [
    {
      name: 'Why can’t Cursor analyze a local file over Remote-SSH?',
      text: 'The agent runs on the remote host. A local Windows or macOS path in the chat is a link the server cannot open.',
    },
    {
      name: 'Do any attachments work over Cursor Remote-SSH?',
      text: 'Cursor uploads some types by content (images and several text formats). Other types, including HTML in the public report, stay as local paths and fail. Copy those files onto the remote disk.',
    },
    {
      name: 'How do I give Cursor a screenshot on a remote VM?',
      text: 'Put the PNG on the host: drag it into the Remote-SSH explorer, scp it, or upload a batch, then reference the remote path or folder in the thread.',
    },
    {
      name: 'Does Cursor Agent CLI paste clipboard images on Windows?',
      text: 'Clipboard paste into Cursor Agent CLI is unreliable on Windows, especially after Win+Shift+S. Save a file and attach it with @path, or upload it to the host first.',
    },
  ],
  '/learn/claude-code-ssh-screenshot-tools': [
    {
      name: 'What is the simplest tool to paste a screenshot into Claude Code over SSH?',
      text: 'scp. Save the PNG, copy it to the server, paste the remote path. Everything else automates that loop.',
    },
    {
      name: 'Do clipboard daemons work without installing anything on the server?',
      text: 'Some path-upload CLIs (clipssh, sshshot, pastehop, vmup) use the ssh you already have. Shim tools (clipaste, cssh) install a remote helper or reverse tunnel so Ctrl+V looks native.',
    },
    {
      name: 'Which tools handle PDFs and recordings, not only images?',
      text: 'scp, rsync, and vmup. Most Claude Code SSH paste helpers are screenshot-only.',
    },
    {
      name: 'When should I pick a Ctrl+V shim instead of a batch upload?',
      text: 'Pick a shim if you live in the TUI and want one screenshot to attach like a local paste. Pick a batch upload if you have several files, no extra daemon, and a prompt with one folder path.',
    },
    {
      name: 'What is a clipaste alternative for Claude Code over SSH?',
      text: 'clipssh or sshshot if you want a path and no remote shim. cssh if you still want Ctrl+V and will install a helper. scp if you want zero new tools. vmup if you have several files, not one PNG.',
    },
  ],
  '/learn/claude-code-no-image-found-clipboard-ssh': [
    {
      name: 'What does “No image found in clipboard” mean in Claude Code over SSH?',
      text: 'Claude Code asked the remote clipboard for a PNG and got nothing. Over SSH that clipboard is empty or missing. Your screenshot is still on the laptop.',
    },
    {
      name: 'Is this the same as Ctrl+V doing nothing?',
      text: 'Often yes. Some terminals swallow Ctrl+V as text paste. Some sessions print the error. The file still has to reach the remote disk either way.',
    },
    {
      name: 'Does this error also happen locally?',
      text: 'Yes, when the clipboard holds text, a file URL, or a format Claude cannot decode. Over SSH, start by assuming the remote clipboard is the wrong one.',
    },
    {
      name: 'How do I fix it without a clipboard daemon?',
      text: 'Save the screenshot, scp it to the host, and put the remote path in the prompt. Claude reads files even when paste fails.',
    },
  ],
};

export const learnHowTos: Record<string, HowTo> = {
  '/learn/claude-code-paste-image-ssh': {
    name: 'Paste an image into Claude Code over SSH',
    steps: [
      {
        name: 'Save the screenshot as a file',
        text: 'Snip to a PNG on the laptop. Clipboard paste cannot cross SSH.',
        hash: 'save-the-screenshot-as-a-file',
      },
      {
        name: 'Copy it onto the remote host',
        text: 'Use scp, drag into VS Code Remote-SSH, or upload a batch with vmup.',
        hash: 'copy-it-onto-the-remote-host',
      },
      {
        name: 'Give Claude the remote path',
        text: 'Paste a file path or a folder prompt into the Claude Code thread on the server.',
        hash: 'give-claude-the-remote-path',
      },
    ],
  },
  '/learn/send-files-to-remote-coding-agent': {
    name: 'Send laptop files to a coding agent on a remote VM',
    steps: [
      {
        name: 'Collect the local files',
        text: 'Gather screenshots, PDFs, or recordings on the laptop as paths, clipboard items, or a watched folder.',
        hash: 'collect-the-local-files',
      },
      {
        name: 'Upload one batch over SSH',
        text: 'Copy the files into one remote directory the agent can list.',
        hash: 'upload-one-batch-over-ssh',
      },
      {
        name: 'Paste the folder prompt',
        text: 'Tell the agent to inspect that directory. Delete the batch when you are done.',
        hash: 'paste-the-folder-prompt',
      },
    ],
  },
};
