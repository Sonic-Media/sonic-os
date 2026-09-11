#!/usr/bin/env python3
"""Convert certification markdown to .docx using python-docx."""
from __future__ import annotations

import re
import sys
from pathlib import Path

from docx import Document
from docx.shared import Pt


def add_markdown_content(doc: Document, text: str) -> None:
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("# "):
            doc.add_heading(stripped[2:], level=1)
        elif stripped.startswith("## "):
            doc.add_heading(stripped[3:], level=2)
        elif stripped.startswith("### "):
            doc.add_heading(stripped[4:], level=3)
        elif stripped.startswith("| ") and "|" in stripped[1:]:
            # Table rows rendered as monospace paragraphs
            p = doc.add_paragraph(stripped)
            p.style = "Intense Quote"
        elif stripped.startswith("- "):
            doc.add_paragraph(stripped[2:], style="List Bullet")
        elif stripped.startswith("**") and stripped.endswith("**"):
            p = doc.add_paragraph()
            run = p.add_run(stripped.strip("*"))
            run.bold = True
        else:
            doc.add_paragraph(stripped)


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: generate-cert-docx.py input.md output.docx")
        sys.exit(1)

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    text = src.read_text(encoding="utf-8")

    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    add_markdown_content(doc, text)
    doc.save(str(dst))
    print(f"Wrote {dst}")


if __name__ == "__main__":
    main()
