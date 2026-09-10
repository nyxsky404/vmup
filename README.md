# vmup

Batch files to a remote host over SSH, then give coding agents **one folder path**.

## Install

```bash
npm i -g @nyxsky404/vmup
vmup init
```

Or without a global install:

```bash
npx @nyxsky404/vmup init
npx @nyxsky404/vmup shot.png notes.pdf
```

Requires **Node 18+** and **OpenSSH** (`ssh` / `scp` on your PATH).

On macOS, clipboard **images** also need [pngpaste](https://github.com/jcsalterego/pngpaste):

```bash
brew install pngpaste
```

Copied **files** (Finder) work without pngpaste.

## Quickstart

```bash
vmup init
vmup check              # retry SSH without re-asking questions
vmup shot.png notes.pdf
vmup                    # native file picker
vmup --clip             # clipboard capture loop
vmup watch              # watch a folder
vmup --watch            # same as vmup watch
```

Success output prints the agent folder path (copied to your clipboard) and a prompt snippet. Use `--json` for scripts.

## Config

Stored at `~/.config/vmup/config.toml`.

Precedence: **flags → env → config file**.

| Key | Default | Init? |
|---|---|---|
| `accept_all_files` | `true` | Yes |
| `max_file_mb` | `200` | No — edit config |
| `clip_dedup` | `true` | No |

Useful env vars: `VMUP_HOST`, `VMUP_USER`, `VMUP_KEY`, `VMUP_PROFILE`, `VMUP_SSH_HOST`, `VMUP_REMOTE_DIR`, `VMUP_TTL_HOURS`, `VMUP_MAX_FILE_MB`, `VMUP_ACCEPT_ALL`, `VMUP_CLIP_DEDUP`.

Set `accept_all_files = false` for images-only (then `--video` to include recordings).

### Profiles vs `--ssh-host`

- **Profiles** — saved remotes from `vmup init` (`vmup -p work`)
- **`--ssh-host lab`** — one-shot OpenSSH config alias
- Do not pass `--profile` and `--ssh-host` together

## Watch mode

```bash
vmup watch
vmup --watch --dir ~/Desktop
```

- Holds the terminal (not a background daemon)
- Only files **created after** the command starts
- Press Enter or type `stop` to upload; Ctrl+C cancels

## Clipboard (`--clip`)

- Enter captures the current OS clipboard (file or image)
- Type `done` / `stop` or Ctrl+D to upload
- Ctrl+C cancels
- The same clipboard bytes are not captured twice unless you set `clip_dedup = false`

## Cleanup

- Local staging: `~/.cache/vmup/` (deleted after successful upload)
- Remote batches expire after TTL (default 5 hours)
- `vmup check --sweeper` reinstalls remote cleanup if it was deleted
- `vmup prune` / `vmup prune --local` / `vmup prune --id <batch>`

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

`--force` never skips connectivity checks. `NO_COLOR=1` disables colors.

If a newer npm version exists, vmup prints a short notice (at most once per day):

```text
vmup 0.3.0 is available (you have 0.2.1)
  Update:  npm i -g @nyxsky404/vmup
```

Disable with `VMUP_NO_UPDATE_CHECK=1`.

## Name note

The npm package is **`@nyxsky404/vmup`**. The command you run is still **`vmup`**.

## License

MIT
