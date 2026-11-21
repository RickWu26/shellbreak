#!/usr/bin/env python3
"""Create the isolated WebP-only raster asset set for the Xiaohongshu build."""

from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

from PIL import Image, ImageFile, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets"
DEST = ROOT / "dist" / "xiaohongshu" / "assets"
STAGE = ROOT / "dist" / "xiaohongshu" / "assets.xhs-stage"
RASTER = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff"}
EXCLUDED_TOP_LEVEL = {"store", "backgrounds", "audio"}
EXCLUDED_FILES = {"wonder-crustplate-v2.png", "Ma_Shan_Zheng_FaithTenets.ttf"}
QUALITY = 78
MAX_EDGE = 512


def main() -> None:
    if not SOURCE.is_dir():
        raise SystemExit(f"Source asset directory not found: {SOURCE}")

    DEST.parent.mkdir(parents=True, exist_ok=True)
    if STAGE.exists():
        shutil.rmtree(STAGE)
    STAGE.mkdir(parents=True)

    ImageFile.LOAD_TRUNCATED_IMAGES = True
    converted: list[dict[str, object]] = []
    copied: list[dict[str, object]] = []
    excluded: list[str] = []
    destinations: set[str] = set()

    for source in sorted(SOURCE.rglob("*")):
        if not source.is_file():
            continue
        rel = source.relative_to(SOURCE)
        if source.is_symlink() or any(part.startswith(".") for part in rel.parts) or source.name.lower() == ".ds_store":
            excluded.append(rel.as_posix())
            continue
        if rel.parts[0] in EXCLUDED_TOP_LEVEL or source.name in EXCLUDED_FILES:
            excluded.append(rel.as_posix())
            continue
        if source.suffix.lower() in {".md", ".txt"} or source.name.lower() in {".ds_store"}:
            excluded.append(rel.as_posix())
            continue

        is_raster = source.suffix.lower() in RASTER
        rel_out = rel.with_suffix(".webp") if is_raster else rel
        rel_key = rel_out.as_posix().casefold()
        if rel_key in destinations:
            raise SystemExit(f"Output path collision while converting assets: {rel_out}")
        destinations.add(rel_key)
        target = STAGE / rel_out
        target.parent.mkdir(parents=True, exist_ok=True)

        if is_raster:
            try:
                with Image.open(source) as opened:
                    image = ImageOps.exif_transpose(opened)
                    if getattr(image, "n_frames", 1) > 1:
                        image.seek(0)
                    if max(image.size) > MAX_EDGE:
                        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
                    if "A" in image.getbands():
                        image = image.convert("RGBA")
                    else:
                        image = image.convert("RGB")
                    image.save(target, "WEBP", quality=QUALITY, method=6)
            except Exception as error:
                raise SystemExit(f"Failed to convert {rel.as_posix()}: {error}") from error
            converted.append({
                "source": rel.as_posix(),
                "output": rel_out.as_posix(),
                "sourceBytes": source.stat().st_size,
                "outputBytes": target.stat().st_size,
                "width": image.width,
                "height": image.height,
            })
        else:
            shutil.copy2(source, target)
            copied.append({"path": rel.as_posix(), "bytes": target.stat().st_size})

    manifest = {
        "source": "assets/",
        "output": "dist/xiaohongshu/assets/",
        "excludedTopLevel": sorted(EXCLUDED_TOP_LEVEL),
        "excludedFiles": sorted(EXCLUDED_FILES),
        "rasterFormat": "WebP",
        "quality": QUALITY,
        "maxEdge": MAX_EDGE,
        "converted": converted,
        "copied": copied,
        "excluded": excluded,
    }
    if DEST.exists():
        shutil.rmtree(DEST)
    os.replace(STAGE, DEST)

    manifest_path = DEST.parent / "xhs-assets-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    total = sum(path.stat().st_size for path in DEST.rglob("*") if path.is_file())
    source_raster = sum(int(row["sourceBytes"]) for row in converted)
    output_raster = sum(int(row["outputBytes"]) for row in converted)
    print(f"Converted raster files: {len(converted)}")
    print(f"Copied vector/font/data files: {len(copied)}")
    print(f"Excluded files: {len(excluded)}")
    print(f"Raster size: {source_raster / 1048576:.2f} MiB -> {output_raster / 1048576:.2f} MiB")
    print(f"XHS asset tree: {total / 1048576:.2f} MiB")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
