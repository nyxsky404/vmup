# vmup

Batch screenshots and media to a remote host over SSH, then give coding agents **one folder path**.

## Install

```bash
npm i -g @nyxsky404/vmup
vmup init
```

Or without a global install:

```bash
npx @nyxsky404/vmup init
npx @nyxsky404/vmup shot.png
```

Requires **Node 18+** and **OpenSSH** (`ssh` / `scp` on your PATH).

On macOS, clipboard mode also needs [pngpaste](https://github.com/jcsalterego/pngpaste):

```bash
brew install pngpaste
```

## Quickstart

```bash
vmup init
vmup shot1.png shot2.png
vmup              # native file picker
vmup --clip       # clipboard capture loop (OS clipboard, not terminal paste)
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
- Client also schedules a best-effort delayed delete (misses if this machine sleeps)
- `vmup prune` / `vmup prune --local` / `vmup prune --id <batch>`

## SSH troubleshooting

| Symptom | What to try |
|---|---|
| `SSH key not found` | Path in config/`VMUP_KEY` is wrong. Use an absolute path or `~/…`. |
| `permissions are too open` / `UNPROTECTED PRIVATE KEY FILE` | `chmod 600 /path/to/key` |
| `Permission denied (publickey)` | Wrong user, key, or the public key is not in remote `~/.ssh/authorized_keys` |
| `Connection refused` | SSH daemon not listening, or wrong port (`port = 22` in the profile) |
| `Connection timed out` | Host/IP, VPN, security group / firewall |
| `Could not resolve hostname` | Typo, or the `--ssh-host` alias is missing from `~/.ssh/config` |
| `Profile "default" has no host` | Run `vmup init`, or set `VMUP_HOST` |
| Picker never opens (Linux) | Need a GUI session; otherwise pass file args |
| `--clip` fails on macOS | `brew install pngpaste` |
| `--clip` fails on Linux | Install `wl-paste` (Wayland) or `xclip` (X11) |

Test the same connection vmup uses:

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@YOUR_HOST 'echo ok'
# or, with an SSH config alias:
ssh lab
```

`--force` never skips connectivity checks.

## Name note

The npm package is **`@nyxsky404/vmup`**. The command you run is still **`vmup`**.

Unscoped `vmup` is blocked on npm (too similar to existing names). This package is also unrelated to the `vmup` command from [vmtools](https://github.com/WhiteWinterWolf/vmtools/) (a Qemu helper). If both are installed, `which -a vmup` shows which binary wins.

## License

MIT
