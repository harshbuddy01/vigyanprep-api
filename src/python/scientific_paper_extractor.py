#!/usr/bin/env python3
"""
Scientific Paper & Mathematical Formula Extractor for VigyanPrep (IISER IAT, NISER NEST, ISI, CMI)
Extracts questions, LaTeX math formulas, matrices, square roots, and chemical species with token-level isolation.
"""

import sys
import json
import os
import re
from typing import List, Dict, Any, Optional

def extract_raw_text_and_tables(pdf_path: str) -> str:
    """Extracts text preserving layout using pdfplumber, PyMuPDF, or PyPDF2."""
    full_text = ""

    # 1. Try PyMuPDF (fitz) first
    try:
        import fitz
        doc = fitz.open(pdf_path)
        for page in doc:
            full_text += page.get_text("text") + "\n"
        if len(full_text.strip()) > 100:
            return full_text
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
            return full_text
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

    return full_text

def format_chemical_token(token: str) -> str:
    """Converts raw chemical strings like NH+ 4, BH- 4, NO+ 2, N2O, O3, SO4 2- into clean LaTeX $...$."""
    t = token.strip()
    if not t:
        return ""

    # 1. Species with inverted charge & subscript: NH+ 4 -> $NH_4^+$, BH- 4 -> $BH_4^-$, NO+ 2 -> $NO_2^+$
    t = re.sub(r'\b([A-Z][a-z]?H?)\s*([\+\-])\s*(\d+)\b', r'$\1_{\3}^{\2}$', t)

    # 2. Standard polyatomic / molecular ions: NH4+, NH4 -, SO4 2-, NO3 -, H3O +, O2 -, N2 2+
    t = re.sub(r'\b([A-Z][a-z]?H?)\s*(\d+)\s*\^?\s*(\d*)([\+\-])\b', r'$\1_{\2}^{\3\4}$', t)
    t = re.sub(r'\b([A-Z][a-z]?H?)\s*(\d+)([\+\-])\b', r'$\1_{\2}^{\3}$', t)
    t = re.sub(r'\b([A-Z][a-z]?H?)\s*(\d*)([\+\-])\b', r'$\1^{\2\3}$', t)

    # 3. Coordination complexes: [Fe(CN)6]4- -> $[Fe(CN)_6]^{4-}$
    t = re.sub(r'\[([A-Za-z0-9\(\)]+)\]\s*(\d+)?([\+\-])', r'$[\1]^{\2\3}$', t)

    # 4. Multi-element molecules: N2O, NO2, H2O, CO2, NH3, H2SO4, C6H12O6, O3
    # Look for elemental sequence with numbers
    def repl_mol(m):
        raw_mol = m.group(0)
        # Subscript all numbers in chemical formulas
        subscripted = re.sub(r'([A-Za-z])(\d+)', r'\1_{\2}', raw_mol)
        return f"${subscripted}$"

    t = re.sub(r'\b([A-Z][a-z]?\d+[A-Z][a-z]?\d*|[A-Z][a-z]?\d+)\b', repl_mol, t)

    return t

def sanitize_scientific_math_and_chem(text: str) -> str:
    """High-precision conversion of math, chemical formulas, square roots, and matrices with token isolation."""
    if not text:
        return ""

    s = text

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

    # 3. Chemical formulas & ions conversion (token by token)
    # NH+ 4 and BH- 4 -> $NH_4^+$ and $BH_4^-$
    s = re.sub(r'\b([A-Z][a-z]?H?)\s*([\+\-])\s*(\d+)\b', r'$\1_{\3}^{\2}$', s)
    s = re.sub(r'\b([A-Z][a-z]?H?)\s*(\d+)\s*\^?\s*(\d*)([\+\-])\b', r'$\1_{\2}^{\3\4}$', s)
    s = re.sub(r'\b([A-Z][a-z]?H?)\s*(\d+)([\+\-])\b', r'$\1_{\2}^{\3}$', s)
    s = re.sub(r'\[([A-Za-z0-9\(\)]+)\]\s*(\d+)?([\+\-])', r'$[\1]^{\2\3}$', s)

    # Subscript common molecules without swallowing connectors like "and", "or"
    chem_tokens = r'\b(N2O|NO2|NO3|H2O|CO2|SO2|SO3|SO4|NH3|NH4|BH4|H3O|CH4|C2H6|C6H6|C6H12O6|H2SO4|HNO3|HCl|NaOH|KOH|KMnO4|O3|O2|N2|H2|Cl2|Br2|I2|F2)\b'
    def repl_chem(m):
        raw = m.group(1)
        sub = re.sub(r'([A-Za-z])(\d+)', r'\1_{\2}', raw)
        return f"${sub}$"
    s = re.sub(chem_tokens, repl_chem, s)

    # 4. Powers & Scientific Notation: 3 x 10^8 -> $3 \times 10^8$
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

    # Clean double dollar signs: $$...$$ -> $...$ unless block
    s = re.sub(r'\${2,}', '$', s)
    # Fix adjacent tokens: $O_3$$NO_2$ -> $O_3$ $NO_2$
    s = re.sub(r'\$\$', '$ $', s)

    return re.sub(r'\s+', ' ', s).strip()

def detect_section_header(line: str) -> Optional[str]:
    """Detects Physics, Chemistry, Mathematics, or Biology section headers across NEST & IAT."""
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
    """Splits raw extracted text into clean, balanced question objects."""
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    questions = []
    current_q = None
    current_section = 'Biology' # Default starting section for NEST, or Physics for IAT
    seen_q_in_section = set()

    q_start_patterns = [
        re.compile(r'^(?:Q(?:uestion)?\.?\s*)(\d{1,3})[.):\s]+(\S.*)', re.IGNORECASE),
        re.compile(r'^(\d{1,3})[.)]\s+(\S.*)'),
    ]

    opt_pattern = re.compile(r'^[\[(]?([A-D])[\])]?[.)\s]\s*(.*)', re.IGNORECASE)
    ans_pattern = re.compile(r'^(?:answer|ans(?:wer)?)[.:\s]+[\[(]?([A-D])[\])]?', re.IGNORECASE)

    def finalize_question():
        nonlocal current_q
        if current_q and current_q.get('text', '').strip():
            # Validate question has meaningful length
            if len(current_q['text'].strip()) < 8 and len(current_q['options']) == 0:
                return # Ignore noise/headers

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
            seen_q_in_section = set()
            continue

        q_num = None
        q_text_start = ""
        for pat in q_start_patterns:
            m = pat.match(line)
            if m:
                potential_num = int(m.group(1))
                # Only accept valid question numbers (1 to 80)
                if 1 <= potential_num <= 100:
                    q_num = potential_num
                    q_text_start = m.group(2).strip()
                    break

        if q_num is not None:
            # Check if this is a genuine question or an option/table item
            # Genuine question start should not be an option (like A. B. C. D.)
            if not opt_pattern.match(line):
                finalize_question()
                # Section relative numbering
                seen_q_in_section.add(q_num)
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
        raw_text = extract_raw_text_and_tables(pdf_path)
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
            "message": f"🐍 Extracted {len(questions)} questions — Physics: {section_counts['Physics']}, Chemistry: {section_counts['Chemistry']}, Math: {section_counts['Mathematics']}, Biology: {section_counts['Biology']}"
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": f"Python Extraction Failed: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
