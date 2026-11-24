#!/usr/bin/env python3
"""Build the full-content Xiaohongshu MiniTool package candidate."""

from __future__ import annotations

import base64
import argparse
import hashlib
import io
import json
import re
import shutil
import zipfile
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist" / "xiaohongshu"
SOURCE = DIST / "package"
PACKAGE = DIST / "package-release-r2"
ARCHIVE = DIST / "shellbreak-xhs-release-r2.zip"
REPORT = DIST / "xhs-release-report-r2.json"
STAR_MAP_SOURCE = ROOT / "src" / "ui" / "star-map-frame.html"
MAX_FILES = 200
MAX_ZIP_BYTES = 10 * 1024 * 1024
STATIC_IMAGE_QUALITY = 74
STATIC_IMAGE_ALPHA_QUALITY = 80
DYNAMIC_RASTER_ROOTS = {"resource-icons", "company-icons", "war"}
SUPPORTED_SUFFIXES = {
    ".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".svg", ".woff", ".woff2", ".json",
}

ASSET_REFERENCE = re.compile(
    r"(?P<prefix>(?:\.\./|\./|/)?assets/)"
    r"(?P<path>[A-Za-z0-9_./\-\u0080-\uffff]+\.(?:png|jpe?g|webp|gif|svg|woff2?|ttf))"
    r"(?P<query>\?[^\"')\s]*)?",
    re.IGNORECASE,
)

TRANSPARENT_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1">'
    '<path fill="none" d="M0 0h1v1H0z"/></svg>\n'
)


def check_inside(path: Path, parent: Path) -> None:
    target = path.resolve()
    base = parent.resolve()
    if target == base or base not in target.parents:
        raise SystemExit(f"Refusing to replace path outside {base}: {target}")


def reset_dir(path: Path) -> None:
    check_inside(path, DIST)
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True)


class _RootDivParser(HTMLParser):
    def __init__(self, source: str, target_id: str) -> None:
        super().__init__(convert_charrefs=False)
        self.source = source
        self.offsets = [0]
        for line in source.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.target_id = target_id
        self.start: int | None = None
        self.end: int | None = None
        self.depth = 0

    def _offset(self) -> int:
        line, col = self.getpos()
        return self.offsets[min(line - 1, len(self.offsets) - 1)] + col

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.end is not None:
            return
        attr = dict(attrs)
        if self.start is None and tag == "div" and attr.get("id") == self.target_id:
            self.start = self._offset()
            self.depth = 1
        elif self.start is not None and tag == "div":
            self.depth += 1

    def handle_endtag(self, tag: str) -> None:
        if self.start is None or self.end is not None or tag != "div":
            return
        self.depth -= 1
        if self.depth == 0:
            close = self.source.find(">", self._offset())
            if close < 0:
                raise SystemExit("Could not close the star-map root element")
            self.end = close + 1


def extract_star_map(source: str) -> tuple[str, str, str]:
    parser = _RootDivParser(source, "star-map-mock")
    parser.feed(source)
    if parser.start is None or parser.end is None:
        raise SystemExit("Could not locate the star-map root element")
    markup = source[parser.start:parser.end]

    style_blocks = re.findall(r"<style\b[^>]*>([\s\S]*?)</style\s*>", source, re.IGNORECASE)
    styles = [style.strip() for style in style_blocks if "#star-map-mock" in style]
    if not styles:
        raise SystemExit("Could not extract the star-map styles")
    css = "\n\n".join(styles)

    markup = re.sub(r"<style\b[^>]*>[\s\S]*?</style\s*>", "", markup, flags=re.IGNORECASE)
    markup = re.sub(r"<script\b[^>]*>[\s\S]*?</script\s*>", "", markup, flags=re.IGNORECASE)
    if re.search(r"<\s*(?:iframe|object)\b|\son[a-z]+\s*=", markup, flags=re.IGNORECASE):
        raise SystemExit("The extracted star-map markup contains a blocked element or inline handler")

    scripts = re.findall(r"<script\b[^>]*>([\s\S]*?)</script\s*>", source, re.IGNORECASE)
    runtime = next((script for script in scripts if "function _smMount(" in script), None)
    if runtime is None:
        raise SystemExit("Could not locate the complete star-map runtime")
    runtime, separator, _ = runtime.partition("\n// Web iframe entry point\n")
    if not separator:
        raise SystemExit("Could not separate the shared star-map runtime from the iframe entry point")

    wrapped = (
        "(function (parts) {\n'use strict';\n"
        + runtime.strip()
        + "\nparts.inlineStarMapMarkup = " + json.dumps(markup, ensure_ascii=False) + ";\n"
        "parts.mountInlineStarMap = _smMount;\n"
        "})(window.SB.ui.renderParts);\n"
    )
    return markup, css, wrapped


def build_native_star_map() -> dict[str, int]:
    markup, css, runtime = extract_star_map(STAR_MAP_SOURCE.read_text(encoding="utf-8"))
    (PACKAGE / "css" / "xhs-star-map.css").write_text(css + "\n", encoding="utf-8")
    (PACKAGE / "src" / "ui" / "xhs-star-map.js").write_text(runtime, encoding="utf-8")

    pane_path = PACKAGE / "src" / "ui" / "render-pane-star-map.js"
    pane = pane_path.read_text(encoding="utf-8")
    pane, n = re.subn(
        r'''    var map = parts\.inlineStarMapMarkup \|\| '<div class="starmap-frame-wrap">' \+[\s\S]*?\n(?=    return map \+)''',
        "    var map = parts.inlineStarMapMarkup;\n",
        pane,
        count=1,
    )
    if n != 1 or re.search(r"<\s*(?:iframe|object)\b", pane, flags=re.IGNORECASE):
        raise SystemExit("Could not remove the Web iframe markup from the single-page star map")
    pane_path.write_text(pane, encoding="utf-8", newline="")

    index_path = PACKAGE / "index.html"
    index = index_path.read_text(encoding="utf-8")
    css_tag = '<link rel="stylesheet" href="css/xhs-star-map.css">\n'
    if "css/xhs-star-map.css" not in index:
        index, n = re.subn(r'(<link[^>]+href="css/main\.css[^>]*>\s*)', lambda m: m.group(1) + css_tag, index, count=1)
        if n != 1:
            raise SystemExit("Could not link the XHS star-map stylesheet")
    version = hashlib.sha256(runtime.encode("utf-8")).hexdigest()[:12]
    script_tag = f'<script src="src/ui/xhs-star-map.js?v={version}"></script>\n'
    if "src/ui/xhs-star-map.js" not in index:
        index, n = re.subn(
            r'(<script\s+src="src/ui/render-pane-star-map\.js(?:\?[^\"]*)?"\s*></script>\s*)',
            lambda m: m.group(1) + script_tag,
            index,
            count=1,
        )
        if n != 1:
            raise SystemExit("Could not link the XHS star-map runtime")
    index_path.write_text(index, encoding="utf-8", newline="")
    return {"stylesChars": len(css), "markupChars": len(markup), "runtimeChars": len(runtime)}


def enable_test_only_star_map_unlock() -> dict[str, bool]:
    """Open the Star Map only in this explicitly named test-preview package."""
    platform_path = PACKAGE / "src" / "xhs-platform.js"
    platform = platform_path.read_text(encoding="utf-8")
    anchor = "    localizationEnabled: false"
    if platform.count(anchor) != 1:
        raise SystemExit("Could not add the test-only Star Map flag to the XHS runtime")
    platform = platform.replace(anchor, anchor + ",\n    testUnlockStarMap: true", 1)
    platform_path.write_text(platform, encoding="utf-8", newline="")

    replacements = {
        "src/game.js": [
            (
                "if (k === 'star-map' && S && !(S.shellOpened && S.shell <= 0)) return;",
                "if (k === 'star-map' && S && !(root.shellbreakPlatform && root.shellbreakPlatform.testUnlockStarMap === true) && !(S.shellOpened && S.shell <= 0)) return;",
            ),
        ],
        "src/ui/render.js": [
            (
                "var ss = res(), sop = !!(ss && (ss.shellOpened || ss.breakSettled) && ss.shell <= 0);",
                "var ss = res(), sop = !!((root.shellbreakPlatform && root.shellbreakPlatform.testUnlockStarMap === true) || (ss && (ss.shellOpened || ss.breakSettled) && ss.shell <= 0));",
            ),
            (
                "if (node.dataset.tab === 'star-map' && !(res() && (res().shellOpened || res().breakSettled) && res().shell <= 0)) return;",
                "if (node.dataset.tab === 'star-map' && !(root.shellbreakPlatform && root.shellbreakPlatform.testUnlockStarMap === true) && !(res() && (res().shellOpened || res().breakSettled) && res().shell <= 0)) return;",
            ),
        ],
        "src/ui/render-pane-star-map.js": [
            (
                "return !!(s && (s.shellOpened || s.breakSettled) && s.shell <= 0);",
                "return !!((root.shellbreakPlatform && root.shellbreakPlatform.testUnlockStarMap === true) || (s && (s.shellOpened || s.breakSettled) && s.shell <= 0));",
            ),
        ],
    }
    for relative, pairs in replacements.items():
        path = PACKAGE / relative
        text = path.read_text(encoding="utf-8")
        for old, new in pairs:
            if text.count(old) != 1:
                raise SystemExit(f"Could not apply test-only Star Map patch in {relative}: {old}")
            text = text.replace(old, new, 1)
        path.write_text(text, encoding="utf-8", newline="")
    return {"enabled": True, "storyPopupStillUsesProgressionGate": True}


def embed_static_rasters(files: list[Path], source_assets: Path) -> dict[str, str]:
    """Encode each static raster independently so clients never need SVG view cropping."""
    mapping: dict[str, str] = {}
    for path in files:
        with Image.open(path) as source:
            image = source.convert("RGBA")
        webp_buffer = io.BytesIO()
        image.save(
            webp_buffer,
            "WEBP",
            quality=STATIC_IMAGE_QUALITY,
            method=6,
            alpha_quality=STATIC_IMAGE_ALPHA_QUALITY,
        )
        data_uri = "data:image/webp;base64," + base64.b64encode(webp_buffer.getvalue()).decode("ascii")
        rel = path.relative_to(source_assets).as_posix()
        mapping[rel.casefold()] = data_uri
    return mapping


def patch_removed_backgrounds(text_path: Path, text: str) -> tuple[str, int]:
    changed = 0
    if text_path.name == "background.js":
        pattern = re.compile(r"for \(var i = 1; i <= 8; i\+\+\) \{\s*frames\[i\] = \[[\s\S]*?\n\s*\];\s*\}")
        replacement = "for (var i = 1; i <= 8; i++) frames[i] = ['assets/xhs-background-placeholder.svg'];"
        text, n = pattern.subn(replacement, text, count=1)
        if n != 1:
            raise SystemExit("Could not remove the era background frame list")
        changed += n
    if text_path.name == "render.js":
        drift_old = "src=\"assets/backgrounds/sequence/era-10/drift-terra/' + frameFiles[i] + '\""
        drift_new = 'src="assets/xhs-background-placeholder.svg"'
        if drift_old not in text:
            raise SystemExit("Could not remove the drift-terra finale background sequence")
        text = text.replace(drift_old, drift_new, 1)
        changed += 1

        ending_old = "src=\"' + story.root + '/' + fileNames[i] + '\" alt=\""
        ending_new = 'src="assets/xhs-background-placeholder.svg" alt="'
        if ending_old not in text:
            raise SystemExit("Could not remove the Dyson finale background sequence")
        text = text.replace(ending_old, ending_new, 1)
        changed += 1
        for dead_root in (
            "        root: 'assets/backgrounds/sequence/era-10/ascend-void',\n",
            "        root: 'assets/backgrounds/sequence/era-10',\n",
        ):
            if dead_root not in text:
                raise SystemExit("Could not remove an unused background root")
            text = text.replace(dead_root, "", 1)
            changed += 1
    return text, changed


def pack_assets() -> dict[str, Any]:
    source_assets = SOURCE / "assets"
    output_assets = PACKAGE / "assets"
    output_assets.mkdir(parents=True, exist_ok=True)
    dynamic_count = svg_count = font_count = 0
    static_rasters: list[Path] = []

    for path in sorted(source_assets.rglob("*")):
        if not path.is_file() or path.is_symlink():
            continue
        rel = path.relative_to(source_assets)
        if any(part.startswith(".") or part == "__MACOSX" for part in rel.parts):
            continue
        suffix = path.suffix.lower()
        category = rel.parts[0].casefold() if len(rel.parts) > 1 else "root"
        if category == "backgrounds":
            continue
        if suffix in {".webp", ".png", ".jpg", ".jpeg", ".gif"}:
            if category in DYNAMIC_RASTER_ROOTS:
                destination = output_assets / rel
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, destination)
                dynamic_count += 1
            else:
                static_rasters.append(path)
        else:
            destination = output_assets / rel
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, destination)
            if suffix == ".svg":
                svg_count += 1
            elif suffix in {".woff", ".woff2"}:
                font_count += 1

    mapping = embed_static_rasters(static_rasters, source_assets)
    placeholder = output_assets / "xhs-background-placeholder.svg"
    placeholder.write_text(TRANSPARENT_SVG, encoding="utf-8")

    text_files = [PACKAGE / "index.html", *PACKAGE.rglob("*.js"), *PACKAGE.rglob("*.css"), *PACKAGE.rglob("*.json")]
    ref_count = 0
    background_patches = 0
    for text_path in text_files:
        original = text_path.read_text(encoding="utf-8")
        original, bg_changed = patch_removed_backgrounds(text_path, original)
        background_patches += bg_changed
        original = re.sub(
            r"(?P<prefix>(?:\.\./|\./|/)?assets/)backgrounds/[A-Za-z0-9_./\-\u0080-\uffff]+\.(?:png|jpe?g|webp|gif|svg)(?P<query>\?[^\"')\s]*)?",
            lambda m: m.group("prefix") + "xhs-background-placeholder.svg" + (m.group("query") or ""),
            original,
            flags=re.IGNORECASE,
        )

        def replace_ref(match: re.Match[str]) -> str:
            nonlocal ref_count
            rel = match.group("path").replace("\\", "/")
            lower = rel.casefold()
            if lower not in mapping:
                return match.group(0)
            ref_count += 1
            return mapping[lower]

        updated = ASSET_REFERENCE.sub(replace_ref, original)
        if updated != text_path.read_text(encoding="utf-8"):
            text_path.write_text(updated, encoding="utf-8", newline="")

    unresolved: list[str] = []
    for text_path in text_files:
        text = text_path.read_text(encoding="utf-8", errors="ignore")
        for match in ASSET_REFERENCE.finditer(text):
            rel = match.group("path").replace("\\", "/")
            target = PACKAGE / "assets" / rel
            if not target.is_file():
                unresolved.append(f"{text_path.relative_to(PACKAGE).as_posix()}: {match.group(0)}")

    return {
        "sourceRasterFiles": len(static_rasters) + dynamic_count,
        "staticRasterFilesEmbedded": len(static_rasters),
        "dynamicRasterFilesKept": dynamic_count,
        "sourceSvgFilesKept": svg_count,
        "fontFilesKept": font_count,
        "staticReferencesRewritten": ref_count,
        "backgroundSequencesRemoved": background_patches,
        "unresolvedAssetReferences": unresolved,
    }


def patch_xhs_save_io() -> dict[str, int]:
    path = PACKAGE / "src" / "save-transfer.js"
    text = path.read_text(encoding="utf-8")

    text, download_helper = re.subn(r"  function downloadFile\(name, contents\) \{[\s\S]*?\n  \}\n", "", text, count=1)
    if download_helper != 1:
        raise SystemExit("Could not remove the unsupported file-download helper")

    copy_diag = (
        "  function copyDiag() {\n"
        "    var text = diagnosticsText();\n"
        "    var box = document.getElementById('saveDiagBox');\n"
        "    if (box) { box.value = text; box.focus(); try { box.select(); } catch (e) {} try { box.scrollTop = 0; } catch (e) {} }\n"
        "    setStatus(tr('save.diag.manual_copy', null, '上面文本框里已生成诊断信息，请手动复制。'));\n"
        "  }"
    )
    text, copy_diag_count = re.subn(r"  function copyDiag\(\) \{[\s\S]*?\n  \}", lambda _m: copy_diag, text, count=1)
    if copy_diag_count != 1:
        raise SystemExit("Could not adapt diagnostics copy to manual text selection")

    export_code = (
        "  function exportCode() {\n"
        "    var bundle;\n"
        "    try { bundle = exportBundle(); } catch (e) { setStatus(tr('save.export.code.failed', { error: e.message || e }, '生成存档码失败：{error}'), true); return; }\n"
        "    setBusy(true); setStatus(tr('save.export.code.progress', null, '正在压缩并生成存档码…'));\n"
        "    encodeSaveCode(bundle).then(function (code) {\n"
        "      var box = document.getElementById('saveCodeBox');\n"
        "      if (box) { box.value = code; box.focus(); box.select(); }\n"
        "      setStatus(tr(bundle.recovery ? 'save.export.recovery_code.manual_copy' : 'save.export.code.manual_copy', null,\n"
        "        bundle.recovery ? '原始存档救援码已生成；请手动复制文本框内容。' : '存档码已生成；请手动复制文本框内容。'));\n"
        "    }).catch(function (e) { setStatus(tr('save.export.code.failed', { error: e.message || e }, '生成存档码失败：{error}'), true); })\n"
        "      .then(function () { setBusy(false); });\n"
        "  }"
    )
    text, export_code_count = re.subn(r"  function exportCode\(\) \{[\s\S]*?\n  \}", lambda _m: export_code, text, count=1)
    if export_code_count != 1:
        raise SystemExit("Could not adapt save-code export to manual text selection")

    export_emergency = (
        "  function exportEmergency() {\n"
        "    var em = null;\n"
        "    try { em = SB.store && SB.store.emergencyLoad ? SB.store.emergencyLoad() : null; } catch (e) {}\n"
        "    if (!em) { setStatus(tr('save.export.no_emergency_copy', null, '没有可导出的旧档副本。'), true); return; }\n"
        "    try {\n"
        "      var raw = { meta: em.meta === undefined ? null : em.meta, run: em.run === undefined ? null : em.run, metaBackup: null, runBackup: null };\n"
        "      var bundle = { format: FORMAT, version: FORMAT_VERSION, createdAt: Date.now(), recovery: true, raw: raw, checksum: crc32(JSON.stringify(raw)) };\n"
        "      setBusy(true); encodeSaveCode(bundle).then(function (code) {\n"
        "        var box = document.getElementById('saveCodeBox');\n"
        "        if (box) { box.value = code; box.focus(); box.select(); }\n"
        "        setStatus(tr('save.export.recovery_code.manual_copy', null, '原始存档救援码已生成；请手动复制文本框内容。'));\n"
        "      }).catch(function (e) { setStatus(tr('save.export.emergency.failed', { error: e.message || e }, '导出旧档副本失败：{error}'), true); })\n"
        "        .then(function () { setBusy(false); });\n"
        "    } catch (e) { setStatus(tr('save.export.emergency.failed', { error: e.message || e }, '导出旧档副本失败：{error}'), true); }\n"
        "  }"
    )
    text, export_emergency_count = re.subn(r"  function exportEmergency\(\) \{[\s\S]*?\n  \}", lambda _m: export_emergency, text, count=1)
    if export_emergency_count != 1:
        raise SystemExit("Could not adapt emergency-save export to a recovery code")

    text, export_file_function = re.subn(r"  function exportFile\(\) \{[\s\S]*?\n  \}\n", "", text, count=1)
    if export_file_function != 1:
        raise SystemExit("Could not remove the unsupported file-export function")

    text, export_file_button = re.subn(
        r"\s*'<button type=\"button\" class=\"btn\" data-save-action=\"export-file\">' \+ tr\('save\.export\.file\.action',[\s\S]*?\+\s*\n",
        "\n",
        text,
        count=1,
    )
    if export_file_button != 1:
        raise SystemExit("Could not remove the unsupported file-export button")
    text = text.replace("if (action === 'export-file') return exportFile();", "if (action === 'export-file') return exportCode();", 1)
    path.write_text(text, encoding="utf-8", newline="")

    if any(token in text for token in ("navigator.clipboard", "a.download", "createObjectURL", "downloadFile(")):
        raise SystemExit("Unsupported clipboard or download behavior remains in save-transfer.js")
    return {
        "downloadHelperRemoved": download_helper,
        "manualCopyAdapters": copy_diag_count + export_code_count + export_emergency_count,
        "fileExportFunctionsRemoved": export_file_function,
        "fileExportButtonsRemoved": export_file_button,
    }


def build_zip(test_unlock_star_map: bool = False) -> dict[str, Any]:
    if not SOURCE.is_dir() or not (SOURCE / "index.html").is_file():
        raise SystemExit("Run scripts/stage_xhs_build.py first")
    check_inside(PACKAGE, DIST)
    check_inside(ARCHIVE, DIST)
    check_inside(REPORT, DIST)
    reset_dir(PACKAGE)

    for item in ("index.html", "src", "css"):
        src = SOURCE / item
        dst = PACKAGE / item
        if src.is_dir():
            def ignore(directory: str, names: list[str]) -> set[str]:
                base = Path(directory)
                ignored = {name for name in names if name.startswith(".") or name == "__MACOSX" or (base / name).is_symlink()}
                if Path(directory).resolve() == (SOURCE / "src").resolve():
                    ignored.add("ai-player.js")
                if Path(directory).resolve() == (SOURCE / "src" / "ui").resolve():
                    ignored.add("star-map-frame.html")
                return ignored
            shutil.copytree(src, dst, ignore=ignore)
        else:
            shutil.copy2(src, dst)

    star_map = build_native_star_map()
    test_star_map = enable_test_only_star_map_unlock() if test_unlock_star_map else {"enabled": False}
    save_io = patch_xhs_save_io()
    assets = pack_assets()
    file_list = sorted(path for path in PACKAGE.rglob("*") if path.is_file())
    bad_types = [path.relative_to(PACKAGE).as_posix() for path in file_list if path.suffix.lower() not in SUPPORTED_SUFFIXES]
    html_files = [path.relative_to(PACKAGE).as_posix() for path in file_list if path.suffix.lower() == ".html"]
    html_text = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in PACKAGE.rglob("*.html"))
    html_inline_scripts = len(re.findall(r"<script\b(?![^>]*\bsrc=)[^>]*>", html_text, flags=re.IGNORECASE))
    html_inline_handlers = len(re.findall(r"\son[a-z]+\s*=", html_text, flags=re.IGNORECASE))
    html_blocked_tags = bool(re.search(r"<\s*(?:iframe|object)\b", html_text, flags=re.IGNORECASE))

    if ARCHIVE.exists():
        ARCHIVE.unlink()
    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in file_list:
            archive.write(path, path.relative_to(PACKAGE).as_posix())
    with zipfile.ZipFile(ARCHIVE) as archive:
        bad_member = archive.testzip()
        names = archive.namelist()
        unsafe = [name for name in names if name.startswith(("/", "\\")) or ".." in Path(name).parts]

    report = {
        "packageRoot": str(PACKAGE),
        "archive": str(ARCHIVE),
        "zipBytes": ARCHIVE.stat().st_size,
        "zipMiB": round(ARCHIVE.stat().st_size / (1024 * 1024), 3),
        "fileCount": len(file_list),
        "zipEntryCount": len(names),
        "htmlFiles": html_files,
        "badFileTypes": bad_types,
        "inlineScriptsInHtml": html_inline_scripts,
        "inlineHandlersInHtml": html_inline_handlers,
        "iframeOrObjectInHtml": html_blocked_tags,
        "unsafeZipPaths": unsafe,
        "zipIntegrityError": bad_member,
        "nativeStarMap": star_map,
        "testOnlyStarMapUnlock": test_star_map,
        "xhsSaveIo": save_io,
        "assets": assets,
        "rasterEncoding": {"format": "WebP", "quality": STATIC_IMAGE_QUALITY, "alphaQuality": STATIC_IMAGE_ALPHA_QUALITY, "embedding": "individual-data-uri"},
        "visualScope": "Static XHS raster artwork embedded as individually cropped WebP data URIs; backgrounds and BGM remain excluded per the agreed XHS asset branch. The star-map view, controls, game-state bridge, and building panel are mounted in the single-page document.",
    }
    failures: list[str] = []
    if len(file_list) > MAX_FILES:
        failures.append("file-count-over-200")
    if ARCHIVE.stat().st_size > MAX_ZIP_BYTES:
        failures.append("zip-over-10MiB")
    if html_files != ["index.html"]:
        failures.append("entry-html-count-or-location")
    if bad_types or html_inline_scripts or html_inline_handlers or html_blocked_tags or unsafe or bad_member:
        failures.append("package-integrity-or-container-rule")
    if assets["unresolvedAssetReferences"]:
        failures.append("unresolved-assets")
    report["status"] = ("test-preview-ready" if test_unlock_star_map else "release-candidate-ready") if not failures else "failed"
    report["failures"] = failures
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if failures:
        raise SystemExit("XHS release package failed: " + ", ".join(failures))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build the XHS mini-tool package.")
    parser.add_argument(
        "--test-unlock-star-map",
        action="store_true",
        help="Build an isolated test-preview package with the Star Map open from the first run.",
    )
    parser.add_argument(
        "--tag",
        default=None,
        help="Output tag to keep rebuilt archives and reports separate from earlier artifacts.",
    )
    args = parser.parse_args()
    tag = args.tag or ("r4" if args.test_unlock_star_map else "r3")
    if not re.fullmatch(r"[A-Za-z0-9_-]+", tag):
        parser.error("--tag may contain only letters, digits, underscores, and hyphens")
    if args.test_unlock_star_map:
        PACKAGE = DIST / f"package-preview-star-map-{tag}"
        ARCHIVE = DIST / f"shellbreak-xhs-star-map-test-{tag}.zip"
        REPORT = DIST / f"xhs-star-map-test-report-{tag}.json"
    else:
        PACKAGE = DIST / f"package-release-{tag}"
        ARCHIVE = DIST / f"shellbreak-xhs-release-{tag}.zip"
        REPORT = DIST / f"xhs-release-report-{tag}.json"
    build_zip(test_unlock_star_map=args.test_unlock_star_map)
