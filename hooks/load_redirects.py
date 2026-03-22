"""MkDocs hook: generate HTML meta-refresh redirect pages from redirect_mapping.json."""

import json
import logging
import os
from pathlib import Path
from urllib.parse import quote

log = logging.getLogger("mkdocs.hooks.load_redirects")

MAPPING_FILE = "scripts/redirect_mapping.json"

REDIRECT_TEMPLATE = """\
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url={url}">
  <meta name="robots" content="noindex">
  <link rel="canonical" href="{full_url}">
  <title>Redirecting</title>
</head>
<body>
  <p>Redirecting to <a href="{url}">{url}</a></p>
</body>
</html>
"""


def _md_to_dir(md_path: str) -> str:
    """Convert docs-relative .md path to directory path (for filesystem)."""
    if md_path.endswith(".md"):
        md_path = md_path[:-3]
    if md_path.endswith("/index"):
        md_path = md_path[:-6]
    return md_path


def _md_to_url(md_path: str) -> str:
    """Convert docs-relative .md path to URL path (percent-encoded)."""
    dir_path = _md_to_dir(md_path)
    parts = dir_path.split("/")
    return "/".join(quote(p, safe="") for p in parts) + "/"


def on_post_build(config, **kwargs):
    mapping_path = Path(config["config_file_path"]).parent / MAPPING_FILE
    if not mapping_path.is_file():
        log.warning("Redirect mapping not found: %s", mapping_path)
        return

    with open(mapping_path, encoding="utf-8") as f:
        mapping = json.load(f)

    site_dir = Path(config["site_dir"])
    site_url = config.get("site_url", "").rstrip("/")
    count = 0

    for old_md, new_md in mapping.items():
        # Filesystem path: use raw directory name (no encoding)
        old_dir = _md_to_dir(old_md)
        out_file = site_dir / old_dir / "index.html"

        # Skip if the target already exists (real page was built there)
        if out_file.exists():
            continue

        # Skip if path would be too long for filesystem
        try:
            out_file.parent.mkdir(parents=True, exist_ok=True)
        except OSError:
            log.warning("Skipping redirect (path too long): %s", old_md)
            continue

        # URL for the redirect target
        new_url = _md_to_url(new_md)
        relative_target = "/" + new_url
        full_url = f"{site_url}/{new_url}" if site_url else relative_target

        redirect_html = REDIRECT_TEMPLATE.format(url=relative_target, full_url=full_url)

        out_file.write_text(redirect_html, encoding="utf-8")
        count += 1

        # Also generate a .md literal file for URLs like /path/file.md
        # Google sometimes crawls these directly
        if old_md.endswith(".md") and not old_md.endswith("index.md"):
            md_literal = site_dir / old_md
            if not md_literal.exists():
                try:
                    md_literal.parent.mkdir(parents=True, exist_ok=True)
                    md_literal.write_text(redirect_html, encoding="utf-8")
                except OSError:
                    pass

    log.info("Created %d redirect pages (%d skipped)", count, len(mapping) - count)
