# Launch assets

- `demo.gif`: illustrative README workflow, using sample filenames and the CLI's actual human-output formatter. The timing is editorial, not a transfer benchmark.
- `demo-still.png`: static final frame for review or reduced-motion contexts.
- `png/og.png`: existing 1200 × 630 brand image, suitable for the repository social preview. Upload it at https://github.com/nyxsky404/vmup/settings under **Social preview**; committing the asset alone does not set GitHub's repository preview.

To regenerate the demo, install Pillow in a Python environment, run `npm ci` at the repo root, then `python3 scripts/render-demo.py`. Pass a monospace font path on Linux. No real files are uploaded and no SSH connection is made.
