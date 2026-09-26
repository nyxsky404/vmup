export const learnPublishedAt = '2026-09-12T00:00:00.000Z';

export const learnHub = {
  title: 'Guides for remote coding agents',
  description:
    'How to get screenshots, PDFs, and other laptop files onto the VM where Claude Code, Cursor, or Codex runs. Paste fails over SSH; a remote path does not.',
};

export const learnArticleUrls = [
  '/learn/vmup-remote-agent-files',
  '/learn/paste-screenshots-remote-terminal',
  '/learn/claude-code-paste-image-ssh',
  '/learn/codex-cli-image-ssh',
  '/learn/scp-multiple-files',
  '/learn/send-files-to-remote-coding-agent',
  '/learn/cursor-remote-ssh-local-files',
  '/learn/claude-code-ssh-screenshot-tools',
  '/learn/claude-code-no-image-found-clipboard-ssh',
] as const;

export type LearnArticleUrl = (typeof learnArticleUrls)[number];

export const learnPostMeta: Record<
  LearnArticleUrl,
  { date: string; tags: readonly string[] }
> = {
  '/learn/vmup-remote-agent-files': {
    date: '2026-09-27',
    tags: ['vmup', 'copy-files-via-ssh', 'send-files-remote-coding-agent'],
  },
  '/learn/paste-screenshots-remote-terminal': {
    date: '2026-09-27',
    tags: [
      'paste-screenshot-remote-terminal',
      'upload-screenshot-over-ssh',
      'copy-clipboard-image-remote-server',
    ],
  },
  '/learn/claude-code-paste-image-ssh': {
    date: '2026-09-12',
    tags: [
      'claude-code-image-input',
      'paste-screenshot-claude-code',
      'claude-code-paste-image-ssh',
    ],
  },
  '/learn/codex-cli-image-ssh': {
    date: '2026-09-16',
    tags: ['codex-cli-image', 'codex-image-ssh'],
  },
  '/learn/scp-multiple-files': {
    date: '2026-09-24',
    tags: [
      'scp-multiple-files',
      'scp-multiple-files-at-once',
      'how-to-scp-multiple-files',
    ],
  },
  '/learn/send-files-to-remote-coding-agent': {
    date: '2026-09-12',
    tags: [
      'scp-local-to-remote',
      'copy-files-via-ssh',
      'ssh-copy-files-local-to-remote',
    ],
  },
  '/learn/cursor-remote-ssh-local-files': {
    date: '2026-09-12',
    tags: ['cursor-remote-ssh-local-files', 'cursor-remote-ssh-upload-file'],
  },
  '/learn/claude-code-ssh-screenshot-tools': {
    date: '2026-09-12',
    tags: [
      'claude-code-ssh-screenshot-uploader',
      'automatic-screenshot-upload-ssh',
      'clipssh',
    ],
  },
  '/learn/claude-code-no-image-found-clipboard-ssh': {
    date: '2026-09-12',
    tags: [
      'claude-code-no-image-found-clipboard',
      'claude-code-image-clipboard-ssh',
    ],
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

const learnRelatedUrls: Record<
  LearnArticleUrl,
  readonly LearnArticleUrl[]
> = {
  '/learn/vmup-remote-agent-files': [
    '/learn/paste-screenshots-remote-terminal',
    '/learn/send-files-to-remote-coding-agent',
    '/learn/claude-code-ssh-screenshot-tools',
  ],
  '/learn/paste-screenshots-remote-terminal': [
    '/learn/vmup-remote-agent-files',
    '/learn/claude-code-paste-image-ssh',
    '/learn/codex-cli-image-ssh',
    '/learn/claude-code-ssh-screenshot-tools',
  ],
  '/learn/claude-code-paste-image-ssh': [
    '/learn/paste-screenshots-remote-terminal',
    '/learn/claude-code-no-image-found-clipboard-ssh',
    '/learn/claude-code-ssh-screenshot-tools',
  ],
  '/learn/codex-cli-image-ssh': [
    '/learn/paste-screenshots-remote-terminal',
    '/learn/send-files-to-remote-coding-agent',
    '/learn/claude-code-paste-image-ssh',
  ],
  '/learn/scp-multiple-files': [
    '/learn/send-files-to-remote-coding-agent',
    '/learn/claude-code-paste-image-ssh',
  ],
  '/learn/send-files-to-remote-coding-agent': [
    '/learn/paste-screenshots-remote-terminal',
    '/learn/scp-multiple-files',
    '/learn/cursor-remote-ssh-local-files',
    '/learn/codex-cli-image-ssh',
  ],
  '/learn/cursor-remote-ssh-local-files': [
    '/learn/send-files-to-remote-coding-agent',
    '/learn/claude-code-paste-image-ssh',
  ],
  '/learn/claude-code-ssh-screenshot-tools': [
    '/learn/paste-screenshots-remote-terminal',
    '/learn/claude-code-paste-image-ssh',
    '/learn/claude-code-no-image-found-clipboard-ssh',
  ],
  '/learn/claude-code-no-image-found-clipboard-ssh': [
    '/learn/claude-code-paste-image-ssh',
    '/learn/claude-code-ssh-screenshot-tools',
  ],
};

export function learnRelated(url: string) {
  return isLearnArticleUrl(url) ? learnRelatedUrls[url] : [];
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
  '/learn/vmup-remote-agent-files': [
    {
      name: 'What does vmup send to a remote coding agent?',
      text: 'vmup uploads selected screenshots and files into one temporary folder on the remote host, then copies a prompt containing that folder path.',
    },
    {
      name: 'Does vmup replace scp?',
      text: 'Use scp for a direct copy with the original filename. Use vmup when several files belong to one agent request and one temporary folder is easier to share.',
    },
    {
      name: 'Can vmup capture screenshots from the clipboard?',
      text: 'Yes on macOS and Linux. Run vmup --clip, capture each clipboard item with Enter, then type done to upload the batch.',
    },
    {
      name: 'Does vmup upload files to a cloud service?',
      text: 'No. The CLI uses your OpenSSH connection to copy files from your machine to the host you configured.',
    },
    {
      name: 'How long do vmup files stay on the remote machine?',
      text: 'The default TTL is five minutes. You can change it in config or delete batches at once with vmup prune --all.',
    },
  ],
  '/learn/paste-screenshots-remote-terminal': [
    {
      name: 'Can I paste a screenshot into a remote terminal over SSH?',
      text: 'Upload the screenshot to the SSH host, then paste its remote file path. Plain terminal paste does not copy local image bytes to the server.',
    },
    {
      name: 'Why does Cmd+V or Ctrl+V fail with screenshots over SSH?',
      text: 'The image lives in the laptop clipboard while the receiving process runs on the server. Text crosses the terminal session; the image needs a file-transfer step.',
    },
    {
      name: 'Where should I run the upload command?',
      text: 'Run scp or vmup on the laptop that holds the screenshot, outside the remote SSH shell.',
    },
    {
      name: 'What do I paste after the upload?',
      text: 'Paste the remote path or a prompt containing it, such as Inspect /tmp/bug.png.',
    },
    {
      name: 'Can I send several screenshots in one batch?',
      text: 'Yes. vmup --clip collects clipboard images, uploads them into one remote folder, and copies a prompt with that folder path.',
    },
  ],
  '/learn/scp-multiple-files': [
    {
      name: 'Can scp copy multiple files at once?',
      text: 'Yes. Put each source before one remote destination directory: scp file1 file2 user@server:/destination/.',
    },
    {
      name: 'How do I scp all PNG files in one folder?',
      text: 'Run scp ~/Desktop/*.png user@server:/destination/ on the laptop. The local shell selects the matching files.',
    },
    {
      name: 'Where should I run the scp command?',
      text: 'Run it on the machine that holds the source files. If they are on your laptop, use a laptop terminal outside the remote SSH session.',
    },
    {
      name: 'What if the remote destination directory does not exist?',
      text: 'Run mkdir -p /destination on the remote host, then run scp from the machine holding the files.',
    },
  ],
  '/learn/claude-code-paste-image-ssh': [
    {
      name: 'Can I paste a screenshot into Claude Code over SSH?',
      text: 'Do not depend on direct clipboard paste over SSH. Copy the image onto the remote host and give Claude Code the remote path.',
    },
    {
      name: 'Does SSH forward the clipboard for images?',
      text: 'Plain SSH does not upload a clipboard image as a file. Some terminals and helpers implement separate clipboard protocols, but support varies by terminal and Claude Code version.',
    },
    {
      name: 'What is the fastest manual method for one screenshot?',
      text: 'Run scp bug.png user@server:/tmp/bug.png, then tell Claude Code to inspect /tmp/bug.png.',
    },
    {
      name: 'Can I drag an image into Claude Code over Remote-SSH?',
      text: 'Drag the image into the remote Explorer first, then reference the uploaded remote path from Claude Code.',
    },
    {
      name: 'Does tmux make image paste less reliable?',
      text: 'It adds another terminal and clipboard boundary. A remote file path is independent of tmux clipboard handling.',
    },
  ],
  '/learn/codex-cli-image-ssh': [
    {
      name: 'How do I attach an image to Codex CLI over SSH?',
      text: 'Upload the image to the remote host, then run codex --image /remote/path/image.png on that host.',
    },
    {
      name: 'Does codex --image accept more than one image?',
      text: 'Yes. Repeat --image or use the comma-separated form documented by the Codex CLI reference.',
    },
    {
      name: 'Can remote Codex read a local macOS or Windows path?',
      text: 'No. The remote process needs a path on the remote filesystem.',
    },
    {
      name: 'Why not paste the screenshot directly?',
      text: 'Clipboard-image paste varies by terminal and platform. An explicit remote path through --image is observable and documented.',
    },
    {
      name: 'Should I use scp or vmup?',
      text: 'Use scp for a small manual transfer. Use vmup when you want one temporary folder for several files and one prompt to paste.',
    },
  ],
  '/learn/send-files-to-remote-coding-agent': [
    {
      name: 'Why can’t a remote coding agent see files on my laptop?',
      text: 'The agent process reads files on its own host. A laptop path points to a different filesystem.',
    },
    {
      name: 'Is scp enough to send files to a remote coding agent?',
      text: 'Yes. It is the clearest manual solution for named files; you must then give the agent each resulting remote path.',
    },
    {
      name: 'Can I send PDFs and recordings as well as screenshots?',
      text: 'Yes, if the agent supports reading those formats. The transfer boundary is the same for every file type.',
    },
    {
      name: 'Should I use rsync for agent inputs?',
      text: 'Use rsync for a directory tree that must stay synchronized. Use scp or a disposable batch for one request.',
    },
  ],
  '/learn/cursor-remote-ssh-local-files': [
    {
      name: 'Why can’t Cursor analyze a local file over Remote-SSH?',
      text: 'The agent runs against the remote workspace. A local Windows or macOS path is not a file path on that server.',
    },
    {
      name: 'Do any attachments work over Cursor Remote-SSH?',
      text: 'Some supported formats are uploaded by content. If the attachment remains a local path, copy it into the remote workspace before asking the agent to read it.',
    },
    {
      name: 'How do I give Cursor a screenshot on a remote VM?',
      text: 'Upload the PNG with scp, drag it into the remote Explorer, or send a batch, then reference the remote file.',
    },
    {
      name: 'What should I check before using @Files?',
      text: 'Confirm the file appears in the remote Explorer or can be listed from the remote integrated terminal.',
    },
  ],
  '/learn/claude-code-ssh-screenshot-tools': [
    {
      name: 'What is the simplest way to give Claude Code a screenshot over SSH?',
      text: 'Save the PNG, copy it with scp, and paste the remote path into Claude Code.',
    },
    {
      name: 'Which tools avoid a remote clipboard daemon?',
      text: 'scp, clipssh, PasteHop, imgssh, Paste2SSH, Claude Screenshot Uploader and vmup upload files without requiring a persistent remote clipboard daemon. Some run a local background app or watcher.',
    },
    {
      name: 'Which options handle files beyond screenshots?',
      text: 'scp, PasteHop, Paste2SSH and vmup accept explicit files. Confirm each tool’s current type restrictions before depending on it.',
    },
    {
      name: 'Does vmup watch upload each screenshot automatically?',
      text: 'No. It stages new files in the watched folder, then uploads them together when you press Enter.',
    },
    {
      name: 'When should I use a clipboard shim?',
      text: 'Use one when preserving the paste gesture matters more than minimizing remote setup and background processes.',
    },
    {
      name: 'When should I use a batch folder?',
      text: 'Use a batch when several screenshots, documents or recordings belong to one agent request and one directory prompt is easier than listing every path.',
    },
  ],
  '/learn/claude-code-no-image-found-clipboard-ssh': [
    {
      name: 'What does “No image found in clipboard” mean in Claude Code over SSH?',
      text: 'Claude Code did not receive usable image data from the clipboard available to the remote process. The screenshot may still exist only on the laptop.',
    },
    {
      name: 'Is this the same as Ctrl+V doing nothing?',
      text: 'The underlying boundary may be the same, but the visible behavior depends on the terminal and Claude Code version. Some sessions print the error; others receive no image paste event.',
    },
    {
      name: 'Does this error also happen locally?',
      text: 'Yes. A local clipboard can contain text, a file reference, or an image format Claude Code does not accept.',
    },
    {
      name: 'How do I fix it without a clipboard daemon?',
      text: 'Save the image, upload it with scp, and put the remote path in the prompt.',
    },
  ],
};

export const learnHowTos: Record<string, HowTo> = {
  '/learn/vmup-remote-agent-files': {
    name: 'Send screenshots and files to a remote coding agent with vmup',
    steps: [
      {
        name: 'Install and configure vmup',
        text: 'Install the CLI, run vmup init, and confirm the configured SSH target with vmup check.',
        hash: 'install-and-configure-vmup',
      },
      {
        name: 'Send a screenshot or mixed file batch',
        text: 'Pass local paths to vmup or use clipboard mode to collect screenshots before upload.',
        hash: 'send-a-screenshot-or-mixed-file-batch',
      },
      {
        name: 'Paste one remote folder prompt',
        text: 'Paste the generated prompt into the remote coding agent so it can inspect the uploaded folder.',
        hash: 'paste-one-remote-folder-prompt',
      },
    ],
  },
  '/learn/paste-screenshots-remote-terminal': {
    name: 'Paste screenshots into a remote terminal over SSH',
    steps: [
      {
        name: 'Save the screenshot on your laptop',
        text: 'Save the screenshot as a local PNG and confirm that it opens before transfer.',
        hash: 'save-the-screenshot-on-your-laptop',
      },
      {
        name: 'Upload the screenshot over SSH',
        text: 'Run scp on the laptop to copy the PNG to a path on the remote host, then verify the file.',
        hash: 'upload-the-screenshot-over-ssh',
      },
      {
        name: 'Paste the remote path into the terminal',
        text: 'Paste the server-side image path into the remote agent prompt or use it as a shell argument.',
        hash: 'paste-the-remote-path-into-the-terminal',
      },
    ],
  },
  '/learn/scp-multiple-files': {
    name: 'Copy multiple files with scp',
    steps: [
      {
        name: 'How to scp multiple files in one command',
        text: 'Create the remote destination and copy selected local files in one scp command.',
        hash: 'how-to-scp-multiple-files-in-one-command',
      },
      {
        name: 'Check the files on the remote host',
        text: 'List the destination on the server to confirm each uploaded file is present.',
        hash: 'check-the-files-on-the-remote-host',
      },
    ],
  },
  '/learn/claude-code-paste-image-ssh': {
    name: 'Paste an image into Claude Code over SSH',
    steps: [
      {
        name: 'Upload one image with scp',
        text: 'Copy the saved screenshot from the laptop to a path on the remote host.',
        hash: 'upload-one-image-with-scp',
      },
      {
        name: 'Give Claude Code the remote path',
        text: 'Tell Claude Code to inspect the path that now exists on the server.',
        hash: 'give-claude-code-the-remote-path',
      },
      {
        name: 'Stop repeating scp for every screenshot',
        text: 'Use a clipboard loop or batch folder when several files belong to one request.',
        hash: 'stop-repeating-scp-for-every-screenshot',
      },
    ],
  },
  '/learn/codex-cli-image-ssh': {
    name: 'Attach an image to Codex CLI over SSH',
    steps: [
      {
        name: 'Upload the image with scp',
        text: 'Copy the image from the laptop to a path on the remote host.',
        hash: 'upload-the-image-with-scp',
      },
      {
        name: 'Attach the remote file with codex --image',
        text: 'Start Codex on the remote host and pass the uploaded path through --image.',
        hash: 'attach-the-remote-file-with-codex---image',
      },
      {
        name: 'Send multiple images as one batch',
        text: 'Repeat --image for selected files or upload one temporary folder for the request.',
        hash: 'send-multiple-images-as-one-batch',
      },
    ],
  },
  '/learn/send-files-to-remote-coding-agent': {
    name: 'Send files to a remote coding agent over SSH',
    steps: [
      {
        name: 'Send the files manually with scp',
        text: 'Copy the selected laptop files into a directory on the remote host.',
        hash: 'send-the-files-manually-with-scp',
      },
      {
        name: 'Send one folder prompt instead',
        text: 'Create one temporary remote batch and give the agent its directory path.',
        hash: 'send-one-folder-prompt-instead',
      },
    ],
  },
};
