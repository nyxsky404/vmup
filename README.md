# vmup

*Batch files to a remote host over SSH for coding agents*

**Docs:** [https://vmup.dev/docs](https://vmup.dev/docs)

[![npm version](https://img.shields.io/npm/v/@nyxsky404/vmup?style=flat-square)](https://www.npmjs.com/package/@nyxsky404/vmup)
[![CI](https://github.com/nyxsky404/vmup/actions/workflows/ci.yml/badge.svg)](https://github.com/nyxsky404/vmup/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-3c873a?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](https://github.com/nyxsky404/vmup/blob/main/LICENSE)

[Docs](https://vmup.dev/docs) • [Overview](#overview) • [Getting started](#getting-started) • [Quickstart](#quickstart) • [Usage](#usage) • [Commands](#commands) • [Config](#config) • [Troubleshooting](#troubleshooting)

The npm package is [`@nyxsky404/vmup`](https://www.npmjs.com/package/@nyxsky404/vmup). The command is `vmup`. Full documentation is on the [docs site](https://vmup.dev/docs).

A coding agent on a VM reads files by path. Screenshots, PDFs, and recordings sit on your laptop. vmup copies them over SSH into one remote folder, prints a prompt, and puts that folder path on your clipboard. Paste it into the agent thread.

```text
Uploaded 3 files → default
Agent folder: ~/vmup/agents-20260911-140128-a1b2c3d4/

Prompt:
Please inspect all files in ~/vmup/agents-20260911-140128-a1b2c3d4/
```

> **Important:** You need **Node.js 18+** and **OpenSSH** (`ssh` and `scp` on your `PATH`). Native Windows is not supported; use [WSL](https://learn.microsoft.com/windows/wsl/).

## Overview

vmup is a small CLI for one job: collect files on your machine, stage a unique batch, upload it over SSH, and hand back **one folder path**.

```text
collect → validate → stage → upload → print path + prompt → TTL cleanup
```

| Piece | Default |
| --- | --- |
| Config | `~/.config/vmup/config.toml` |
| Local staging | `~/.cache/vmup/` |
| Remote root | `~/vmup` |
| Batch folder | `agents-<YYYYMMDD>-<HHMMSS>-<uuid>` |
| Staged names | `image-01.png`, `video-01.mov`, `file-01.pdf` |
| TTL | 5 minutes |
| Per-file size | 200 MB |
| Files per batch | 200 |
| File types | All (set `accept_all_files = false` for images only) |

Transport is your system OpenSSH. Files land in a `.partial` directory, then rename into place so the agent never sees a half-written folder.

## Features

- **Four collect modes** — file args, native picker, clipboard loop, foreground folder watch
- **One agent folder** — stable `image-NN` / `video-NN` / `file-NN` names inside `agents-…/`
- **Profiles and aliases** — saved hosts in config, or `--ssh-host` for a one-shot `~/.ssh/config` alias
- **Clipboard-ready output** — remote path copied; printed prompt ready to paste
- **JSON for scripts** — `--json` on stdout; spinner stays on stderr
- **TTL cleanup** — remote sweeper every minute, plus a client-side fallback delete

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 18 or newer
- OpenSSH client (`ssh`, `scp`)
- A remote host you can reach with a key, or an alias in `~/.ssh/config`

Confirm both before installing:

```bash
node -v
ssh -V
which scp
```

### Install

```bash
npm i -g @nyxsky404/vmup
```

Also:

```bash
pnpm add -g @nyxsky404/vmup
yarn global add @nyxsky404/vmup
bun install -g @nyxsky404/vmup
```

One-shot, no global binary:

```bash
npx @nyxsky404/vmup init
```

Same pattern with `pnpm dlx`, `yarn dlx`, or `bunx`.

curl installer (still needs Node 18+). It picks npm, then pnpm, yarn, or bun. Override with `VMUP_PM`:

```bash
curl -fsSL https://raw.githubusercontent.com/nyxsky404/vmup/main/scripts/install.sh | sh
```

```bash
VMUP_PM=pnpm curl -fsSL https://raw.githubusercontent.com/nyxsky404/vmup/main/scripts/install.sh | sh
```

Then:

```bash
vmup --version
```

> **Tip:** Newer releases print a two-line notice at most once per day while you stay on an older version. The command does not wait on npm. Disable with `VMUP_NO_UPDATE_CHECK=1`. CI (`CI=true` or `CI=1`), `--json`, non-TTY output, and `-V` skip it.

## Quickstart

```bash
vmup init
vmup check
vmup ./shot.png
```

`vmup init` writes `~/.config/vmup/config.toml`. Press Enter to keep a value in `[brackets]`. First run asks for profile name, host, SSH user (`ubuntu`), key (`~/.ssh/id_ed25519`), port (`22`), remote dir (`~/vmup`), TTL minutes (`5`), watch folder, whether to accept all file types, and whether to install the remote sweeper.

`vmup check` tests SSH without the wizard:

```text
SSH OK  default  ubuntu@192.168.1.10
Remote dir: ~/vmup
Sweeper: installed
```

After a successful upload, paste the printed prompt into the agent. The clipboard already holds the folder path.

> **Tip:** Non-interactive setup: `VMUP_HOST=… vmup init -y`. Add `VMUP_USER` / `VMUP_KEY` as needed. `--no-sweeper` skips remote cron.

If the VM is off during init, config is still saved. You will see `SSH setup incomplete`. Retry with `vmup check`, then `vmup check --sweeper` if cleanup never landed.

## Usage

Every collect mode ends the same way: one remote folder, a printed prompt, the path on your clipboard (human mode).

### File arguments

```bash
vmup shot.png notes.pdf
vmup ~/Downloads
```

A directory sends **immediate children** only. Hidden names, `.DS_Store`, `Thumbs.db`, and `desktop.ini` are skipped. Nested trees need the inner folder or the files themselves.

### Native picker

```bash
vmup
```

No arguments and no `--clip` / `--watch` opens a GUI picker.

| Platform | Picker |
| --- | --- |
| macOS | Multi-select (`choose file`) |
| Linux | `zenity` (multi) or `kdialog` (single) |
| Windows | Not supported. Pass paths, or use WSL. |

### Clipboard loop

```bash
vmup --clip
```

Copy a file or an image, press **Enter** to capture, repeat, then type `done` / `stop` / `q`, or Ctrl+D. Ctrl+C cancels (exit 130). Duplicate clipboard bytes are skipped while `clip_dedup` is true (default).

> **Note:** `--clip` reads the **OS clipboard**, not terminal paste. On macOS, a copied Finder file needs no extra tools; a bitmap (screenshot) needs [pngpaste](https://github.com/jcsalterego/pngpaste) (`brew install pngpaste`). Linux uses `wl-paste` or `xclip`.

### Watch a folder

```bash
vmup watch
vmup watch --dir ~/Desktop
```

Foreground only. Files already in the folder at start are ignored. Files added or copied after start are staged (Finder copies included). Press Enter or type `stop` to upload. Ctrl+C cancels.

Default folder: `~/Desktop` on macOS, `~/Pictures/Screenshots` on Linux. Only the folder itself is watched, not subfolders.

Do not combine `--clip` and `--watch`.

### Target a host

```bash
vmup -p work shot.png
vmup --ssh-host lab shot.png
```

Do not pass `--profile` and `--ssh-host` together.

`--video` and `--force` only change type filtering when `accept_all_files` is false. `--force` never skips SSH checks or size/count limits.

```bash
vmup shot.png --ttl 15 --keep-local
vmup shot.png --json
```

## Commands

| Command | Purpose |
| --- | --- |
| `vmup [files…]` | Upload (picker if no files) |
| `vmup init` | Create or update config; optional remote sweeper |
| `vmup check` | Test SSH (no wizard). `--sweeper` installs/refreshes cleanup |
| `vmup profiles` | List saved profiles |
| `vmup watch` | Same as `vmup --watch` |
| `vmup prune` | Delete expired remote batches |

`vmup init -y` requires `VMUP_HOST`. Re-running `vmup init` interactively adds a profile or overwrites an existing one (current values shown in brackets).

## Profiles

Saved remotes live under `[profiles.<name>]`. The default profile is used when you pass neither `-p` nor `--ssh-host`.

**Direct** (host + user + key + port):

```toml
[profiles.work]
host = "192.168.1.10"
user = "ubuntu"
key = "~/.ssh/id_ed25519"
port = 22
remote_dir = "~/vmup"
ttl_minutes = 5
```

vmup passes `-i`, `-p`, `BatchMode=yes`, and `StrictHostKeyChecking=accept-new`.

**SSH config alias** (`ssh_host`):

```toml
[profiles.lab]
ssh_host = "lab"
remote_dir = "~/vmup"
ttl_minutes = 5
```

vmup runs `ssh lab …`. User, key, and port come from `~/.ssh/config`.

`--ssh-host lab` is the one-shot version (printed profile name `ssh:lab`). A profile with `ssh_host` set uses alias mode even if `host` is also present.

## Config

Path: `~/.config/vmup/config.toml`

Overrides: `VMUP_CONFIG_DIR` (directory) → `$XDG_CONFIG_HOME/vmup` → `~/.config/vmup`.

**Precedence:** flag → env (`VMUP_*`) → profile → top-level file → built-in default.

```toml
default_profile = "default"
prompt_template = "Please inspect all files in {{remote_path}}"
remote_dir = "~/vmup"
ttl_minutes = 5
watch_dir = "/Users/you/Desktop"
watch_include_video = false
accept_all_files = true
max_file_mb = 200
clip_dedup = true

[profiles.default]
host = "192.168.1.10"
user = "ubuntu"
key = "~/.ssh/id_ed25519"
port = 22
remote_dir = "~/vmup"
ttl_minutes = 5
```

`{{remote_path}}` is replaced with the remote folder (trailing `/` added if missing). After you change `ttl_minutes`, run `vmup check --sweeper` so the remote script matches. Editing the file alone does not rewrite `~/vmup/.cleanup.sh`.

Selected environment variables:

| Variable | Role |
| --- | --- |
| `VMUP_HOST` / `VMUP_USER` / `VMUP_KEY` / `VMUP_PORT` | Direct-mode target. `VMUP_HOST` required for `init -y` |
| `VMUP_PROFILE` / `VMUP_SSH_HOST` | Profile name, or one-shot OpenSSH alias |
| `VMUP_REMOTE_DIR` / `VMUP_TTL_MINUTES` | Remote root and TTL |
| `VMUP_ACCEPT_ALL` | `0` images-only, `1` all types |
| `VMUP_MAX_FILE_MB` | Per-file size cap |
| `VMUP_NO_UPDATE_CHECK` | `1` skips the npm notice |
| `NO_COLOR` | Any value: no ANSI |

Empty string is treated as unset. `SSH_AUTH_SOCK` allows a missing `key` in direct mode.

## Cleanup

Remote batches expire after **TTL minutes** (default 5). `vmup init` installs `~/vmup/.cleanup.sh` and a crontab line that runs every minute. The script removes `agents-*` and `agents-*.partial` directories older than TTL. It does not wipe the remote root.

```bash
vmup prune
vmup prune --id agents-20260911-140128-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
vmup prune --local
vmup prune --install-sweeper
```

`--local` also deletes staging under `~/.cache/vmup/` older than 24 hours. Successful uploads already delete that cache unless you pass `--keep-local`. Failed SSH or scp **keeps** local staging.

> **Warning:** The client-side delete is a detached `sleep` then `ssh rm`. It dies if this machine sleeps or exits. If `~/vmup/.cleanup.sh` is missing, batches may linger. Reinstall with `vmup check --sweeper`.

## JSON and exit codes

```bash
vmup shot.png --json
vmup check --json
```

JSON goes to **stdout**. Spinner, skip warnings, and human text stay on **stderr**. `--json` does not copy the path to the clipboard.

```json
{
  "ok": true,
  "batchId": "agents-20260911-140128-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "profile": "default",
  "remotePath": "~/vmup/agents-20260911-140128-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/",
  "prompt": "Please inspect all files in ~/vmup/agents-20260911-140128-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/",
  "count": 2,
  "files": ["image-01.png", "file-01.pdf"],
  "sweeper": true
}
```

`vmup prune --json` does not emit this schema. The flag only hides the update notice.

| Code | Meaning |
| --- | --- |
| `0` | Success. `init` also returns 0 when config was written even if SSH failed. |
| `1` | Bad flags or unusable target |
| `2` | Nothing to upload |
| `3` | SSH / preflight / sweeper install / prune |
| `4` | Upload failed (staging kept) |
| `130` | Cancelled during collect (staging deleted) |

## Troubleshooting

| You see | What to do |
| --- | --- |
| `Profile "default" has no host` | Run `vmup init`, or set `VMUP_HOST` |
| `SSH key not found` | Fix `key` in config or `VMUP_KEY` |
| `permissions are too open` | `chmod 600` on the private key |
| `Permission denied (publickey)` | User, key, or `authorized_keys` mismatch |
| `Connection refused` / timed out | Port, firewall, VPN, VM power |
| `Could not resolve hostname` | DNS, or the `Host` name in `~/.ssh/config` |
| `No files to upload` (exit 2) | Path missing, picker cancelled, or watch/clip with zero captures |
| `SSH preflight failed` + `Local staging kept` | Fix the host, then retry. Staging stays under `~/.cache/vmup/` |
| `Use either --profile or --ssh-host` | Pick one |
| Sweeper missing | `vmup check --sweeper` |
| Clipboard image ignored (macOS) | `brew install pngpaste` |
| No GUI picker (Linux) | Install `zenity`/`kdialog`, or pass file paths |

`vmup check` is the retry path that skips the wizard. Preflight timeout is 20 seconds. scp timeout is 10 minutes per file. `--force` never skips connectivity checks.

A working `ssh lab` and a failing `vmup -p lab` usually means the profile is in **direct** mode (`ubuntu@host`) while you expected the alias. `vmup profiles` prints `ssh_host=lab` for alias mode.

## Development

Docs: [https://vmup.dev/docs](https://vmup.dev/docs). Source and issues: [github.com/nyxsky404/vmup](https://github.com/nyxsky404/vmup). How to send a change: [CONTRIBUTING.md](CONTRIBUTING.md). Clone, then `npm install && npm run build && npm test`.
