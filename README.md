# vmup

Batch files to a remote host over SSH, then give coding agents **one folder path**.

The npm package is **`@nyxsky404/vmup`**. The command you run is **`vmup`**.

## Install

Requires **Node 18+** and **OpenSSH** (`ssh` / `scp` on your PATH).

```bash
npm i -g @nyxsky404/vmup
pnpm add -g @nyxsky404/vmup
yarn global add @nyxsky404/vmup
bun install -g @nyxsky404/vmup
```

One-shot (no global install):

```bash
npx @nyxsky404/vmup init
pnpm dlx @nyxsky404/vmup init
yarn dlx @nyxsky404/vmup init
bunx @nyxsky404/vmup init
```

curl (needs Node; picks npm, then pnpm / yarn / bun; override with `VMUP_PM=pnpm`):

```bash
curl -fsSL https://raw.githubusercontent.com/nyxsky404/vmup/main/scripts/install.sh | sh
```

Then:

```bash
vmup init
```

On macOS, clipboard **images** also need [pngpaste](https://github.com/jcsalterego/pngpaste):

```bash
brew install pngpaste
```

Copied **files** (Finder) work without pngpaste.

## Quickstart

```bash
vmup init
vmup check              # retry SSH without the wizard
vmup shot.png notes.pdf
vmup                    # native file picker
vmup --clip             # clipboard capture loop
vmup watch              # watch a folder
vmup --watch            # same as vmup watch
vmup profiles
```

Success output prints the agent folder path (copied to your clipboard) and a prompt snippet (`Please inspect all files in …`). Use `--json` for scripts (spinner still on stderr when the terminal is a TTY).

Uploads show a spinner with transferred size:

```text
⠋ Uploading 3 files  1.2 MB / 4.5 MB  4s
```

## Commands

| Command | Purpose |
|---|---|
| `vmup init` | Create or update config and profiles |
| `vmup check` | Test SSH using saved config |
| `vmup check --sweeper` | Reinstall remote cleanup (`~/vmup/.cleanup.sh`, cron every minute) |
| `vmup profiles` | List saved profiles |
| `vmup [files…]` | Upload files or directories |
| `vmup` | Native file picker |
| `vmup --clip` | Clipboard capture loop |
| `vmup watch` / `vmup --watch` | Watch a folder, then upload |
| `vmup prune` | Delete expired remote batches |
| `vmup prune --local` | Also delete leftover local staging |
| `vmup prune --id <batch>` | Delete one remote batch |

Useful flags (upload / watch / prune):

| Flag | Meaning |
|---|---|
| `-p, --profile <name>` | Saved profile |
| `--ssh-host <alias>` | One-shot `~/.ssh/config` alias (not with `-p`) |
| `--ttl <minutes>` | Override TTL (default 5) |
| `--keep-local` | Keep `~/.cache/vmup/<batch>/` after a successful upload |
| `--dir <path>` | Folder to watch |
| `--video` | Include videos when `accept_all_files = false` |
| `--force` | Allow extra types in images-only mode |
| `--json` | JSON on stdout |

`--video` and `--force` do nothing for type filtering when `accept_all_files` is true (the default). `--force` never skips SSH checks.

## Init and profiles

First run of `vmup init` writes `~/.config/vmup/config.toml` and one profile (usually `default`).

Re-run `vmup init` when a profile already exists:

1. **New** or **overwrite**
2. New name that already exists → confirm overwrite or pick another name
3. Overwrite shows **current** host / user / key / port / remote dir / TTL; Enter keeps them
4. A new profile asks whether to make it the default (default No)

```bash
vmup -p work shot.png
vmup check -p work
VMUP_PROFILE=work vmup shot.png
```

Do not pass `--profile` and `--ssh-host` together.

```toml
default_profile = "default"

[profiles.default]
host = "192.168.1.10"
user = "ubuntu"
key = "~/.ssh/id_ed25519"
port = 22
remote_dir = "~/vmup"
ttl_minutes = 5

[profiles.lab]
ssh_host = "lab"
remote_dir = "~/vmup"
ttl_minutes = 5
```

## Config

Stored at `~/.config/vmup/config.toml`.

Precedence: **flags → env → config file**.

| Key | Default | Init? |
|---|---|---|
| `accept_all_files` | `true` | Yes (first-time init) |
| `max_file_mb` | `200` | No — edit config |
| `clip_dedup` | `true` | No |
| `ttl_minutes` | `5` | Yes |

Useful env vars: `VMUP_HOST`, `VMUP_USER`, `VMUP_KEY`, `VMUP_PROFILE`, `VMUP_SSH_HOST`, `VMUP_REMOTE_DIR`, `VMUP_TTL_MINUTES`, `VMUP_MAX_FILE_MB`, `VMUP_ACCEPT_ALL`, `VMUP_CLIP_DEDUP`.

Old `ttl_hours` is still read (hours × 60) if `ttl_minutes` is missing. After you change TTL, run `vmup check --sweeper` so the remote script matches.

Set `accept_all_files = false` for images-only (then `--video` for recordings, `--force` for other types).

## Watch mode

```bash
vmup watch
vmup --watch --dir ~/Desktop
```

- Holds the terminal (not a background daemon)
- Only files **added or copied after** the command starts
- Files already in the folder are ignored; upload them with `vmup ~/Downloads` instead
- Finder duplicates in the same folder are captured; paste-overwrite of an existing name is also captured
- Press Enter or type `stop` to upload; Ctrl+C cancels

## Clipboard (`--clip`)

- Enter captures the current OS clipboard (file or image)
- Type `done` / `stop` or Ctrl+D to upload
- Ctrl+C cancels
- The same clipboard bytes are not captured twice unless you set `clip_dedup = false`

## Cleanup

- Local staging: `~/.cache/vmup/` (deleted after successful upload unless `--keep-local`)
- Remote batches expire after TTL (default **5 minutes**)
- Sweeper script on the VM: `~/vmup/.cleanup.sh` (cron every minute)
- `vmup check --sweeper` reinstalls it if it was deleted
- `vmup prune` / `vmup prune --local` / `vmup prune --id <batch>`

`--keep-local` still uploads to the VM. The leftover copy is:

```text
~/.cache/vmup/agents-<date>-<time>-<uuid>/
```

## SSH troubleshooting

If init saved config but SSH failed (VM was off):

```bash
vmup check
vmup check --sweeper
```

| Symptom | What to try |
|---|---|
| `SSH key not found` | Path in config/`VMUP_KEY` is wrong |
| `permissions are too open` | `chmod 600 /path/to/key` |
| `Permission denied (publickey)` | Wrong user, key, or `authorized_keys` |
| `Connection refused` / timed out | VM off, wrong port, firewall / NSG |
| `Profile "default" has no host` | Run `vmup init`, or set `VMUP_HOST` |
| `--clip` images fail on macOS | `brew install pngpaste` |
| `Sweeper: missing` | `vmup check --sweeper` |

`--force` never skips connectivity checks. `NO_COLOR=1` disables colors.

If a newer npm version exists, vmup prints a short notice (at most once per day). The update line matches how you installed (npm, pnpm, yarn, bun, or npx):

```text
vmup 0.3.0 is available (you have 0.2.1)
  Update:  npm i -g @nyxsky404/vmup
```

Disable with `VMUP_NO_UPDATE_CHECK=1`.

## License

MIT
