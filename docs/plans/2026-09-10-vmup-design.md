# vmup — Production Design

**Date:** 2026-09-10  
**Status:** Validated (brainstorming complete)  
**Goal:** General-purpose CLI to batch screenshots/media to a remote host over SSH and return **one folder path** for coding agents.

---

## 1. Product definition

**vmup** collects media (images by default; video optional), stages a unique local batch, uploads it to a remote directory over SSH, and prints/copies **one remote folder path** plus a ready-to-paste agent prompt.

### Platforms (v1)

| Platform | Support |
|---|---|
| macOS | Full (picker, clipboard, watch) |
| Linux | Full where possible (args always; picker if GUI; clipboard if `wl-paste`/`xclip`) |
| Windows via WSL | Treated as Linux |
| Native Windows | Deferred |

### Core pipeline (stable)

```text
collect → validate → stage → upload → output → schedule TTL cleanup
```

Transports and input sources plug into this pipeline; they are not the product.

### Naming

| Concept | Name |
|---|---|
| Product / CLI / remote root | `vmup` |
| Batch folder prefix | `agents-` |
| Staged files | `media-01.png`, `media-02.mov`, … |
| Success label | `Agent folder:` |
| No vendor names | No Azure / Codex / company-specific defaults in templates |

### Batch ID

```text
agents-<YYYYMMDD>-<HHMMSS>-<uuid>
```

Example remote path:

```text
~/vmup/agents-20260910-140128-a1b2c3d4-e5f6-7890-abcd-ef1234567890/
```

### Non-goals (v1)

- Raycast extension
- Native Windows (WSL OK)
- Non-SSH backends (architecture allows later)
- Upload to many hosts in one command
- Interactive terminal paste / `read` loops (unreliable)

---

## 2. Paths

| Side | Path | Visibility |
|---|---|---|
| Local staging | `~/.cache/vmup/<batch-id>/` | Cache (hidden) |
| Local config | `~/.config/vmup/config.toml` | Hidden |
| Remote batches | `~/vmup/<batch-id>/` | **Visible** |
| Remote sweeper | `~/vmup/.cleanup.sh` | Dotfile beside data |
| Fallback local staging | `/tmp/vmup/<batch-id>/` if cache unavailable | Ephemeral |

`remote_dir` is configurable (default `~/vmup`).

---

## 3. Input modes

### 3.1 File args

```bash
vmup media1.png media2.png
vmup ./shots/
```

Most reliable. Directory args: recurse sensibly; ignore hidden junk.

### 3.2 Picker (default, no args)

```bash
vmup
```

Opens native multi-select file picker.

### 3.3 Clipboard loop

```bash
vmup --clip
```

Reads the **OS clipboard API** (not terminal paste). Capture → stage → wait for next → finish → upload.

### 3.4 Watch mode (foreground)

```bash
vmup watch
vmup watch --dir ~/Desktop
vmup watch --video
```

Flow:

1. Start SSH preflight in background  
2. Watch the screenshots folder (OS default, overridable)  
3. Each **new** screenshot/recording (after start) stages as `media-01`, `media-02`, …  
4. Log captures live in the terminal  
5. Stop with `stop`, Enter, or Ctrl+C  
6. If count > 0 → upload → one agent folder; if 0 → clean exit, no upload  

**Foreground only** — holds the terminal; not a detached daemon.

#### Ensuring only new media

At watch start:

1. Record `watch_started_at`  
2. Snapshot existing paths + sizes + mtimes  
3. Accept only files that:
   - were **not** in the snapshot, and  
   - have created/mtime ≥ start (small skew tolerance), and  
   - match allowed media types  

Also:

- **Settle check** — size stable ~300–500ms before staging  
- **Ignore junk** — `.DS_Store`, `.*`, `*.tmp`, incomplete writes  
- **Dedup** — one stage per file  
- **Type filter** — images by default; video with `--video` / config  

#### Watch folder defaults

| Platform | Default |
|---|---|
| macOS | `~/Desktop` |
| Linux/WSL | `~/Pictures/Screenshots` if present, else `~/Desktop` |

Asked during `vmup init`; overridable via config/flags.

---

## 4. Validation & `--force`

- Accept images by default (png/jpeg/webp/gif, etc.)  
- Video only when enabled  
- Skip/warn on non-media; `--force` allows edge overrides in v1  
- Size/count limits with clear errors before upload  
- Validate broken/partial images before staging when feasible  
- Rename all staged files to `media-NN.ext` for a consistent remote batch  

---

## 5. Connection preflight

| Mode | Strategy |
|---|---|
| File args | Check SSH **before** upload (collection already done) |
| Picker / `--clip` / `watch` | Start preflight **in parallel** with collection; **await before upload** |

Preflight: connect + ensure remote dir exists (`mkdir -p`).

On failure: keep local staging; non-zero exit; never print success.

`--force` does not skip connectivity checks.

---

## 6. Hosts: profiles & `--ssh-host`

### Profiles (saved remotes — default path for everyone)

Bookmarks in config. Created by `vmup init`.

```toml
default_profile = "default"

[profiles.default]
host = "USER_PROVIDED_HOST"
user = "ubuntu"
key = "~/.ssh/id_ed25519"
remote_dir = "~/vmup"
ttl_hours = 5
port = 22
```

```bash
vmup
vmup -p work
```

### Profile nicety: SSH config alias

A profile may reference `~/.ssh/config` instead of duplicating host/user/key:

```toml
[profiles.lab]
ssh_host = "lab"
remote_dir = "~/vmup"
ttl_hours = 8
```

### One-shot power option

```bash
vmup --ssh-host lab
vmup --ssh-host lab a.png b.png
```

- Connection from OpenSSH alias `lab`  
- `remote_dir` / TTL from **global defaults** (config/flags override)  
- No need to save a profile for one-off use  

### Rules

- Profiles = reusable bookmarks  
- `--ssh-host` = one-shot alias  
- `--ssh-host` + `--profile` together → **error**  
- No vendor-specific profile names shipped; suggested name is **`default`**

---

## 7. Config, env, flags

**Precedence:** flags → env (`VMUP_*`) → config file.

### Init wizard (`vmup init`)

Interactive; `[defaults]` accepted with Enter.

Ask at least:

- Profile name `[default]`  
- Host **(required)** — empty Enter = skip; set later in config/env  
- SSH user `[ubuntu]`  
- SSH key `[~/.ssh/id_ed25519]` (or detected key)  
- SSH port `[22]`  
- Remote dir `[~/vmup]`  
- TTL hours `[5]`  
- Screenshots / watch folder `[OS default]`  
- Include screen recordings by default? `[n]`  
- Install remote cleanup sweeper? `[Y/n]`  

Never ship real IPs, cloud usernames, or branded key paths in templates.

Non-interactive: `-y` + env for CI.

### Global defaults (when using `--ssh-host` or incomplete profile)

- `remote_dir = ~/vmup`  
- `ttl_hours = 5`  
- `prompt_template = "Please inspect all images in {{remote_path}}"`  
- `watch_include_video = false`  

---

## 8. CLI surface

| Command | Purpose |
|---|---|
| `vmup init` | Wizard, SSH test, ensure `~/vmup`, optional sweeper |
| `vmup` | Picker → upload |
| `vmup --clip` | Clipboard loop → upload |
| `vmup watch` | Foreground folder watch → upload |
| `vmup <files…>` | Upload files/dirs |
| `vmup prune` | Prune expired remote batches |
| `vmup prune --local` | GC orphaned local staging |
| `vmup profiles` | List profiles |

### Flags (selected)

- `-p, --profile <name>`  
- `--ssh-host <alias>`  
- `--clip`  
- `--dir <path>` (watch)  
- `--video`  
- `--force`  
- `--keep-local`  
- `--json`  
- `--ttl <hours>`  
- `-y, --yes`  

### Success UX (human)

```text
Uploaded 3 files → default
Agent folder: ~/vmup/agents-…/

Prompt:
Please inspect all images in ~/vmup/agents-…/
```

- Print path + prompt snippet  
- Copy path (or prompt) to local clipboard  
- `--json` for scripts/tools  

### Exit codes (sketch)

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Usage / config |
| 2 | Empty collect |
| 3 | SSH / network |
| 4 | Upload failure |
| 130 | Cancelled |

---

## 9. Upload & atomicity

1. Stage locally under `~/.cache/vmup/<batch-id>/`  
2. Upload to remote `~/vmup/<batch-id>.partial/` (or equivalent temp name)  
3. Remote rename to final `~/vmup/<batch-id>/`  
4. On failure: no success output; keep local staging; remove incomplete remote if possible  
5. Auto-create `~/vmup` if missing  

Transport v1: OpenSSH (`scp` / `sftp` / `ssh` + tar). Interface kept swappable for later backends.

---

## 10. Cleanup (both sides)

### Local

| Case | Behavior |
|---|---|
| Upload success | Delete staging (unless `--keep-local`) |
| Upload / auth failure | **Keep** staging; print path for retry |
| Ctrl+C during capture | Delete staging |
| Ctrl+C during upload | Delete local; try remove incomplete remote |
| Crash / reboot orphans | `vmup prune --local` + age-based GC |
| Clipboard path-copy fails | Still success; warn |

### Remote

| Case | Behavior |
|---|---|
| TTL | Delete matching batches after ~5 hours |
| Sweeper | Installed by init; run every **10 minutes**; `mmin +300` |
| No sweeper | Client schedules delayed `ssh rm -rf` as backup |
| Both fire | Idempotent |
| Naming | Only `agents-<date>-<time>-<uuid>` dirs; never wipe all of `~/vmup` |
| Early delete | `vmup prune --id <batch>` |
| Missing sweeper after VM rebuild | Detect; `vmup init` reinstalls |

**Policy:** remote sweeper is source of truth when present; client delayed delete is fallback; client may miss if laptop sleeps — document this.

---

## 11. Architecture

```text
CLI (vmup)
  ├─ config      file → env → flags
  ├─ collect     args | picker | --clip | watch
  ├─ validate    type/size/count; --force
  ├─ stage       ~/.cache/vmup/<batch-id>/media-NN.ext
  ├─ transport   ssh (v1); pluggable later
  ├─ cleanup     local GC + remote sweeper / client delayed rm
  └─ output      human + clipboard + --json
```

**Module rules**

- `collect` never talks SSH  
- `stage` owns batch id + `media-NN` naming  
- `transport` returns remote path; atomic partial → final  
- `cleanup` / `init` own sweeper install  
- `output` has no upload logic  

Thin platform adapters: macOS / Linux+WSL.

---

## 12. Packaging & launch

### Distribution

- **npm first** — `npm i -g vmup` / `npx vmup`  
- **Homebrew soon after** CLI surface stabilizes (same v1.x line OK; not blocking day-one architecture)  
- Runtime: Node 18+ (Bun-friendly)  
- Confirm `vmup` name availability on npm before publish  

### Testing bar

- Unit: batch id, `media-NN` rename, config merge, profile vs `ssh_host` vs `--ssh-host`  
- Integration: mock SSH / sshd fixture; atomic rename  
- Failure: empty collect, bad key perms, unreachable host, cancel, partial upload  
- Smoke: macOS picker/clipboard/watch; Linux args + clipboard tools; WSL args  
- Security: never log private keys; warn on bad key permissions  

### Docs (minimum)

- Quickstart  
- Profiles vs `--ssh-host`  
- Watch mode + “only new files after start”  
- Cleanup / TTL  
- SSH troubleshooting  
- `--clip` is OS clipboard, not terminal paste  

### Release checklist

1. Init wizard with Enter defaults  
2. args / picker / `--clip` / `watch` → one remote folder  
3. Path + prompt + clipboard; `--json`  
4. Local clean on success; keep on failure  
5. Sweeper + client fallback  
6. Multi-profile + `ssh_host` field + `--ssh-host`  
7. npm pack dry-run; semver; changelog  

---

## 13. Decisions log (locked)

| Topic | Decision |
|---|---|
| Audience | General product for coding agents |
| Platforms | macOS + Linux; WSL as Linux; native Windows later |
| Inputs | Hybrid: args / picker / `--clip` / `watch` |
| Staging names | `media-NN.ext` |
| Remote root | `~/vmup` (visible) |
| Local staging | `~/.cache/vmup` |
| Transport | SSH-first, pluggable internals |
| Hosts | Profiles + `--ssh-host` + profile `ssh_host` field |
| Config | File + env + flags |
| Cleanup | Remote sweeper + client fallback |
| Output | Print + copy + prompt; optional `--json` |
| Install | npm first; Homebrew after stabilize |
| Watch | Foreground; OS default dir; only files new after start |
| Brands | No Azure/Codex/vendor defaults |

---

## 14. Next steps

1. Confirm npm package name availability  
2. Implementation plan (modules, milestones, tests)  
3. Scaffold TypeScript CLI + `vmup init`  
4. SSH upload path + cleanup  
5. Picker / `--clip` / `watch` adapters  
6. Publish npm; then Homebrew formula  
