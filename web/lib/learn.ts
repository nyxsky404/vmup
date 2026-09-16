export const learnPublishedAt = '2026-09-12T00:00:00.000Z';

export const learnHub = {
  title: 'Guides for remote coding agents',
  description:
    'How to get screenshots, PDFs, and other laptop files onto the VM where Claude Code, Cursor, or Codex runs. Paste fails over SSH; a remote path does not.',
};

export const learnArticleUrls = [
  '/learn/claude-code-paste-image-ssh',
  '/learn/codex-cli-image-ssh',
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
  '/learn/codex-cli-image-ssh': { date: '2026-09-16', tag: 'codex' },
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

const learnRelatedUrls: Record<
  LearnArticleUrl,
  readonly LearnArticleUrl[]
> = {
  '/learn/claude-code-paste-image-ssh': [
    '/learn/claude-code-no-image-found-clipboard-ssh',
    '/learn/claude-code-ssh-screenshot-tools',
  ],
  '/learn/codex-cli-image-ssh': [
    '/learn/send-files-to-remote-coding-agent',
    '/learn/claude-code-paste-image-ssh',
  ],
  '/learn/send-files-to-remote-coding-agent': [
    '/learn/cursor-remote-ssh-local-files',
    '/learn/codex-cli-image-ssh',
  ],
  '/learn/cursor-remote-ssh-local-files': [
    '/learn/send-files-to-remote-coding-agent',
    '/learn/claude-code-paste-image-ssh',
  ],
  '/learn/claude-code-ssh-screenshot-tools': [
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
      text: 'scp, clipssh, PasteHop, imgssh and vmup upload files without requiring a persistent remote clipboard daemon.',
    },
    {
      name: 'Which options handle files beyond screenshots?',
      text: 'scp, PasteHop and vmup accept explicit files. Confirm each tool’s current type restrictions before depending on it.',
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
