#!/usr/bin/env python3
"""Render the illustrative README GIF. Requires Pillow; run npm run build first.

Usage: python3 scripts/render-demo.py /path/to/monospace-font.ttf
On macOS the font defaults to Menlo. No SSH connection or real files are used.
"""

import json
import os
from pathlib import Path
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
FONT = sys.argv[1] if len(sys.argv) > 1 else '/System/Library/Fonts/Menlo.ttc'
regular = ImageFont.truetype(FONT, 20)
small = ImageFont.truetype(FONT, 16)
command = '$ vmup shot.png notes.pdf'
result = subprocess.run(
    ['node', '--input-type=module', '-e', '''
import { buildHumanOutput } from './dist/output.js';
const remotePath = '~/vmup/agents-20261107-120000-a1b2c3d4/';
console.log(JSON.stringify(buildHumanOutput({
  count: 2, profileName: 'default', remotePath,
  expiresAt: '2026-11-07T12:05:00Z', ttlMinutes: 5,
  prompt: `Please inspect all files in ${remotePath}`,
  files: ['image-01.png', 'file-01.pdf'],
})));
'''], cwd=ROOT, check=True, capture_output=True, text=True,
    env={'PATH': os.environ['PATH'], 'NO_COLOR': '1', 'TZ': 'UTC', 'LANG': 'en_US.UTF-8'},
)
output = json.loads(result.stdout).splitlines()
frames = []
durations = []


def frame(typed, lines, footer, duration):
    canvas = Image.new('RGB', (1120, 530), '#121212')
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((20, 20, 1100, 510), radius=14, fill='#191919', outline='#3a3a3a', width=1)
    for x, color in [(46, '#f17971'), (68, '#e7bf68'), (90, '#82b58b')]:
        draw.ellipse((x, 43, x + 10, 53), fill=color)
    draw.text((124, 38), 'vmup / local files → remote agent', font=small, fill='#a3a3a3')
    draw.line((21, 74, 1099, 74), fill='#343434')
    draw.text((46, 102), typed, font=regular, fill='#f2f2f2')
    for index, line in enumerate(lines):
        color = '#b6e6c0' if line.startswith('Uploaded') else '#d4d4d4'
        draw.text((46, 162 + 31 * index), line, font=regular, fill=color)
    draw.line((21, 448, 1099, 448), fill='#343434')
    draw.text((46, 469), footer, font=small, fill='#a3a3a3')
    frames.append(canvas.quantize(colors=96))
    durations.append(duration)


frame('$ ', [], 'ILLUSTRATIVE DEMO · sample files · SSH target already configured', 600)
for length in range(3, len(command) + 1):
    frame(command[:length] + '▌', [], '01 / Collect a screenshot and a PDF', 55)
frame(command, ['Uploading 2 files over SSH…'], '02 / Stage stable filenames and transfer one batch', 1000)
frame(command, output, '03 / Paste the prompt into your coding agent', 4200)
frame(command, output + ['(copied prompt to clipboard)'], 'One folder path. No agent plugin. Five-minute default TTL.', 2500)
frames[0].save(ROOT / 'brand/demo.gif', save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True, disposal=2)
frames[-1].save(ROOT / 'brand/demo-still.png')
print(f'Rendered brand/demo.gif ({(ROOT / "brand/demo.gif").stat().st_size:,} bytes)')
