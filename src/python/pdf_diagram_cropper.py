#!/usr/bin/env python3
"""
Python Scientific Diagram & Chemical Reaction Cropper for VigyanPrep
Extracts embedded diagrams, reaction schemes, graphs, and circuit vector drawings from exam PDFs.
Saves cropped PNGs into public uploads directory and returns URLs for Question Studio & CBT Test Portal.
"""

import sys
import os
import json
import uuid
import re
from typing import List, Dict, Any, Optional

def get_upload_dir() -> str:
    """Returns absolute path to uploads/questions directory."""
    cwd = os.getcwd()
    target = os.path.join(cwd, "public", "uploads", "questions")
    os.makedirs(target, exist_ok=True)
    return target

def crop_and_extract_diagrams(pdf_path: str) -> Dict[str, Any]:
    """
    Scans each PDF page using PyMuPDF (fitz) to detect and crop:
    1. Vector drawings (chemical reaction arrows, benzene rings, circuits, curves).
    2. Embedded raster images (biology cell photos, graphs).
    Returns a map of page-level and question-level diagram URLs.
    """
    upload_dir = get_upload_dir()
    diagram_map = {}
    total_images_extracted = 0

    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)

        for page_idx, page in enumerate(doc):
            page_num = page_idx + 1
            diagram_map[page_num] = []

            # 1. Extract raster images on this page
            image_list = page.get_images(full=True)
            for img_idx, img_info in enumerate(image_list):
                xref = img_info[0]
                base_img = doc.extract_image(xref)
                image_bytes = base_img["image"]
                image_ext = base_img["ext"]

                # Filter out tiny icon images (less than 4KB)
                if len(image_bytes) > 3000:
                    filename = f"diag_p{page_num}_img{img_idx}_{uuid.uuid4().hex[:6]}.{image_ext}"
                    filepath = os.path.join(upload_dir, filename)
                    with open(filepath, "wb") as f:
                        f.write(image_bytes)

                    rel_url = f"/uploads/questions/{filename}"
                    diagram_map[page_num].append({
                        "type": "raster",
                        "url": rel_url,
                        "filename": filename
                    })
                    total_images_extracted += 1

            # 2. Extract vector graphics & chemical reaction drawings
            drawings = page.get_drawings()
            if drawings and len(drawings) > 0:
                # Group vector paths into bounding boxes
                significant_rects = []
                for d in drawings:
                    r = d["rect"]
                    width = r.x1 - r.x0
                    height = r.y1 - r.y0
                    # Only consider meaningful diagrams (> 50px wide and high, not a single divider line)
                    if width >= 50 and height >= 35:
                        # Expand slightly for margin
                        expanded = fitz.Rect(max(0, r.x0 - 5), max(0, r.y0 - 5), min(page.rect.width, r.x1 + 5), min(page.rect.height, r.y1 + 5))
                        significant_rects.append(expanded)

                # Merge overlapping vector rectangles
                merged_rects = []
                for rect in significant_rects:
                    merged = False
                    for i, m in enumerate(merged_rects):
                        if rect.intersects(m):
                            merged_rects[i] = m | rect
                            merged = True
                            break
                    if not merged:
                        merged_rects.append(rect)

                # Render each merged diagram area as high-res 200 DPI PNG
                for d_idx, m_rect in enumerate(merged_rects[:6]):
                    if (m_rect.x1 - m_rect.x0) >= 60 and (m_rect.y1 - m_rect.y0) >= 40:
                        pix = page.get_pixmap(clip=m_rect, dpi=200)
                        filename = f"chem_draw_p{page_num}_{d_idx}_{uuid.uuid4().hex[:6]}.png"
                        filepath = os.path.join(upload_dir, filename)
                        pix.save(filepath)

                        rel_url = f"/uploads/questions/{filename}"
                        diagram_map[page_num].append({
                            "type": "vector_drawing",
                            "url": rel_url,
                            "filename": filename
                        })
                        total_images_extracted += 1

        doc.close()
    except Exception as e:
        print(f"[Warning] Diagram cropping encountered an issue: {e}", file=sys.stderr)

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

    res = crop_and_extract_diagrams(pdf_path)
    print(json.dumps(res))

if __name__ == "__main__":
    main()
