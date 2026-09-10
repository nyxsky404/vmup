# vmup

Batch screenshots and media to a remote host over SSH, then give coding agents **one folder path**.

## Install (local)

```bash
npm install
npm run build
npm link   # optional — puts `vmup` on your PATH
```

Or run without linking:

```bash
node dist/cli.js --help
```

## Quickstart

```bash
vmup init
vmup shot1.png shot2.png
vmup              # native file picker
vmup --clip       # clipboard capture loop
vmup watch        # watch your screenshots folder
```

Success output:

```text
Uploaded 2 files → default
Agent folder: ~/vmup/agents-…/

Prompt:
Please inspect all images in ~/vmup/agents-…/
```

The folder path is copied to your clipboard. Use `--json` for scripts.

## Config

Stored at `~/.config/vmup/config.toml`.

Precedence: **flags → env → config file**.

Useful env vars: `VMUP_HOST`, `VMUP_USER`, `VMUP_KEY`, `VMUP_PROFILE`, `VMUP_SSH_HOST`, `VMUP_REMOTE_DIR`, `VMUP_TTL_HOURS`.

### Profiles vs `--ssh-host`

- **Profiles** — saved remotes from `vmup init` (`vmup -p work`)
- **`--ssh-host lab`** — one-shot OpenSSH config alias; uses default `~/vmup` + TTL
- A profile may set `ssh_host = "lab"` instead of host/user/key
- Do not pass `--profile` and `--ssh-host` together

## Watch mode

```bash
vmup watch
vmup watch --dir ~/Desktop --video
```

- Holds the terminal (not a background daemon)
- Only files **created after** the command starts
- Press Enter or type `stop` to upload; Ctrl+C cancels

## Cleanup

- Local staging: `~/.cache/vmup/` (deleted after successful upload)
- Remote batches: `~/vmup/agents-…/` expire after TTL (default 5 hours)
- `vmup init` can install a remote sweeper (every 10 minutes)
- Client also schedules a best-effort delayed delete
- `vmup prune` / `vmup prune --local` / `vmup prune --id <batch>`

## License

MIT
