#!/usr/bin/env python3
"""
Scientific Paper & Mathematical Formula Extractor for VigyanPrep (IISER IAT, NISER NEST, ISI, CMI)
Features:
1. Bilingual (Hindi + English) Intelligent Stripping (Keeps ONLY pure English questions & options).
2. Token-level isolated LaTeX math, square roots, radicals, and chemical species.
3. Precision NEST & IAT Section Detection & Balanced Renumbering.
"""

import sys
import json
import os
import re
from typing import List, Dict, Any, Optional

def is_devanagari_heavy(text: str, threshold: float = 0.25) -> bool:
    """Returns True if the text contains a significant portion of Hindi/Devanagari characters."""
    if not text:
        return False
    dev_chars = len(re.findall(r'[\u0900-\u097F]', text))
    total_alpha_chars = len(re.findall(r'[a-zA-Z0-9\u0900-\u097F]', text))
    if total_alpha_chars == 0:
        return False
    return (dev_chars / total_alpha_chars) >= threshold

def strip_hindi_and_bilingual_noise(text: str) -> str:
    """Removes all Hindi/Devanagari sentences, translated lines, and duplicate Hindi text."""
    if not text:
        return ""

    lines = text.split('\n')
    filtered_lines = []

    for line in lines:
        raw_l = line.strip()
        if not raw_l:
            continue

        # 1. If line is predominantly Hindi, skip it completely
        if is_devanagari_heavy(raw_l, threshold=0.20):
            continue

        # 2. Skip common Hindi exam section banners
        if re.search(r'(?:भाग\s*[-–—:]*\s*\d|खंड\s*[-–—:]*\s*\d|भौतिक|रसायन|गणित|जीव|प्रश्न\s*संख्या)', raw_l):
            continue

        # 3. Strip any inline Hindi words, matras, and Devanagari punctuation (।, ॥)
        cleaned = re.sub(r'[\u0900-\u097F]+', '', raw_l)
        cleaned = re.sub(r'[।॥]', '', cleaned).strip()

        # Clean duplicate adjacent words caused by side-by-side bilingual numbers (e.g. "5 m/s 5 m/s")
        cleaned = re.sub(r'\b(\S+)\s+\1\b', r'\1', cleaned)

        if cleaned and len(cleaned) > 1:
            filtered_lines.append(cleaned)

    return "\n".join(filtered_lines)

def extract_raw_text_from_pdf(pdf_path: str) -> str:
    """Extracts raw text preserving column layout and applies bilingual cleaning."""
    full_text = ""

    # 1. Try PyMuPDF (fitz)
    try:
        import fitz
        doc = fitz.open(pdf_path)
        for page in doc:
            full_text += page.get_text("text") + "\n"
        if len(full_text.strip()) > 100:
            return strip_hindi_and_bilingual_noise(full_text)
    except Exception:
        pass

    # 2. Try pdfplumber
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf:
                page_text = page.extract_text(layout=True) or page.extract_text()
                if page_text:
                    full_text += page_text + "\n"
        if len(full_text.strip()) > 100:
            return strip_hindi_and_bilingual_noise(full_text)
    except Exception:
        pass

    # 3. Fallback to PyPDF2
    try:
        import PyPDF2
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                txt = page.extract_text()
                if txt:
                    full_text += txt + "\n"
    except Exception:
        pass

    return strip_hindi_and_bilingual_noise(full_text)

def sanitize_scientific_math_and_chem(text: str) -> str:
    """High-precision conversion of math, chemical formulas, square roots, and matrices with token isolation."""
    if not text:
        return ""

    # First clean any residual Hindi / Devanagari script
    s = re.sub(r'[\u0900-\u097F]+', '', text)
    s = re.sub(r'[।॥]', '', s).strip()

    # 1. Normalize Unicode superscripts and subscripts
    sup_map = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-','⁼':'=','⁽':'(','⁾':')'}
    sub_map = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','₊':'+','₋':'-','₌':'=','₍':'(','₎':')'}
    s = re.sub(r'[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+', lambda m: f"^{{{''.join(sup_map.get(c, c) for c in m.group(0))}}}", s)
    s = re.sub(r'[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+', lambda m: f"_{{{''.join(sub_map.get(c, c) for c in m.group(0))}}}", s)

    # 2. Square roots & Radicals: √2, \u221A2, sqrt(2), root 2, √(x^2+y^2)
    s = re.sub(r'(?:\\u221A|√)\s*\((.*?)\)', r' $\\sqrt{\1}$ ', s)
    s = re.sub(r'(?:\\u221A|√)\s*([a-zA-Z0-9]+)', r' $\\sqrt{\1}$ ', s)
    s = re.sub(r'\b(?:sqrt|root)\s*\((.*?)\)', r' $\\sqrt{\1}$ ', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(?:sqrt|root)\s*([a-zA-Z0-9]+)\b', r' $\\sqrt{\1}$ ', s, flags=re.IGNORECASE)

    # 3. Chemical Species, Ions & Coordination Complexes (Token-isolated):
    # NH+ 4 -> $NH_4^+$, BH- 4 -> $BH_4^-$, NO+ 2 -> $NO_2^+$, NH- 2 -> $NH_2^-$
    s = re.sub(r'\b([A-Z][a-zA-Z0-9]*)\s*([\+\-])\s*(\d+)\b', r'$\1_{\3}^{\2}$', s)
    s = re.sub(r'\b([A-Z][a-zA-Z0-9]*)\s*(\d+)\s*\^?\s*(\d*)([\+\-])\b', r'$\1_{\2}^{\3\4}$', s)
    s = re.sub(r'\b([A-Z][a-zA-Z0-9]*)\s*(\d+)([\+\-])\b', r'$\1_{\2}^{\3}$', s)
    s = re.sub(r'\[([A-Za-z0-9\(\)]+)\]\s*(\d+)?([\+\-])', r'$[\1]^{\2\3}$', s)

    # Subscript common molecules without swallowing connectors like "and", "or", "to"
    chem_tokens = r'\b(N2O|NO2|NO3|H2O|CO2|SO2|SO3|SO4|NH3|NH4|BH4|H3O|CH4|C2H6|C6H6|C6H12O6|H2SO4|HNO3|HCl|NaOH|KOH|KMnO4|O3|O2|N2|H2|Cl2|Br2|I2|F2)\b'
    def repl_chem(m):
        raw = m.group(1)
        sub = re.sub(r'([A-Za-z])(\d+)', r'\1_{\2}', raw)
        return f"${sub}$"
    s = re.sub(chem_tokens, repl_chem, s)

    # 4. Powers & Scientific Notation: 3 x 10^8 -> $3 \times 10^8$, 10^-5 -> $10^{-5}$
    s = re.sub(r'(\d+(?:\.\d+)?)\s*[xX\*×]\s*10\s*\^?\s*(-?\d+)', r' $\1 \\times 10^{\2}$ ', s)
    s = re.sub(r'\b10\s*\^\s*(-?\d+)', r' $10^{\1}$ ', s)

    # Single variable powers & subscripts: x^2, x_1
    s = re.sub(r'\b([a-zA-Z])\s*\^\s*([a-zA-Z0-9\-\+]+)\b', r'$\1^{\2}$', s)
    s = re.sub(r'\b([a-zA-Z])\s*_\s*([a-zA-Z0-9\-\+]+)\b', r'$\1_{\2}$', s)

    # 5. Fractions: 1/2 -> $\frac{1}{2}$
    s = re.sub(r'\b(\d+)\s*\/\s*(\d+)\b', r' $\\frac{\1}{\2}$ ', s)

    # 6. Integrals, Vectors, Arrows
    s = re.sub(r'[\u222B\u222C\u222D\u222E]', r' \\int ', s)
    s = re.sub(r'[\u21CC\u21C4]', r' $\\rightleftharpoons$ ', s)
    s = re.sub(r'[\u2192\u27F6]', r' $\\rightarrow$ ', s)
    s = re.sub(r'[\u00B1]', r' $\\pm$ ', s)
    s = re.sub(r'[\u00B0]', r'^{\\circ}', s)

    # Clean double dollar signs and redundant spaces
    s = re.sub(r'\${2,}', '$', s)
    s = re.sub(r'\$\s*\$', '', s)
    s = re.sub(r'\s+', ' ', s).strip()

    return s

def detect_section_header(line: str) -> Optional[str]:
    """Detects Physics, Chemistry, Mathematics, or Biology section banners across NEST, IAT, JEE."""
    if len(line.split()) > 10:
        return None
    u = line.strip().upper()
    if re.search(r'\b(SECTION\s*[-–—:]*\s*\d*\s*[-–—:]*\s*BIOLOGY|PART\s*[-–—:]*\s*\d*\s*[-–—:]*\s*BIOLOGY|\bBIOLOGY\b|\bBIOLOGICAL\b)', u):
        return 'Biology'
    if re.search(r'\b(SECTION\s*[-–—:]*\s*\d*\s*[-–—:]*\s*CHEMISTRY|PART\s*[-–—:]*\s*\d*\s*[-–—:]*\s*CHEMISTRY|\bCHEMISTRY\b|\bCHEMICAL\b)', u):
        return 'Chemistry'
    if re.search(r'\b(SECTION\s*[-–—:]*\s*\d*\s*[-–—:]*\s*MATHEMATICS|PART\s*[-–—:]*\s*\d*\s*[-–—:]*\s*MATHEMATICS|\bMATHEMATICS\b|\bMATHS\b|\bMATH\b)', u):
        return 'Mathematics'
    if re.search(r'\b(SECTION\s*[-–—:]*\s*\d*\s*[-–—:]*\s*PHYSICS|PART\s*[-–—:]*\s*\d*\s*[-–—:]*\s*PHYSICS|\bPHYSICS\b|\bPHYSICAL\b)', u):
        return 'Physics'
    return None

def parse_questions_from_text(raw_text: str) -> List[Dict[str, Any]]:
    """Splits cleaned English text into structured question objects."""
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    questions = []
    current_q = None
    current_section = 'Biology'

    q_start_patterns = [
        re.compile(r'^(?:Q(?:uestion)?\.?\s*)(\d{1,3})[.):\s]+(\S.*)', re.IGNORECASE),
        re.compile(r'^(\d{1,3})[.)]\s+(\S.*)'),
    ]

    opt_pattern = re.compile(r'^[\[(]?([A-D])[\])]?[.)\s]\s*(.*)', re.IGNORECASE)
    ans_pattern = re.compile(r'^(?:answer|ans(?:wer)?)[.:\s]+[\[(]?([A-D])[\])]?', re.IGNORECASE)

    def finalize_question():
        nonlocal current_q
        if current_q and current_q.get('text', '').strip():
            # Validate question text length (ignore table noise)
            if len(current_q['text'].strip()) < 8 and len(current_q['options']) == 0:
                return

            while len(current_q['options']) < 4:
                letters = ['A', 'B', 'C', 'D']
                current_q['options'].append(f"Option {letters[len(current_q['options'])]}")
            
            current_q['options'] = [sanitize_scientific_math_and_chem(o) for o in current_q['options'][:4]]
            current_q['text'] = sanitize_scientific_math_and_chem(current_q['text'])
            current_q['question_text'] = current_q['text']
            questions.append(current_q)
            current_q = None

    for line in lines:
        sec = detect_section_header(line)
        if sec:
            finalize_question()
            current_section = sec
            continue

        q_num = None
        q_text_start = ""
        for pat in q_start_patterns:
            m = pat.match(line)
            if m:
                potential_num = int(m.group(1))
                if 1 <= potential_num <= 100:
                    q_num = potential_num
                    q_text_start = m.group(2).strip()
                    break

        if q_num is not None:
            if not opt_pattern.match(line):
                finalize_question()
                current_q = {
                    'tempId': f"py_{current_section[:3].lower()}_{q_num}_{len(questions) + 1}",
                    'questionNumber': q_num,
                    'question_number': q_num,
                    'section': current_section,
                    'type': 'MCQ',
                    'text': q_text_start,
                    'options': [],
                    'correctAnswer': 'A',
                    'correct_answer': 'A',
                    'imageUrl': '',
                    'status': 'draft_review'
                }
                continue

        if current_q:
            opt_m = opt_pattern.match(line)
            if opt_m:
                opt_letter = opt_m.group(1).upper()
                opt_text = opt_m.group(2).strip()
                if len(current_q['options']) < 4:
                    current_q['options'].append(opt_text if opt_text else f"Option {opt_letter}")
                continue

            ans_m = ans_pattern.match(line)
            if ans_m:
                current_q['correctAnswer'] = ans_m.group(1).upper()
                current_q['correct_answer'] = ans_m.group(1).upper()
                continue

            # Append multi-line question text or option text
            if not current_q['options']:
                current_q['text'] += " " + line
            else:
                current_q['options'][-1] += " " + line

    finalize_question()
    return questions

def balance_and_renumber_sections(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Ensures questions per section are independently renumbered 1..N cleanly."""
    section_counters = {"Physics": 0, "Chemistry": 0, "Mathematics": 0, "Biology": 0}
    balanced = []
    for q in questions:
        sec = q.get('section', 'Physics')
        if sec not in section_counters:
            sec = 'Physics'
            q['section'] = 'Physics'
        section_counters[sec] += 1
        q['questionNumber'] = section_counters[sec]
        q['question_number'] = section_counters[sec]
        balanced.append(q)
    return balanced

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No PDF file path provided"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(json.dumps({"success": False, "error": f"File not found: {pdf_path}"}))
        sys.exit(1)

    try:
        raw_text = extract_raw_text_from_pdf(pdf_path)
        if not raw_text.strip():
            print(json.dumps({"success": False, "error": "Could not extract text from PDF."}))
            sys.exit(1)

        raw_questions = parse_questions_from_text(raw_text)
        questions = balance_and_renumber_sections(raw_questions)

        # Count per section
        section_counts = {"Physics": 0, "Chemistry": 0, "Mathematics": 0, "Biology": 0}
        for q in questions:
            s = q.get('section', 'Physics')
            if s in section_counts:
                section_counts[s] += 1

        result = {
            "success": True,
            "questions": questions,
            "sectionCounts": section_counts,
            "totalQuestions": len(questions),
            "message": f"🐍 Extracted {len(questions)} clean English questions — Physics: {section_counts['Physics']}, Chemistry: {section_counts['Chemistry']}, Math: {section_counts['Mathematics']}, Biology: {section_counts['Biology']}"
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": f"Python Extraction Failed: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
