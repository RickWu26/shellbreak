#!/usr/bin/env python3
"""Stage an isolated Xiaohongshu code-and-asset copy without touching TapTap sources."""

from __future__ import annotations

import json
import re
import shutil
from collections import Counter
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist" / "xiaohongshu"
PACKAGE = DIST / "package"
MANIFEST = DIST / "xhs-assets-manifest.json"
CODE_ROOTS = ("index.html", "src", "css")
ASSET_FALLBACKS = {
    "assets/wonders/generated-v2/wonder-crustplate-v2.png": "assets/wonders/generated-v2/wonder-crustplate.webp",
}


def ignore_nonportable(source_dir: str, names: list[str]) -> set[str]:
    base = Path(source_dir)
    return {
        name for name in names
        if name.startswith(".") or name.lower() == ".ds_store" or (base / name).is_symlink()
    }


def main() -> None:
    if not MANIFEST.is_file() or not (DIST / "assets").is_dir():
        raise SystemExit("Run scripts/build_xhs_assets.py first.")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if PACKAGE.exists():
        shutil.rmtree(PACKAGE)
    PACKAGE.mkdir(parents=True)

    for item in CODE_ROOTS:
        source = ROOT / item
        target = PACKAGE / item
        if source.is_dir():
            shutil.copytree(source, target, ignore=ignore_nonportable)
        else:
            shutil.copy2(source, target)
    shutil.copytree(DIST / "assets", PACKAGE / "assets")
    shutil.copy2(ROOT / "platform" / "xiaohongshu" / "platform.js", PACKAGE / "src" / "xhs-platform.js")
    shutil.copy2(ROOT / "platform" / "xiaohongshu" / "reward-locale.js", PACKAGE / "src" / "xhs-reward-locale.js")
    shutil.copy2(ROOT / "platform" / "xiaohongshu" / "reward.js", PACKAGE / "src" / "xhs-reward.js")
    shutil.copy2(ROOT / "platform" / "xiaohongshu" / "storage.js", PACKAGE / "src" / "xhs-storage.js")
    shutil.copy2(ROOT / "platform" / "xiaohongshu" / "csp-adapter.js", PACKAGE / "src" / "xhs-csp-adapter.js")

    path_map: dict[str, str] = {}
    for row in manifest["converted"]:
        path_map[row["source"]] = row["output"]
    for row in manifest["copied"]:
        path_map[row["path"]] = row["path"]

    placeholder_count = 0
    font_fallbacks = 0
    dynamic_raster_suffixes = 0
    for rel in manifest["excluded"]:
        if not rel.startswith("backgrounds/"):
            continue
        suffix = Path(rel).suffix.lower()
        target = PACKAGE / "assets" / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        if suffix == ".svg":
            target.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"></svg>\n', encoding="utf-8")
            placeholder_count += 1
        elif suffix in {".png", ".webp", ".jpg", ".jpeg", ".gif", ".bmp"}:
            image = Image.new("RGBA" if suffix not in {".jpg", ".jpeg"} else "RGB", (1, 1), (0, 0, 0, 0) if suffix not in {".jpg", ".jpeg"} else (7, 16, 24))
            formats = {".png": "PNG", ".webp": "WEBP", ".jpg": "JPEG", ".jpeg": "JPEG", ".gif": "GIF", ".bmp": "BMP"}
            image.save(target, formats[suffix], quality=40)
            placeholder_count += 1

    text_files = [PACKAGE / "index.html", *PACKAGE.rglob("*.js"), *PACKAGE.rglob("*.css"), *PACKAGE.rglob("*.json")]
    for file in text_files:
        original = file.read_text(encoding="utf-8")
        updated = original
        if file.suffix.lower() == ".css":
            old_font = '../assets/fonts/Ma_Shan_Zheng_FaithTenets.ttf?v=1") format("truetype")'
            new_font = '../assets/fonts/Ma_Shan_Zheng.woff2?v=1") format("woff2")'
            font_fallbacks += updated.count(old_font)
            updated = updated.replace(old_font, new_font)
        if file.name == "index.html":
            updated, replaced = re.subn(
                r"<script>\s*.*?</script>",
                '<script src="src/xhs-platform.js"></script>\n'
                '<script src="src/xhs-storage.js"></script>\n'
                '<script src="src/locales/zh-CN.js?v=73"></script>\n'
                '<script src="src/xhs-reward-locale.js"></script>\n'
                '<script src="src/i18n.js?v=4"></script>\n'
                '<script src="src/xhs-csp-adapter.js"></script>\n'
                '<script src="src/xhs-reward.js"></script>',
                updated,
                count=1,
                flags=re.S,
            )
            if replaced != 1:
                raise SystemExit("Expected to replace exactly one inline startup script in index.html")
            prefix = 'onclick="event.stopPropagation();SB.ui.openIntro('
            while prefix in updated:
                start = updated.index(prefix)
                end = updated.index(')"', start) + 2
                handler = updated[start:end]
                key_start = handler.index("('") + 2
                key_end = handler.rfind("')")
                key = handler[key_start:key_end]
                updated = updated[:start] + 'data-xhs-intro="' + key + '"' + updated[end:]
            updated = updated.replace('onclick="SB.game.setTab(\'challenges\')"', 'data-xhs-action="challenge-details"')
            updated = updated.replace('onclick="if(event.target===this)SB.ui.closeIntro()"', 'data-xhs-action="intro-backdrop"')
        if file.suffix.lower() == ".js":
            updated, suffix_count = re.subn(r"(\+\s*['\"])(\.png)(?=(?:\?[^'\"]*)?['\"])", r"\1.webp", updated)
            dynamic_raster_suffixes += suffix_count
            replacements = [
                ("""onclick=\"event.stopPropagation();SB.ui.openIntro(\\'happy\\')\"""", 'data-xhs-intro="happy"'),
                ("""onclick=\"event.preventDefault();event.stopPropagation();SB.ui.showHoverInfo(this.getAttribute(\\'title\\'))\"""", 'data-xhs-action="hover-info"'),
                ("""onclick=\"SB.ui.render.setMetaShopView(\\'rebirth\\')\"""", 'data-xhs-action="meta-rebirth"'),
                ("""onclick=\"SB.ui.render.setMetaShopView(\\'stardust\\')\"""", 'data-xhs-action="meta-stardust"'),
                ('onclick="SB.ui.closeIntro()"', 'data-xhs-action="intro-close"'),
            ]
            for old, new in replacements:
                updated = updated.replace(old, new)
        for source_path, output_path in ASSET_FALLBACKS.items():
            updated = updated.replace(source_path, output_path)
        for source_rel, output_rel in path_map.items():
            if source_rel != output_rel:
                updated = updated.replace("assets/" + source_rel, "assets/" + output_rel)
        if updated != original:
            file.write_text(updated, encoding="utf-8", newline="")

    excluded_refs: Counter[str] = Counter()
    text_blobs = [(p.relative_to(PACKAGE).as_posix(), p.read_text(encoding="utf-8", errors="ignore")) for p in text_files]
    for rel in manifest["excluded"]:
        needle = "assets/" + rel
        hits = sum(blob.count(needle) for _, blob in text_blobs)
        if hits:
            excluded_refs[rel.split("/", 1)[0]] += hits

    missing_literal_refs: list[dict[str, str]] = []
    for name, blob in text_blobs:
        for match in re.finditer(r"assets/[A-Za-z0-9_./\-\u0080-\uffff]+\.(?:png|jpe?g|webp|gif|svg|woff2?|ttf)", blob, re.I):
            ref = match.group(0).split("?", 1)[0]
            if "' +" in ref or "' +" in ref:
                continue
            target = PACKAGE / ref
            if not target.is_file():
                missing_literal_refs.append({"file": name, "reference": ref})

    report = {
        "packageRoot": str(PACKAGE),
        "sourceRootsCopied": list(CODE_ROOTS),
        "rewrittenRasterReferences": sum(1 for source, target in path_map.items() if source != target),
        "excludedReferenceCountsByTopLevel": dict(excluded_refs),
        "transparentBackgroundPlaceholders": placeholder_count,
        "fontFallbacksToWoff2": font_fallbacks,
        "dynamicRasterSuffixRewrites": dynamic_raster_suffixes,
        "missingLiteralReferences": missing_literal_refs,
        "inlineScriptBlocks": sum(blob.count("<script>\n") for name, blob in text_blobs if name.endswith(".html")),
        "htmlInlineEventAttributes": sum(sum(blob.count(token) for token in (" onclick=", " onchange=", " oninput=", " onsubmit=")) for name, blob in text_blobs if name.endswith(".html")),
        "jsInlineEventAttributeLiterals": sum(sum(blob.count(token) for token in ("onclick=", "onchange=", "oninput=", "onsubmit=")) for name, blob in text_blobs if name.endswith(".js")),
        "status": "staged-not-uploadable" if excluded_refs or missing_literal_refs else "staged-needs-platform-audit",
        "note": "This staging copy is not a final MiniTool ZIP. CSP and platform storage adaptation are still required.",
    }
    report_path = DIST / "xhs-build-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Staged code and assets: {PACKAGE}")
    print(f"Rewritten raster references: {report['rewrittenRasterReferences']}")
    print(f"References to excluded asset categories: {dict(excluded_refs)}")
    print(f"Missing literal asset references: {len(missing_literal_refs)}")
    print(f"Report: {report_path}")


if __name__ == "__main__":
    main()
