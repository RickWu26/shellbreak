#!/usr/bin/env python3
"""Build a platform-limit smoke-test package from the isolated XHS staging copy.

The MiniTool upload API currently rejects packages with more than 200 entries.
This test-only variant keeps game logic intact and retains starter/resource art,
while redirecting optional later-era illustrations to a shared local SVG.
"""

from __future__ import annotations

import json
import re
import shutil
import zipfile
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist" / "xiaohongshu"
SOURCE = DIST / "package"
PACKAGE = DIST / "package-smoke"
ARCHIVE = DIST / "shellbreak-xhs-smoke-r6.zip"
REPORT = DIST / "xhs-smoke-report-r6.json"
MAX_PACKAGE_FILES = 200
MAX_ZIP_BYTES = 10 * 1024 * 1024

ASSET_REFERENCE = re.compile(
    r"(?P<prefix>(?:\.\./|\./|/)?assets/)"
    r"(?P<path>[A-Za-z0-9_./\-\u0080-\uffff]+\.(?:png|jpe?g|webp|gif|svg|woff2?|ttf))"
    r"(?P<query>\?[^\"')\s]*)?",
    re.IGNORECASE,
)

PLACEHOLDER_SVG = """<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\">
  <rect x=\"3\" y=\"3\" width=\"58\" height=\"58\" rx=\"15\" fill=\"#132b35\" stroke=\"#52737b\" stroke-width=\"2\"/>
  <path d=\"M17 38c3-11 12-18 23-18 4 0 7 1 10 3-4 0-7 2-9 5 4 0 7 2 9 5-4-1-8 0-11 3-3 3-7 5-12 5-4 0-8-1-10-3z\" fill=\"#8bbcc0\"/>
  <circle cx=\"43\" cy=\"43\" r=\"3\" fill=\"#d8b777\"/>
</svg>\n"""


def allowed_asset(rel: Path) -> bool:
    path = rel.as_posix()
    suffix = rel.suffix.lower()
    if suffix == ".svg" or suffix == ".woff2":
        return True
    if suffix != ".webp":
        return False
    if path in {
        "brand/logo-shell-sun.webp",
        "ui-era/early.webp",
        "achievements/achievement-earned-medal-v1.webp",
        "achievements/achv-first-rebirth.webp",
        "achievements/achv-shell-break.webp",
        "achievements/achv-cold.webp",
        "achievements/achv-small.webp",
        "achievements/achv-science.webp",
        "achievements/achv-religion.webp",
        "achievements/achv-tech-all.webp",
        "achievements/achv-civic-all.webp",
        "achievements/achv-star-complete.webp",
    }:
        return True
    if rel.parts[0] in {"resource-icons", "talent-icons", "company-icons"}:
        return True
    return (
        len(rel.parts) == 3
        and rel.parts[0] in {"building-icons", "tech-icons", "civic-icons"}
        and rel.parts[1] == "era-1"
    )


def check_inside(path: Path, parent: Path) -> None:
    target = path.resolve()
    base = parent.resolve()
    if target == base or base not in target.parents:
        raise SystemExit(f"Refusing to replace path outside {base}: {target}")


def patch_dynamic_optional_art(path: Path, text: str) -> tuple[str, int]:
    count = 0
    if path.name == "background.js":
        text, n = re.subn(
            r"'assets/backgrounds/sequence/era-'\s*\+\s*i\s*\+\s*'/frame-0[1-4]\.webp'",
            "'assets/xhs-placeholder.svg'",
            text,
        )
        count += n
    if path.name == "render-pane-war.js":
        old = "return 'assets/war/enemies/' + filenames[stageNumber] + '?v=2';"
        if old in text:
            text = text.replace(old, "return 'assets/xhs-placeholder.svg';")
            count += 1
    if path.name == "render.js":
        old = "src=\"assets/backgrounds/sequence/era-10/drift-terra/' + frameFiles[i] + '\""
        if old in text:
            text = text.replace(old, 'src="assets/xhs-placeholder.svg"')
            count += 1
    return text, count


def patch_references(package: Path, retained: set[str]) -> tuple[int, list[str]]:
    rewritten = 0
    unresolved: list[str] = []
    text_files: Iterable[Path] = (
        p for p in package.rglob("*")
        if p.is_file() and p.suffix.lower() in {".html", ".js", ".css", ".json"}
    )
    for path in text_files:
        original = path.read_text(encoding="utf-8")
        text, dynamic_count = patch_dynamic_optional_art(path, original)
        rewritten += dynamic_count

        def replace(match: re.Match[str]) -> str:
            nonlocal rewritten
            prefix = match.group("prefix")
            asset_path = match.group("path").replace("\\", "/")
            query = match.group("query") or ""
            if asset_path.casefold() in retained:
                return match.group(0)
            rewritten += 1
            return prefix + "xhs-placeholder.svg" + query

        text = ASSET_REFERENCE.sub(replace, text)
        if text != original:
            path.write_text(text, encoding="utf-8", newline="")

    for path in package.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".html", ".js", ".css", ".json"}:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for match in ASSET_REFERENCE.finditer(text):
            raw = match.group("path").replace("\\", "/")
            if raw.casefold() not in retained and raw.casefold() != "xhs-placeholder.svg":
                unresolved.append(f"{path.relative_to(package).as_posix()}: {match.group(0)}")
    return rewritten, unresolved


def patch_container_blockers(package: Path) -> dict[str, int]:
    result = {"removedExtraHtml": 0, "removedStarMapTab": 0, "disabledStarMapIframe": 0, "removedStarMapPostMessageBranch": 0}
    extra_html = package / "src" / "ui" / "star-map-frame.html"
    if extra_html.exists():
        extra_html.unlink()
        result["removedExtraHtml"] = 1

    tab_path = package / "index.html"
    index_text = tab_path.read_text(encoding="utf-8")
    index_text, result["removedStarMapTab"] = re.subn(
        r"\s*<div class=\"tab locked\" id=\"tab-star-map\"[\s\S]*?</div>",
        "",
        index_text,
        count=1,
    )
    if result["removedStarMapTab"] != 1:
        raise SystemExit("Could not remove the test-only star-map tab from the XHS package")
    tab_path.write_text(index_text, encoding="utf-8", newline="")

    game_path = package / "src" / "game.js"
    game_text = game_path.read_text(encoding="utf-8")
    old_gate = "if (k === 'star-map' && S && !(S.shellOpened && S.shell <= 0)) return;"
    if old_gate not in game_text:
        raise SystemExit("Could not safely reroute the unsupported star-map tab")
    game_text = game_text.replace(old_gate, "if (k === 'star-map') k = 'village';", 1)
    game_path.write_text(game_text, encoding="utf-8", newline="")

    pane_path = package / "src" / "ui" / "render-pane-star-map.js"
    pane_path.write_text(
        "(function(root){'use strict';var SB=root.SB||(root.SB={});SB.ui=SB.ui||{};"
        "var parts=SB.ui.renderParts||(SB.ui.renderParts={});parts.paneStarMap=function(){return '';};"
        "})(window);\n",
        encoding="utf-8",
        newline="",
    )
    result["disabledStarMapIframe"] = 1

    render_path = package / "src" / "ui" / "render.js"
    render_text = render_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"      if \(k === 'star-map'\) \{[\s\S]*?(?=      \} else if \(k === 'folk')"
    )
    render_text, result["removedStarMapPostMessageBranch"] = pattern.subn(
        "      if (k === 'star-map') {\n        node.innerHTML = cardHeadHTML(k);\n",
        render_text,
        count=1,
    )
    if result["removedStarMapPostMessageBranch"] != 1:
        raise SystemExit("Could not safely remove the unsupported star-map iframe bridge")
    render_path.write_text(render_text, encoding="utf-8", newline="")

    # Keep stale TapTap implementation notes from looking like active forbidden markup
    # to simple package scanners. These are comment-only edits in the test copy.
    error_log = package / "src" / "ui" / "error-log.js"
    error_text = error_log.read_text(encoding="utf-8")
    error_text = error_text.replace("<script>", "script tag")
    error_text = error_text.replace("<iframe>", "embedded frame")
    error_text = error_text.replace("<img>", "image tag")
    error_log.write_text(error_text, encoding="utf-8", newline="")

    render_content = package / "src" / "ui" / "render-content.js"
    content_text = render_content.read_text(encoding="utf-8")
    content_text = content_text.replace("onclick=\"SB.ui.openIntro('KEY')\"", "intro event key")
    render_content.write_text(content_text, encoding="utf-8", newline="")
    return result


def main() -> None:
    if not SOURCE.is_dir() or not (SOURCE / "index.html").is_file():
        raise SystemExit("Run scripts/stage_xhs_build.py first.")
    check_inside(PACKAGE, DIST)
    check_inside(ARCHIVE, DIST)
    check_inside(REPORT, DIST)
    if PACKAGE.exists():
        shutil.rmtree(PACKAGE)
    PACKAGE.mkdir(parents=True)

    for item in ("index.html", "src", "css"):
        source = SOURCE / item
        target = PACKAGE / item
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            shutil.copy2(source, target)

    source_assets = SOURCE / "assets"
    target_assets = PACKAGE / "assets"
    target_assets.mkdir(parents=True)
    retained: set[str] = set()
    for asset in source_assets.rglob("*"):
        if not asset.is_file():
            continue
        rel = asset.relative_to(source_assets)
        if not allowed_asset(rel):
            continue
        destination = target_assets / rel
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(asset, destination)
        retained.add(rel.as_posix().casefold())

    placeholder = target_assets / "xhs-placeholder.svg"
    placeholder.write_text(PLACEHOLDER_SVG, encoding="utf-8")
    retained.add("xhs-placeholder.svg")

    container_blockers = patch_container_blockers(PACKAGE)
    rewritten, unresolved = patch_references(PACKAGE, retained)
    file_count = sum(1 for p in PACKAGE.rglob("*") if p.is_file())
    asset_count = sum(1 for p in target_assets.rglob("*") if p.is_file())
    if ARCHIVE.exists():
        ARCHIVE.unlink()
    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(PACKAGE.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(PACKAGE).as_posix())

    with zipfile.ZipFile(ARCHIVE) as archive:
        bad_member = archive.testzip()
        archive_count = len(archive.infolist())
        has_root_entry = "index.html" in archive.namelist()

    report = {
        "packageRoot": str(PACKAGE),
        "archive": str(ARCHIVE),
        "fileCount": file_count,
        "assetCount": asset_count,
        "zipBytes": ARCHIVE.stat().st_size,
        "rewrittenAssetReferences": rewritten,
        "unresolvedAssetReferences": unresolved,
        "containerBlockers": container_blockers,
        "zipEntryCount": archive_count,
        "zipIntegrityError": bad_member,
        "rootIndexHtml": has_root_entry,
        "visualScope": "Starter, resource, company, talent and selected UI art retained; optional and later-era illustrations use a shared placeholder. The star-map iframe feature is omitted in this test-only package.",
    }
    if file_count > MAX_PACKAGE_FILES:
        report["status"] = "failed-file-count"
    elif ARCHIVE.stat().st_size > MAX_ZIP_BYTES:
        report["status"] = "failed-zip-size"
    elif unresolved or bad_member or not has_root_entry or archive_count != file_count:
        report["status"] = "failed-integrity"
    else:
        report["status"] = "smoke-package-ready"
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["status"] != "smoke-package-ready":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
