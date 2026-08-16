#!/usr/bin/env python3
"""
PDF Diagram & Chemical Reaction Cropper for VigyanPrep
Extracts embedded diagrams, reaction schemes, graphs, and circuit vector drawings from exam PDFs.
Saves cropped PNGs into public uploads directory and returns URLs for Question Studio & CBT Test Portal.

Production-grade:
- Absolute path resolution (not CWD-dependent)
- Up to 12 diagrams per page
- Aspect ratio filtering (rejects thin horizontal/vertical lines)
- Robust error handling per page
"""

import sys
import os
import json
import uuid
import re
from typing import List, Dict, Any

# Resolve upload dir relative to the API project root (2 levels up from this script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))


def get_upload_dir() -> str:
    """Returns absolute path to uploads/questions directory, creating it if needed."""
    target = os.path.join(PROJECT_ROOT, "public", "uploads", "questions")
    os.makedirs(target, exist_ok=True)
    return target


def is_meaningful_rect(rect, page_width: float, page_height: float) -> bool:
    """
    Filters out trivial drawings: thin lines, full-page borders, tiny icons.
    Returns True only for diagram-sized rectangles.
    """
    width = rect.x1 - rect.x0
    height = rect.y1 - rect.y0
    area = width * height

    # Too small (icons, dots, bullets)
    if width < 40 or height < 25 or area < 2000:
        return False

    # Too thin (horizontal rules, underlines, vertical bars)
    aspect = width / max(height, 1)
    if aspect > 15 or aspect < 0.07:
        return False

    # Full-page or near-full-page border boxes
    if width > page_width * 0.9 and height > page_height * 0.85:
        return False

    return True


def merge_overlapping_rects(rects, margin: float = 10.0):
    """Merges overlapping or nearby rectangles into unified bounding boxes."""
    import fitz
    if not rects:
        return []

    merged = [rects[0]]
    for rect in rects[1:]:
        found_overlap = False
        for i, m in enumerate(merged):
            # Expand both by margin to catch nearby drawings
            expanded_m = fitz.Rect(m.x0 - margin, m.y0 - margin, m.x1 + margin, m.y1 + margin)
            if rect.intersects(expanded_m):
                merged[i] = m | rect  # Union
                found_overlap = True
                break
        if not found_overlap:
            merged.append(rect)

    return merged


def crop_and_extract_diagrams(pdf_path: str) -> Dict[str, Any]:
    """
    Scans each PDF page using PyMuPDF (fitz) to detect and crop:
    1. Embedded raster images (biology photos, graphs, scanned diagrams).
    2. Vector drawings (chemical reaction arrows, benzene rings, circuits, curves).
    Returns a map of page-level diagram URLs.
    """
    upload_dir = get_upload_dir()
    diagram_map: Dict[int, List[Dict[str, str]]] = {}
    total_images_extracted = 0

    try:
        import fitz
    except ImportError:
        return {"success": True, "totalImages": 0, "diagramMap": {}}

    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"[Warning] Cannot open PDF for diagram extraction: {e}", file=sys.stderr)
        return {"success": True, "totalImages": 0, "diagramMap": {}}

    for page_idx in range(len(doc)):
        page_num = page_idx + 1
        diagram_map[page_num] = []

        try:
            page = doc[page_idx]
            pw, ph = page.rect.width, page.rect.height

            # --- 1. Extract raster images ---
            image_list = page.get_images(full=True)
            for img_idx, img_info in enumerate(image_list):
                try:
                    xref = img_info[0]
                    base_img = doc.extract_image(xref)
                    image_bytes = base_img["image"]
                    image_ext = base_img.get("ext", "png")

                    # Skip tiny icons (< 3KB) and enormous full-page scans (> 2MB)
                    if len(image_bytes) < 3000 or len(image_bytes) > 2_000_000:
                        continue

                    filename = f"diag_p{page_num}_img{img_idx}_{uuid.uuid4().hex[:8]}.{image_ext}"
                    filepath = os.path.join(upload_dir, filename)
                    with open(filepath, "wb") as f:
                        f.write(image_bytes)

                    diagram_map[page_num].append({
                        "type": "raster",
                        "url": f"/uploads/questions/{filename}",
                        "filename": filename
                    })
                    total_images_extracted += 1
                except Exception:
                    continue

            # --- 2. Extract vector drawings ---
            try:
                drawings = page.get_drawings()
            except Exception:
                drawings = []

            if drawings:
                significant_rects = []
                for d in drawings:
                    r = d.get("rect")
                    if r and is_meaningful_rect(r, pw, ph):
                        import fitz as fitz_mod
                        expanded = fitz_mod.Rect(
                            max(0, r.x0 - 5),
                            max(0, r.y0 - 5),
                            min(pw, r.x1 + 5),
                            min(ph, r.y1 + 5)
                        )
                        significant_rects.append(expanded)

                merged = merge_overlapping_rects(significant_rects)

                # Render up to 12 merged diagram areas at 200 DPI
                for d_idx, m_rect in enumerate(merged[:12]):
                    w = m_rect.x1 - m_rect.x0
                    h = m_rect.y1 - m_rect.y0
                    if w >= 50 and h >= 30:
                        try:
                            pix = page.get_pixmap(clip=m_rect, dpi=200)
                            filename = f"vec_p{page_num}_{d_idx}_{uuid.uuid4().hex[:8]}.png"
                            filepath = os.path.join(upload_dir, filename)
                            pix.save(filepath)

                            diagram_map[page_num].append({
                                "type": "vector_drawing",
                                "url": f"/uploads/questions/{filename}",
                                "filename": filename
                            })
                            total_images_extracted += 1
                        except Exception:
                            continue

        except Exception as e:
            print(f"[Warning] Diagram extraction error on page {page_num}: {e}", file=sys.stderr)
            continue

    doc.close()

    return {
        "success": True,
        "totalImages": total_images_extracted,
        "diagramMap": diagram_map
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No PDF path provided"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(json.dumps({"success": False, "error": f"File not found: {pdf_path}"}))
        sys.exit(1)

    result = crop_and_extract_diagrams(pdf_path)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
