#!/usr/bin/env python3
import sys
import json
import os
from pathlib import Path

try:
    import PyPDF2
    import pdfplumber
except ImportError as e:
    print(json.dumps({"error": f"Missing dependency: {str(e)}"}), file=sys.stderr)
    sys.exit(1)

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using multiple methods"""
    try:
        text = ""
        
        # Method 1: Try pdfplumber first (better for complex PDFs)
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"pdfplumber failed: {e}", file=sys.stderr)
        
        # Method 2: Fallback to PyPDF2 if pdfplumber fails
        if not text.strip():
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        
        return text.strip()
    
    except Exception as e:
        return f"Error extracting text: {str(e)}"

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No PDF path provided"}), file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    # Check if file exists
    if not os.path.exists(pdf_path):
        print(json.dumps({"error": f"File not found: {pdf_path}"}), file=sys.stderr)
        sys.exit(1)
    
    # Extract text
    text = extract_text_from_pdf(pdf_path)
    
    # Return JSON result
    result = {
        "success": True,
        "text": text,
        "file": pdf_path,
        "pages": len(text.split('\n')) if text else 0
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()