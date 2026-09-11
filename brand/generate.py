#!/usr/bin/env python3
"""Generate the vmup logo kit from one geometry + Geist Mono Medium."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from fontTools.misc.transform import Transform
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
WEB = REPO / "web"
FONT = WEB / "node_modules/geist/dist/fonts/geist-mono/GeistMono-Medium.ttf"
RESVG = Path("/tmp/vmup-resvg/node_modules/@resvg/resvg-js/index.js")

ON_LIGHT = "#333333"
ON_DARK = "#e5e5e5"
BG_DARK = "#121212"
BG_LIGHT = "#f5f5f5"
MUTED_DARK = "#737373"
MUTED_LIGHT = "#8a8a8a"

# 3×3 dots, even grid.
R = 5
DOTS = tuple((x, y) for y in (14, 32, 50) for x in (14, 32, 50))
MARK_SIZE = 64


def svg(view_w: float, view_h: float, inner: str, **attrs: str) -> str:
    extra = "".join(f' {k}="{v}"' for k, v in attrs.items())
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view_w:g} {view_h:g}"'
        f' fill="none"{extra}>\n{inner}\n</svg>\n'
    )


def circles(fill: str, cls: str | None = None) -> str:
    attr = f' fill="{fill}"'
    if cls:
        attr += f' class="{cls}"'
    body = "\n".join(
        f'    <circle cx="{x}" cy="{y}" r="{R}"/>' for x, y in DOTS
    )
    return f"  <g{attr}>\n{body}\n  </g>"


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    print(f"wrote {path.relative_to(REPO)}")


def mark_svgs() -> None:
    write(ROOT / "mark.svg", svg(MARK_SIZE, MARK_SIZE, circles("currentColor")))
    write(ROOT / "mark-on-light.svg", svg(MARK_SIZE, MARK_SIZE, circles(ON_LIGHT)))
    write(ROOT / "mark-on-dark.svg", svg(MARK_SIZE, MARK_SIZE, circles(ON_DARK)))
    favicon = svg(
        MARK_SIZE,
        MARK_SIZE,
        "  <style>\n"
        "    .m { fill: #333333; }\n"
        "    @media (prefers-color-scheme: dark) { .m { fill: #e5e5e5; } }\n"
        "  </style>\n" + circles("#333333", "m"),
    )
    write(ROOT / "favicon.svg", favicon)
    write(WEB / "app/icon.svg", favicon)
    write(WEB / "public/favicon.svg", favicon)

    icon_scale = 480 / MARK_SIZE
    icon_origin = (1024 - 480) / 2
    app = svg(
        1024,
        1024,
        f'  <rect width="1024" height="1024" fill="{BG_DARK}"/>\n'
        f'  <g transform="translate({icon_origin:g} {icon_origin:g}) scale({icon_scale:g})">\n'
        + circles(ON_DARK).replace("  <g", "    <g", 1).replace("\n  </g>", "\n    </g>")
        + "\n  </g>",
    )
    write(ROOT / "app-icon.svg", app)


def wordmark_paths(font_size: float, tracking: float) -> tuple[str, float, float, float]:
    font = TTFont(FONT)
    upem = font["head"].unitsPerEm
    cap = font["OS/2"].sCapHeight
    desc = -font["hhea"].descent
    scale = font_size / cap
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    x = 0.0
    parts: list[str] = []
    for i, ch in enumerate("vmup"):
        glyph = gs[cmap[ord(ch)]]
        pen = SVGPathPen(gs)
        glyph.draw(TransformPen(pen, Transform(scale, 0, 0, -scale, x, 0)))
        parts.append(f'    <path d="{pen.getCommands()}"/>')
        x += glyph.width * scale
        if i < 3:
            x += tracking
    width = x
    return "\n".join(parts), width, font_size, desc * scale


def wordmark_svgs(paths: str, width: float, cap: float, desc: float) -> None:
    pad_x, pad_y = 2.0, 2.0
    vb_w = width + pad_x * 2
    vb_h = cap + desc + pad_y * 2
    baseline = pad_y + cap

    def body(fill: str) -> str:
        return (
            f'  <g fill="{fill}" transform="translate({pad_x:g} {baseline:g})">\n'
            f"{paths}\n  </g>"
        )

    write(
        ROOT / "wordmark.svg",
        svg(vb_w, vb_h, body("currentColor")),
    )
    write(ROOT / "wordmark-on-light.svg", svg(vb_w, vb_h, body(ON_LIGHT)))
    write(ROOT / "wordmark-on-dark.svg", svg(vb_w, vb_h, body(ON_DARK)))
    return vb_w, vb_h, pad_x, baseline


def lockup_svgs(paths: str, word_w: float, cap: float, desc: float) -> None:
    gap = 14.0
    pad = 8.0
    body_center = MARK_SIZE / 2
    baseline = body_center + cap / 2
    type_top = baseline - cap
    type_bot = baseline + desc
    content_h = max(MARK_SIZE, type_bot) - min(0, type_top)
    y_mark = pad - min(0, type_top)
    y_type_baseline = pad + baseline - min(0, type_top)
    vb_w = pad + MARK_SIZE + gap + word_w + pad
    vb_h = pad + content_h + pad
    x_type = pad + MARK_SIZE + gap

    def body(fill: str) -> str:
        mark = circles(fill).replace("<g", f'<g transform="translate({pad:g} {y_mark:g})"')
        type_g = (
            f'  <g fill="{fill}" transform="translate({x_type:g} {y_type_baseline:g})">\n'
            f"{paths}\n  </g>"
        )
        return f"{mark}\n{type_g}"

    write(ROOT / "lockup.svg", svg(vb_w, vb_h, body("currentColor")))
    write(ROOT / "lockup-on-light.svg", svg(vb_w, vb_h, body(ON_LIGHT)))
    write(ROOT / "lockup-on-dark.svg", svg(vb_w, vb_h, body(ON_DARK)))

    # OG / social: dark field, lockup centered, one line under it.
    og_w, og_h = 1200, 630
    lockup_w = vb_w * 4.2
    scale = lockup_w / vb_w
    lockup_h = vb_h * scale
    lx = (og_w - lockup_w) / 2
    ly = (og_h - lockup_h) / 2 - 18
    caption_y = ly + lockup_h + 36
    og = svg(
        og_w,
        og_h,
        f'  <rect width="{og_w}" height="{og_h}" fill="{BG_DARK}"/>\n'
        f'  <g transform="translate({lx:g} {ly:g}) scale({scale:g})">\n'
        + body(ON_DARK).replace("\n  ", "\n    ")
        + "\n  </g>\n"
        f'  <text x="{og_w/2:g}" y="{caption_y:g}" text-anchor="middle"'
        f' fill="{MUTED_DARK}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"'
        f' font-size="18" letter-spacing="0.28em">ONE FOLDER PATH</text>',
    )
    write(ROOT / "og.svg", og)

    sheet_w, sheet_h = 1600, 1000
    hero_scale = 10.6
    lockup_scale = 2.35
    lockup_w = vb_w * lockup_scale
    lockup_x = sheet_w - 120 - lockup_w
    lockup_y = 300

    def sheet_body(bg: str, fg: str, muted: str) -> str:
        return (
            f'  <rect width="{sheet_w}" height="{sheet_h}" fill="{bg}"/>\n'
            f'  <g transform="translate(96 168) scale({hero_scale:g})">\n'
            + circles(fg).replace("\n  ", "\n    ")
            + "\n  </g>\n"
            f'  <g transform="translate({lockup_x:g} {lockup_y:g}) scale({lockup_scale:g})">\n'
            + body(fg).replace("\n  ", "\n    ")
            + "\n  </g>\n"
            f'  <text x="{lockup_x:g}" y="560" fill="{muted}"'
            f' font-family="ui-monospace, SFMono-Regular, Menlo, monospace"'
            f' font-size="13" letter-spacing="0.28em">FILES GO UP</text>\n'
            f'  <g transform="translate({lockup_x:g} 610) scale(1.05)">\n'
            + circles(fg).replace("\n  ", "\n    ")
            + "\n  </g>\n"
            f'  <g transform="translate({lockup_x + 92:g} 618) scale(0.72)">\n'
            + circles(fg).replace("\n  ", "\n    ")
            + "\n  </g>\n"
            f'  <g transform="translate({lockup_x + 158:g} 626) scale(0.5)">\n'
            + circles(fg).replace("\n  ", "\n    ")
            + "\n  </g>\n"
            f'  <text x="96" y="940" fill="{muted}"'
            f' font-family="ui-monospace, SFMono-Regular, Menlo, monospace"'
            f' font-size="12" letter-spacing="0.22em">MARK · WORDMARK · LOCKUP</text>'
        )

    write(ROOT / "system.svg", svg(sheet_w, sheet_h, sheet_body(BG_DARK, ON_DARK, MUTED_DARK)))
    write(
        ROOT / "system-light.svg",
        svg(sheet_w, sheet_h, sheet_body(BG_LIGHT, ON_LIGHT, MUTED_LIGHT)),
    )


def rasterize() -> None:
    jobs = [
        (ROOT / "mark-on-dark.svg", ROOT / "png/mark-512.png", 512),
        (ROOT / "mark-on-light.svg", ROOT / "png/mark-512-on-light.png", 512),
        (ROOT / "lockup-on-dark.svg", ROOT / "png/lockup-on-dark.png", 960),
        (ROOT / "lockup-on-light.svg", ROOT / "png/lockup-on-light.png", 960),
        (ROOT / "app-icon.svg", ROOT / "png/app-icon-1024.png", 1024),
        (ROOT / "app-icon.svg", ROOT / "png/apple-touch-icon.png", 180),
        (ROOT / "og.svg", ROOT / "png/og.png", 1200),
        (ROOT / "system.svg", ROOT / "png/system.png", 1600),
        (ROOT / "system-light.svg", ROOT / "png/system-light.png", 1600),
        (ROOT / "favicon.svg", ROOT / "png/favicon-32.png", 32),
        (ROOT / "favicon.svg", ROOT / "png/favicon-64.png", 64),
    ]
    (ROOT / "png").mkdir(exist_ok=True)
    script = ROOT / ".raster.mjs"
    lines = [
        'import { Resvg } from "/tmp/vmup-resvg/node_modules/@resvg/resvg-js/index.js";',
        'import { readFileSync, writeFileSync } from "fs";',
        "const jobs = " + json.dumps([[str(a), str(b), c] for a, b, c in jobs]) + ";",
        "for (const [svgPath, pngPath, width] of jobs) {",
        "  const svg = readFileSync(svgPath);",
        "  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width },",
        "    background: 'rgba(0,0,0,0)' });",
        "  writeFileSync(pngPath, resvg.render().asPng());",
        "  console.log('png', pngPath);",
        "}",
    ]
    script.write_text("\n".join(lines) + "\n")
    subprocess.check_call(["node", str(script)])
    script.unlink()

    # Site copies
    apple = ROOT / "png/apple-touch-icon.png"
    apple_dest = WEB / "app/apple-icon.png"
    apple_dest.write_bytes(apple.read_bytes())
    print(f"wrote {apple_dest.relative_to(REPO)}")
    og = ROOT / "png/og.png"
    for name in ("opengraph-image.png", "twitter-image.png"):
        dest = WEB / "app" / name
        dest.write_bytes(og.read_bytes())
        print(f"wrote {dest.relative_to(REPO)}")
    public_brand = WEB / "public/brand"
    public_brand.mkdir(parents=True, exist_ok=True)
    for name in (
        "mark.svg",
        "mark-on-dark.svg",
        "mark-on-light.svg",
        "wordmark.svg",
        "lockup.svg",
        "lockup-on-dark.svg",
        "lockup-on-light.svg",
        "favicon.svg",
        "app-icon.svg",
    ):
        dest = public_brand / name
        dest.write_text((ROOT / name).read_text())
        print(f"wrote {dest.relative_to(REPO)}")
    for name in ("lockup-on-dark.png", "lockup-on-light.png", "app-icon-1024.png", "og.png"):
        dest = public_brand / name
        dest.write_bytes((ROOT / "png" / name).read_bytes())
        print(f"wrote {dest.relative_to(REPO)}")


def main() -> None:
    mark_svgs()
    paths, width, cap, desc = wordmark_paths(font_size=40, tracking=-1.35)
    wordmark_svgs(paths, width, cap, desc)
    lockup_svgs(paths, width, cap, desc)
    rasterize()


if __name__ == "__main__":
    main()
