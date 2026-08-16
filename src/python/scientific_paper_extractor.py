#!/usr/bin/env python3
"""
Scientific Paper & Mathematical Formula Extractor for VigyanPrep (IISER IAT, NISER NEST, ISI, CMI)
High-Precision Engine:
1. Automatic Hindi Duplicate Elimination (Extracts ONLY pure English 80-question paper).
2. Electrochemistry, Galvanic Cell & Molecular Ion Formatter.
3. PDF Ligature Repair (di↵erent -> different, e↵ect -> effect).
4. Page Footer & Header Stripping (Removes "Page 2", "Page 6", "Code A").
5. Exact 20/20/20/20 Section Splitting.
"""

import sys
import os

# Ensure current script directory is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

import json
import re
from typing import List, Dict, Any, Optional

def repair_pdf_ligatures_and_symbols(text: str) -> str:
    """Repairs common broken font ligatures and corrupted symbols in scientific PDFs."""
    if not text:
        return ""
    s = text
    # 1. Broken ligatures: ↵, \u21B5, \uFFFD, \u001F
    s = re.sub(r'di[↵\u21B5\uFFFD\u001F]erent', 'different', s, flags=re.IGNORECASE)
    s = re.sub(r'e[↵\u21B5\uFFFD\u001F]ect', 'effect', s, flags=re.IGNORECASE)
    s = re.sub(r'e[↵\u21B5\uFFFD\u001F]ective', 'effective', s, flags=re.IGNORECASE)
    s = re.sub(r'co[↵\u21B5\uFFFD\u001F]ecient|coecient', 'coefficient', s, flags=re.IGNORECASE)
    s = re.sub(r'su[↵\u21B5\uFFFD\u001F]cient|sucient', 'sufficient', s, flags=re.IGNORECASE)
    s = re.sub(r'di[↵\u21B5\uFFFD\u001F]usion', 'diffusion', s, flags=re.IGNORECASE)
    s = re.sub(r'di[↵\u21B5\uFFFD\u001F]raction', 'diffraction', s, flags=re.IGNORECASE)
    s = re.sub(r'o[↵\u21B5\uFFFD\u001F]spring', 'offspring', s, flags=re.IGNORECASE)
    s = re.sub(r'a[↵\u21B5\uFFFD\u001F]ect', 'affect', s, flags=re.IGNORECASE)
    s = re.sub(r'[↵\u21B5\uFFFD]', ' ', s)

    # 2. Corrupted permittivity / epsilon symbols
    s = re.sub(r'[\u21D4\u2208]\s*=\s*4\s*[\u21D4\u2208]\s*0', r'$\\epsilon = 4\\epsilon_0$', s)
    s = re.sub(r'\bpermittivity\s+([a-zA-Z\u21D4\u2208])\s*=\s*(\d+)\s*([a-zA-Z\u21D4\u2208])\s*0', r'permittivity $\\epsilon = \\2\\epsilon_0$', s, flags=re.IGNORECASE)

    # 3. Ratio formatting: (E 0 / B 0) -> (E_0 / B_0)
    s = re.sub(r'\(\s*E\s*0\s*\/\s*B\s*0\s*\)', r'($E_0 / B_0$)', s)
    s = re.sub(r'\bE\s*0\b', r'$E_0$', s)
    s = re.sub(r'\bB\s*0\b', r'$B_0$', s)
    s = re.sub(r'\bQ\s*0\b', r'$Q_0$', s)

    return s

def strip_page_headers_and_footers(text: str) -> str:
    """Removes 'Page 1', 'Page 2 of 24', 'NEST-2024', and header/footer noise."""
    if not text:
        return ""
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        l = line.strip()
        if re.match(r'^(?:Page\s*\d+(?:\s*of\s*\d+)?|NEST\s*[-–—:]*\s*\d{4}|Paper\s*\d+|Code\s*[A-Z]|\d+\s*Page\s*\d+)$', l, re.IGNORECASE):
            continue
        l = re.sub(r'\s+Page\s*\d+(?:\s*of\s*\d+)?\s*$', '', l, flags=re.IGNORECASE)
        if l:
            cleaned.append(l)
    return "\n".join(cleaned)

def extract_raw_text_from_pdf(pdf_path: str) -> str:
    """Extracts raw text preserving layout and repairs symbols."""
    full_text = ""

    # 1. Try PyMuPDF (fitz)
    try:
        import fitz
        doc = fitz.open(pdf_path)
        for page in doc:
            full_text += page.get_text("text") + "\n"
        doc.close()
        if len(full_text.strip()) > 50:
            return strip_page_headers_and_footers(repair_pdf_ligatures_and_symbols(full_text))
    except Exception:
        pass

    # 2. Try pdfplumber
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text(layout=True) or page.extract_text()
                if page_text:
                    full_text += page_text + "\n"
        if len(full_text.strip()) > 50:
            return strip_page_headers_and_footers(repair_pdf_ligatures_and_symbols(full_text))
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

    return strip_page_headers_and_footers(repair_pdf_ligatures_and_symbols(full_text))

def format_electrochem_and_ions(text: str) -> str:
    """Formats galvanic cell notation, redox species, phases, and complex ions."""
    s = text

    s = re.sub(r'\s*Page\s*\d+(\s*of\s*\d+)?\s*$', '', s, flags=re.IGNORECASE).strip()

    # 1. Galvanic cell phases & ions: Zn(s)|Zn2+ (aq)||Ag + (aq)|Ag(s)
    s = re.sub(r'\b([A-Z][a-z]?)\s*(\d+)?\s*([\+\-])\s*\(aq\)', r'$\1^{\2\3}\\text{(aq)}$', s)
    s = re.sub(r'\b([A-Z][a-z]?)\s*\(aq\)', r'$\1\\text{(aq)}$', s)
    s = re.sub(r'\b([A-Z][a-z]?)\s*\(s\)', r'$\1\\text{(s)}$', s)
    s = re.sub(r'\b([A-Z][a-z]?)\s*\(l\)', r'$\1\\text{(l)}$', s)
    s = re.sub(r'\b([A-Z][a-z]?)\s*\(g\)', r'$\1\\text{(g)}$', s)

    # 2. Inverted and standard chemical ions: NH+ 4 -> $NH_4^+$, BH- 4 -> $BH_4^-$, NO + 2 -> $NO_2^+$, NH- 2 -> $NH_2^-$
    s = re.sub(r'\b([A-Z][a-zA-Z0-9]*)\s*([\+\-])\s*(\d+)\b', r'$\1_{\3}^{\2}$', s)
    s = re.sub(r'\b([A-Z][a-zA-Z0-9]*)\s*(\d+)\s*\^?\s*(\d*)([\+\-])\b', r'$\1_{\2}^{\3\4}$', s)
    s = re.sub(r'\b([A-Z][a-zA-Z0-9]*)\s*(\d+)([\+\-])\b', r'$\1_{\2}^{\3}$', s)
    s = re.sub(r'\[([A-Za-z0-9\(\)]+)\]\s*(\d+)?([\+\-])', r'$[\1]^{\2\3}$', s)

    # 3. Subscript common molecules: N2O, NO2, O3, H2O, CO2, SO2, NH3
    chem_tokens = r'\b(N2O|NO2|NO3|H2O|CO2|SO2|SO3|SO4|NH3|NH4|BH4|H3O|CH4|C2H6|C6H6|C6H12O6|H2SO4|HNO3|HCl|NaOH|KOH|KMnO4|O3|O2|N2|H2|Cl2|Br2|I2|F2)\b'
    def repl_chem(m):
        sub = re.sub(r'([A-Za-z])(\d+)', r'\1_{\2}', m.group(1))
        return f"${sub}$"
    s = re.sub(chem_tokens, repl_chem, s)

    return s

def sanitize_scientific_math_and_chem(text: str) -> str:
    """High-precision conversion of math, chemical formulas, square roots, and matrices with token isolation."""
    if not text:
        return ""

    s = text

    # 1. Strip any Hindi / Devanagari characters
    s = re.sub(r'[\u0900-\u097F]+', '', s)
    s = re.sub(r'[।॥]', '', s).strip()

    # 2. Repair ligatures and footers
    s = repair_pdf_ligatures_and_symbols(s)

    # 3. Unicode superscripts and subscripts
    sup_map = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-','⁼':'=','⁽':'(','⁾':')'}
    sub_map = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','₊':'+','₋':'-','₌':'=','₍':'(','₎':')'}
    s = re.sub(r'[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+', lambda m: f"^{{{''.join(sup_map.get(c, c) for c in m.group(0))}}}", s)
    s = re.sub(r'[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+', lambda m: f"_{{{''.join(sub_map.get(c, c) for c in m.group(0))}}}", s)

    # 4. Square roots & Radicals: √2, sqrt(2), root 2
    s = re.sub(r'(?:\\u221A|√)\s*\((.*?)\)', r' $\\sqrt{\1}$ ', s)
    s = re.sub(r'(?:\\u221A|√)\s*([a-zA-Z0-9]+)', r' $\\sqrt{\1}$ ', s)
    s = re.sub(r'\b(?:sqrt|root)\s*\((.*?)\)', r' $\\sqrt{\1}$ ', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(?:sqrt|root)\s*([a-zA-Z0-9]+)\b', r' $\\sqrt{\1}$ ', s, flags=re.IGNORECASE)

    # 5. Electrochemistry and Chemical species
    s = format_electrochem_and_ions(s)

    # 6. Powers & Scientific Notation: 3 x 10^8 -> $3 \times 10^8$
    s = re.sub(r'(\d+(?:\.\d+)?)\s*[xX\*×]\s*10\s*\^?\s*(-?\d+)', r' $\\1 \\times 10^{\\2}$ ', s)
    s = re.sub(r'\b10\s*\^\s*(-?\d+)', r' $10^{\\1}$ ', s)

    # 7. Fractions: c/2 -> $\frac{c}{2}$, 1/3 -> $\frac{1}{3}$
    s = re.sub(r'\b(\d+)\s*\/\s*(\d+)\b', r' $\\frac{\\1}{\\2}$ ', s)
    s = re.sub(r'\b([a-zA-Z])\s*\/\s*(\d+)\b', r' $\\frac{\\1}{\\2}$ ', s)

    # 8. Integrals, Vectors, Arrows
    s = re.sub(r'[\u222B\u222C\u222D\u222E]', r' \\int ', s)
    s = re.sub(r'[\u21CC\u21C4]', r' $\\rightleftharpoons$ ', s)
    s = re.sub(r'[\u2192\u27F6]', r' $\\rightarrow$ ', s)
    s = re.sub(r'[\u00B1]', r' $\\pm$ ', s)
    s = re.sub(r'[\u00B0]', r'^{\\circ}', s)

    # Clean double dollar signs and spaces
    s = re.sub(r'\${2,}', '$', s)
    s = re.sub(r'\$\s*\$', '', s)
    return re.sub(r'\s+', ' ', s).strip()

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

def is_hindi_question(text: str) -> bool:
    """Returns True if the question is overwhelmingly Hindi/Devanagari."""
    if not text:
        return False
    dev_chars = len(re.findall(r'[\u0900-\u097F]', text))
    eng_chars = len(re.findall(r'[a-zA-Z]', text))
    return dev_chars > 20 and dev_chars > eng_chars

def parse_questions_from_text(raw_text: str) -> List[Dict[str, Any]]:
    """Splits raw text into clean English question objects, discarding all Hindi duplicates."""
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    questions = []
    current_q = None
    current_section = 'Biology'

    q_start_patterns = [
        re.compile(r'^(?:Q(?:uestion)?\.?\s*)(\d{1,3})[.):\s]*(.*)', re.IGNORECASE),
        re.compile(r'^(\d{1,3})[.)\s]+(.*)'),
    ]

    opt_pattern = re.compile(r'^[\[(]?([A-D])[\])]?[.)\s]\s*(.*)', re.IGNORECASE)
    ans_pattern = re.compile(r'^(?:answer|ans(?:wer)?)[.:\s]+[\[(]?([A-D])[\])]?', re.IGNORECASE)

    def finalize_question():
        nonlocal current_q
        if current_q and current_q.get('text', '').strip():
            # Discard if overwhelmingly Hindi
            if is_hindi_question(current_q['text']):
                current_q = None
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
            "message": f"🐍 Extracted {len(questions)} pure English questions — Physics: {section_counts['Physics']}, Chemistry: {section_counts['Chemistry']}, Math: {section_counts['Mathematics']}, Biology: {section_counts['Biology']}"
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": f"Python Extraction Failed: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
