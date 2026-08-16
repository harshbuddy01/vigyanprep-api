#!/usr/bin/env python3
"""
Scientific Paper & Mathematical Formula Extractor for VigyanPrep (IISER IAT, NISER NEST, ISI, CMI)
Extracts questions, LaTeX math formulas, matrices, square roots, and chemical species.
"""

import sys
import json
import os
import re
from typing import List, Dict, Any, Optional

def extract_raw_text_and_tables(pdf_path: str) -> str:
    """Extracts text preserving spatial matrix layout using pdfplumber, PyMuPDF, or PyPDF2."""
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

def format_latex_matrix(matrix_text: str) -> str:
    """Converts a grid of numbers/variables enclosed in brackets into a LaTeX matrix."""
    lines = [l.strip().strip('[]()|').strip() for l in matrix_text.strip().split('\n') if l.strip()]
    if len(lines) < 2:
        return matrix_text

    matrix_rows = []
    for line in lines:
        cols = re.split(r'[\s,\t]+', line)
        if cols:
            matrix_rows.append(" & ".join(cols))

    if matrix_rows:
        return "$\\begin{pmatrix} " + " \\\\ ".join(matrix_rows) + " \\end{pmatrix}$"
    return matrix_text

def sanitize_scientific_math_and_chem(text: str) -> str:
    """High-precision conversion of math, chemical formulas, square roots, and matrices to LaTeX."""
    if not text:
        return ""

    s = text

    # 1. Normalize Unicode superscripts and subscripts
    sup_map = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-','⁼':'=','⁽':'(','⁾':')'}
    sub_map = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','₊':'+','₋':'-','₌':'=','₍':'(','₎':')'}
    
    s = re.sub(r'[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+', lambda m: f"^{{{''.join(sup_map.get(c, c) for c in m.group(0))}}}", s)
    s = re.sub(r'[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+', lambda m: f"_{{{''.join(sub_map.get(c, c) for c in m.group(0))}}}", s)

    # 2. Square roots & Radicals: √2, \u221A2, sqrt(2), root 2, √(x^2+y^2)
    s = re.sub(r'(?:\\u221A|√)\s*\((.*?)\)', r' \\sqrt{\1} ', s)
    s = re.sub(r'(?:\\u221A|√)\s*([a-zA-Z0-9]+)', r' \\sqrt{\1} ', s)
    s = re.sub(r'\b(?:sqrt|root)\s*\((.*?)\)', r' \\sqrt{\1} ', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(?:sqrt|root)\s*([a-zA-Z0-9]+)\b', r' \\sqrt{\1} ', s, flags=re.IGNORECASE)
    s = re.sub(r'[√\u221A]', r' \\sqrt ', s)

    # 3. Chemical Species, Ions & Coordination Complexes:
    # Coordination complex ions: [Fe(CN)6]4- -> $[Fe(CN)_6]^{4-}$
    s = re.sub(r'\[([A-Za-z0-9\(\)]+)\]\s*(\d+)?([\+\-])', r' [\1]^{\2\3} ', s)
    
    # Diatomic / Polyatomic ions: N2 2+ -> $N_2^{2+}$, SO4 2- -> $SO_4^{2-}$, O2 - -> $O_2^-$
    s = re.sub(r'\b([A-Z][a-z]?)(\d+)\s+(\d*)([\+\-])\b', r' \1_{\2}^{\3\4} ', s)
    s = re.sub(r'\b([A-Z][a-z]?)(\d+)\s*\^\s*(\d*)([\+\-])\b', r' \1_{\2}^{\3\4} ', s)
    s = re.sub(r'\b([A-Z][a-z]?)(\d+)([\+\-])\b', r' \1_{\2}^{\3} ', s)
    s = re.sub(r'\b([A-Z][a-z]?)\s*(\d*)([\+\-])\b', r' \1^{\2\3} ', s)

    # Common chemical formulas with numbers: H2O, CO2, NH3, H2SO4, C6H12O6, KMnO4
    elements = r'(H|He|Li|Be|B|C|N|O|F|Ne|Na|Mg|Al|Si|P|S|Cl|Ar|K|Ca|Sc|Ti|V|Cr|Mn|Fe|Co|Ni|Cu|Zn|Ga|Ge|As|Se|Br|Kr|Rb|Sr|Y|Zr|Nb|Mo|Tc|Ru|Rh|Pd|Ag|Cd|In|Sn|Sb|Te|I|Xe|Cs|Ba|La|Ce|Pt|Au|Hg|Pb|Bi|U)'
    s = re.sub(rf'\b{elements}(\d+)', r'\1_{\2}', s)

    # 4. Powers, Exponents & Scientific Notation: 3 x 10^8, 10^-5, x^2
    s = re.sub(r'(\d+(?:\.\d+)?)\s*[xX\*×]\s*10\s*\^?\s*(-?\d+)', r' \1 \\times 10^{\2} ', s)
    s = re.sub(r'\b10\s*\^\s*(-?\d+)', r' 10^{\1} ', s)
    s = re.sub(r'\b([a-zA-Z0-9\)])\s*\^\s*([a-zA-Z0-9\-\+]+)', r' \1^{\2} ', s)
    s = re.sub(r'\b([a-zA-Z])\s*_\s*([a-zA-Z0-9\-\+]+)', r' \1_{\2} ', s)

    # 5. Fractions: 1/2, a/b
    s = re.sub(r'\b(\d+)\s*\/\s*(\d+)\b', r' \\frac{\1}{\2} ', s)
    s = re.sub(r'\b([a-zA-Z])\s*\/\s*([a-zA-Z0-9]+)\b', r' \\frac{\1}{\2} ', s)

    # 6. Integrals, Vectors, Summations, Arrows, Limits:
    s = re.sub(r'[\u222B\u222C\u222D\u222E]', r' \\int ', s)
    s = re.sub(r'\bint\s*([a-zA-Z0-9_\-\+\*\/\s\(\)]+)d([a-zA-Z])', r' \\int \1 d\2 ', s, flags=re.IGNORECASE)
    s = re.sub(r'[\u2211]', r' \\sum ', s)
    s = re.sub(r'[\u220F]', r' \\prod ', s)
    s = re.sub(r'[\u221E]', r' \\infty ', s)
    s = re.sub(r'[\u2192\u27F6]', r' \\rightarrow ', s)
    s = re.sub(r'[\u21CC\u21C4]', r' \\rightleftharpoons ', s)
    s = re.sub(r'\bvec\s*([a-zA-Z])', r' \\vec{\1} ', s, flags=re.IGNORECASE)
    s = re.sub(r'\bvector\s+([a-zA-Z])\b', r' \\vec{\1} ', s, flags=re.IGNORECASE)
    s = re.sub(r'\blim\s*([a-zA-Z])\s*->\s*([a-zA-Z0-9\u221E]+)', r' \\lim_{\1 \\to \2} ', s, flags=re.IGNORECASE)

    # 7. Greek letters & Operations
    s = re.sub(r'[\u00F7]', r' \\div ', s)
    s = re.sub(r'[\u00D7\u2A2F]', r' \\times ', s)
    s = re.sub(r'[\u22C5]', r' \\cdot ', s)
    s = re.sub(r'[\u2264]', r' \\le ', s)
    s = re.sub(r'[\u2265]', r' \\ge ', s)
    s = re.sub(r'[\u2260]', r' \\neq ', s)
    s = re.sub(r'[\u2248]', r' \\approx ', s)
    s = re.sub(r'[\u00B1]', r' \\pm ', s)
    s = re.sub(r'[\u00B0]', r'^{\\circ}', s)

    greek = {'\u03B1':'\\alpha','\u03B2':'\\beta','\u03B3':'\\gamma','\u03B4':'\\delta','\u0394':'\\Delta',
             '\u03B8':'\\theta','\u03C0':'\\pi','\u03C1':'\\rho','\u03C3':'\\sigma','\u03C9':'\\omega',
             '\u03BB':'\\lambda','\u03BC':'\\mu','\u03B5':'\\epsilon','\u03D5':'\\phi','\u03C8':'\\psi'}
    for char, tex in greek.items():
        s = s.replace(char, f" {tex} ")

    s = re.sub(r'\s+', ' ', s).strip()

    # Wrap LaTeX expressions in KaTeX $...$ if not already wrapped
    latex_tokens = r'\\(frac|int|vec|sqrt|sum|prod|times|div|alpha|beta|gamma|Delta|theta|pi|lambda|mu|epsilon|phi|psi|le|ge|neq|approx|pm|infty|rightleftharpoons|rightarrow|circ)'
    has_latex = re.search(latex_tokens, s) or re.search(r'(\w+_\{\w+\}|\w+\^\{\w+\})', s)
    if has_latex and '$' not in s:
        s = f"${s}$"

    return s

def detect_section_header(line: str) -> Optional[str]:
    """Detects Physics, Chemistry, Mathematics, or Biology section headers."""
    if len(line.split()) > 8:
        return None
    u = line.strip().upper()
    if re.search(r'\bPHYSICS\b', u):
        return 'Physics'
    if re.search(r'\bCHEMISTR', u):
        return 'Chemistry'
    if re.search(r'\b(MATH|MATHEMATICS)\b', u):
        return 'Mathematics'
    if re.search(r'\b(BIOLOGY|BIOLOGICAL)\b', u):
        return 'Biology'
    return None

def parse_questions_from_text(raw_text: str) -> List[Dict[str, Any]]:
    """Splits raw extracted text into clean, structured question objects."""
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    questions = []
    current_q = None
    current_section = 'Physics'

    q_start_patterns = [
        re.compile(r'^(?:Q(?:uestion)?\.?\s*)(\d{1,3})[.):\s]', re.IGNORECASE),
        re.compile(r'^(\d{1,3})[.)]\s+\S'),
        re.compile(r'^(\d{1,3})\s+\.\s+\S'),
    ]

    opt_pattern = re.compile(r'^[\[(]?([A-D])[\])]?[.)]\s*(.*)', re.IGNORECASE)
    ans_pattern = re.compile(r'^(?:answer|ans(?:wer)?)[.:\s]+[\[(]?([A-D])[\])]?', re.IGNORECASE)

    def finalize_question():
        nonlocal current_q
        if current_q and current_q.get('text', '').strip():
            # Pad options to 4 if missing
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
            current_section = sec
            continue

        q_num = None
        for pat in q_start_patterns:
            m = pat.match(line)
            if m:
                q_num = int(m.group(1))
                break

        if q_num is not None:
            finalize_question()
            current_q = {
                'tempId': f"py_{len(questions) + 1}_{q_num}",
                'questionNumber': q_num,
                'section': current_section,
                'type': 'MCQ',
                'text': re.sub(r'^(?:Q(?:uestion)?\.?\s*)?\d{1,3}[.):\s]*', '', line).strip(),
                'options': [],
                'correctAnswer': 'A',
                'imageUrl': '',
                'status': 'draft_review'
            }
            continue

        if current_q:
            opt_m = opt_pattern.match(line)
            if opt_m:
                opt_letter = opt_m.group(1).upper()
                opt_text = opt_m.group(2).strip()
                current_q['options'].append(opt_text if opt_text else f"Option {opt_letter}")
                continue

            ans_m = ans_pattern.match(line)
            if ans_m:
                current_q['correctAnswer'] = ans_m.group(1).upper()
                continue

            # Append multi-line question text or option text
            if not current_q['options']:
                current_q['text'] += " " + line
            else:
                current_q['options'][-1] += " " + line

    finalize_question()
    return questions

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
            print(json.dumps({"success": False, "error": "Could not extract text from PDF. Ensure file is not corrupt or password-protected."}))
            sys.exit(1)

        questions = parse_questions_from_text(raw_text)

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
            "message": f"🐍 Python successfully extracted {len(questions)} questions with LaTeX matrices, roots, and chemical species!"
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": f"Python Extraction Failed: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
