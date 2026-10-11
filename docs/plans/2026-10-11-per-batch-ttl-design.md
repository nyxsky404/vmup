# Per-batch TTL

## Decision

Each completed remote batch gets its own absolute expiry timestamp. vmup stores the timestamp in a hidden sidecar beside the batch directory, not inside the agent-visible folder. The remote sweeper and `vmup prune` use that timestamp as the source of truth. Batches created by older vmup versions have no sidecar and continue to use the configured age cutoff.

Human output shows the expiry time and resolved TTL after the agent folder. Upload JSON adds an ISO `expiresAt` field. The generated prompt and every clipboard mode remain unchanged: prompt mode copies only the configured prompt, path mode copies only the path, and none still copies nothing.

## Data flow

After all files reach the `.partial` directory, the remote host computes `now + ttl` in epoch seconds. Finalization publishes `.<batch-id>.expires` while the partial directory still protects it from orphan cleanup, then moves the batch into place. Returning the remote timestamp avoids client/host clock skew in the displayed expiry.

The client still schedules its detached delayed delete as a backup. That delete, explicit `prune --id`, age-based prune, and `prune --all` remove both the batch and its sidecar. The minute-based sweeper removes a marked batch once the remote clock reaches its timestamp. It removes unmarked legacy batches with the installed fallback TTL and cleans orphaned sidecars.

## Compatibility and errors

The installed sweeper carries a version marker. `vmup check` distinguishes current, outdated, and missing sweepers; upload JSON exposes the same status. An outdated sweeper produces an upgrade warning because the old global cutoff can still delete a long-lived batch early. `vmup check --sweeper` installs the current script. vmup does not overwrite a remote cleanup script during a normal upload.

If remote finalization cannot publish the sidecar, the upload fails and cleanup removes the partial directory, final directory, and temporary metadata. Invalid or overflowing marker contents fall back to the configured age cutoff so cleanup cannot become permanently stuck. Partial uploads use a separate 15-minute stale threshold, longer than the ten-minute per-file transfer timeout.

## Validation

- A future per-batch timestamp protects a directory whose modification time is older than the fallback TTL.
- An expired timestamp deletes a fresh directory.
- Unmarked legacy batches still use the configured age cutoff.
- Different expiry timestamps can coexist under one remote root.
- `prune --all`, client deletion, and targeted deletion remove sidecars.
- Human and JSON output include expiry; copied prompt and copied path do not.
- Current, outdated, and missing sweeper states produce accurate output.
