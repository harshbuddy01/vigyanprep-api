#!/usr/bin/env python3
"""
Scientific Paper & Mathematical Formula Extractor for VigyanPrep (IISER IAT, NISER NEST, ISI, CMI)
High-Precision Engine.
"""

import sys
import os
import json
import re
from typing import List, Dict, Any, Optional

# Ensure current script directory is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

def is_mostly_hindi(text: str) -> bool:
    """Returns True if the text has > 30% Devanagari characters."""
    if not text.strip():
        return False
    dev_chars = len(re.findall(r'[\u0900-\u097F]', text))
    total_chars = len(text.replace(" ", ""))
    if total_chars == 0:
        return False
    return (dev_chars / total_chars) > 0.3

def remove_hindi_lines(text: str) -> str:
    """Drops entire lines where Devanagari ratio > 30%."""
    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        if not is_mostly_hindi(line):
            cleaned_lines.append(line)
    return "\n".join(cleaned_lines)

def repair_pdf_ligatures_and_symbols(text: str) -> str:
    """Repairs common broken font ligatures and corrupted symbols in scientific PDFs."""
    if not text:
        return ""
    s = text
    
    # 1. Broken ligatures (space or special chars)
    s = re.sub(r'su[ \u21B5\uFFFD\u001F]cient|sucient', 'sufficient', s, flags=re.IGNORECASE)
    s = re.sub(r'coe[ \u21B5\uFFFD\u001F]cient|coecient', 'coefficient', s, flags=re.IGNORECASE)
    s = re.sub(r'di[ \u21B5\uFFFD\u001F]usion|diusion', 'diffusion', s, flags=re.IGNORECASE)
    s = re.sub(r'e[ \u21B5\uFFFD\u001F]ective|eective', 'effective', s, flags=re.IGNORECASE)
    s = re.sub(r'e[ \u21B5\uFFFD\u001F]ect|eect', 'effect', s, flags=re.IGNORECASE)
    s = re.sub(r'a[ \u21B5\uFFFD\u001F]ect|aect', 'affect', s, flags=re.IGNORECASE)
    s = re.sub(r'o[ \u21B5\uFFFD\u001F]spring|ospring', 'offspring', s, flags=re.IGNORECASE)
    s = re.sub(r'di[ \u21B5\uFFFD\u001F]erent|dierent', 'different', s, flags=re.IGNORECASE)
    s = re.sub(r'di[ \u21B5\uFFFD\u001F]raction|diraction', 'diffraction', s, flags=re.IGNORECASE)
    
    s = re.sub(r'[\u21B5\uFFFD]', ' ', s)

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
    # Try fitz, pdfplumber, PyPDF2 in order
    try:
        import fitz
        doc = fitz.open(pdf_path)
        for page in doc:
            full_text += page.get_text("text") + "\n"
        doc.close()
        if len(full_text.strip()) > 50:
            full_text = remove_hindi_lines(full_text)
            return strip_page_headers_and_footers(repair_pdf_ligatures_and_symbols(full_text))
    except Exception:
        pass

    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text(layout=True) or page.extract_text()
                if page_text:
                    full_text += page_text + "\n"
        if len(full_text.strip()) > 50:
            full_text = remove_hindi_lines(full_text)
            return strip_page_headers_and_footers(repair_pdf_ligatures_and_symbols(full_text))
    except Exception:
        pass

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

    full_text = remove_hindi_lines(full_text)
    return strip_page_headers_and_footers(repair_pdf_ligatures_and_symbols(full_text))

def format_electrochem_and_ions(text: str) -> str:
    """Formats galvanic cell notation, redox species, phases, complex ions, and organic groups."""
    s = text

    s = re.sub(r'\s*Page\s*\d+(\s*of\s*\d+)?\s*$', '', s, flags=re.IGNORECASE).strip()

    # 1. Phases
    s = re.sub(r'\b([A-Z][a-z]?)\s*(\d+)?\s*([\+\-])\s*\(aq\)', r'$\1^{\2\3}\\text{(aq)}$', s)
    s = re.sub(r'\b([A-Z][a-z]?)\s*\(aq\)', r'$\1\\text{(aq)}$', s)
    s = re.sub(r'\b([A-Z][a-z]?)\s*\(s\)', r'$\1\\text{(s)}$', s)
    s = re.sub(r'\b([A-Z][a-z]?)\s*\(l\)', r'$\1\\text{(l)}$', s)
    s = re.sub(r'\b([A-Z][a-z]?)\s*\(g\)', r'$\1\\text{(g)}$', s)

    # 2. Organic functional groups
    s = re.sub(r'\b-COOH\b', r'$\\text{-COOH}$', s)
    s = re.sub(r'\b-OH\b', r'$\\text{-OH}$', s)
    s = re.sub(r'\b-NH2\b', r'$\\text{-NH}_2$', s)
    s = re.sub(r'\b-CHO\b', r'$\\text{-CHO}$', s)

    # 3. Coordination compounds and complex ions
    s = re.sub(r'\[(Fe|Co|Ni|Cu|Pt|Pd)\((CN|NH3|H2O|en)\)_?(\d+)\]\^?\s*(\d*)([\+\-])', r'$[\1(\2)_{\3}]^{\4\5}$', s)
    s = re.sub(r'\[(Fe|Co|Ni|Cu|Pt|Pd)\((CN|NH3|H2O|en)\)_?(\d+)\]', r'$[\1(\2)_{\3}]$', s)
    s = re.sub(r'\b(MnO4)\s*\^?\s*([\+\-])\b', r'$\1^{\2}$', s)
    s = re.sub(r'\b(Cr2O7)\s*\^?\s*2([\+\-])\b', r'$\1^{2\2}$', s)
    s = re.sub(r'\b(PO4)\s*\^?\s*3([\+\-])\b', r'$\1^{3\2}$', s)
    s = re.sub(r'\b(SO4)\s*\^?\s*2([\+\-])\b', r'$\1^{2\2}$', s)
    
    # 4. Standard chemical ions
    s = re.sub(r'\b([A-Z][a-zA-Z0-9]*)\s*([\+\-])\s*(\d+)\b', r'$\1_{\3}^{\2}$', s)
    s = re.sub(r'\b([A-Z][a-zA-Z0-9]*)\s*(\d+)\s*\^?\s*(\d*)([\+\-])\b', r'$\1_{\2}^{\3\4}$', s)
    s = re.sub(r'\b([A-Z][a-zA-Z0-9]*)\s*(\d+)([\+\-])\b', r'$\1_{\2}^{\3}$', s)
    s = re.sub(r'\[([A-Za-z0-9\(\)]+)\]\s*(\d+)?([\+\-])', r'$[\1]^{\2\3}$', s)

    # 5. Subscript common molecules
    chem_tokens = r'\b(N2O|NO2|NO3|H2O|CO2|SO2|SO3|SO4|NH3|NH4|BH4|H3O|CH4|C2H6|C6H6|C6H12O6|H2SO4|HNO3|HCl|NaOH|KOH|KMnO4|O3|O2|N2|H2|Cl2|Br2|I2|F2|MnO4|Cr2O7|PO4)\b'
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

    # Remove any remaining standalone devanagari if it sneaked in (though mostly handled by remove_hindi_lines)
    # Actually, instructions said: "Do NOT try to strip Hindi characters from mixed lines... Apply this BEFORE question parsing, not during sanitization"
    # So we skip re.sub(r'[\u0900-\u097F]+', '', s)
    
    s = re.sub(r'[।॥]', '', s).strip()

    # Unicode superscripts and subscripts
    sup_map = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-','⁼':'=','⁽':'(','⁾':')'}
    sub_map = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','₊':'+','₋':'-','₌':'=','₍':'(','₎':')'}
    s = re.sub(r'[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+', lambda m: f"^{{{''.join(sup_map.get(c, c) for c in m.group(0))}}}", s)
    s = re.sub(r'[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+', lambda m: f"_{{{''.join(sub_map.get(c, c) for c in m.group(0))}}}", s)

    s = re.sub(r'(?:\\u221A|√)\s*\((.*?)\)', r' $\\sqrt{\1}$ ', s)
    s = re.sub(r'(?:\\u221A|√)\s*([a-zA-Z0-9]+)', r' $\\sqrt{\1}$ ', s)
    s = re.sub(r'\b(?:sqrt|root)\s*\((.*?)\)', r' $\\sqrt{\1}$ ', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(?:sqrt|root)\s*([a-zA-Z0-9]+)\b', r' $\\sqrt{\1}$ ', s, flags=re.IGNORECASE)

    s = format_electrochem_and_ions(s)

    s = re.sub(r'(\d+(?:\.\d+)?)\s*[xX\*×]\s*10\s*\^?\s*(-?\d+)', r' $\\1 \\times 10^{\\2}$ ', s)
    s = re.sub(r'\b10\s*\^\s*(-?\d+)', r' $10^{\\1}$ ', s)

    s = re.sub(r'\b(\d+)\s*\/\s*(\d+)\b', r' $\\frac{\\1}{\\2}$ ', s)
    s = re.sub(r'\b([a-zA-Z])\s*\/\s*(\d+)\b', r' $\\frac{\\1}{\\2}$ ', s)

    s = re.sub(r'[\u222B\u222C\u222D\u222E]', r' \\int ', s)
    s = re.sub(r'[\u21CC\u21C4]', r' $\\rightleftharpoons$ ', s)
    s = re.sub(r'[\u2192\u27F6]', r' $\\rightarrow$ ', s)
    s = re.sub(r'[\u21CC\u21C4\u2192\u27F6⟶⇌→]', r' $\\rightarrow$ ', s) 
    
    # Let's cleanly replace arrows
    s = s.replace('→', ' $\\rightarrow$ ').replace('⇌', ' $\\rightleftharpoons$ ').replace('⟶', ' $\\longrightarrow$ ')

    s = re.sub(r'[\u00B1]', r' $\\pm$ ', s)
    s = re.sub(r'[\u00B0]', r'^{\\circ}', s)

    s = re.sub(r'\${2,}', '$', s)
    s = re.sub(r'\$\s*\$', '', s)
    return re.sub(r'\s+', ' ', s).strip()

def detect_section_header(line: str) -> Optional[str]:
    """Detects Physics, Chemistry, Mathematics, or Biology section banners."""
    if len(line.split()) > 10:
        return None
    u = line.strip().upper()
    
    # Standalone checks (< 5 words)
    words = u.split()
    if len(words) < 5:
        if 'BIOLOGY' in words: return 'Biology'
        if 'CHEMISTRY' in words: return 'Chemistry'
        if 'MATHEMATICS' in words or 'MATHS' in words: return 'Mathematics'
        if 'PHYSICS' in words: return 'Physics'

    if re.search(r'\b(SECTION\s*[-–—:]*\s*\d*\s*[-–—:]*\s*BIOLOGY|PART\s*[-–—:]*\s*[A-Z\d]*\s*[-–—:]*\s*BIOLOGY)', u):
        return 'Biology'
    if re.search(r'\b(SECTION\s*[-–—:]*\s*\d*\s*[-–—:]*\s*CHEMISTRY|PART\s*[-–—:]*\s*[A-Z\d]*\s*[-–—:]*\s*CHEMISTRY)', u):
        return 'Chemistry'
    if re.search(r'\b(SECTION\s*[-–—:]*\s*\d*\s*[-–—:]*\s*MATHEMATICS|PART\s*[-–—:]*\s*[A-Z\d]*\s*[-–—:]*\s*MATHEMATICS)', u):
        return 'Mathematics'
    if re.search(r'\b(SECTION\s*[-–—:]*\s*\d*\s*[-–—:]*\s*PHYSICS|PART\s*[-–—:]*\s*[A-Z\d]*\s*[-–—:]*\s*PHYSICS)', u):
        return 'Physics'
    return None

def parse_inline_options(line: str) -> List[str]:
    """
    Tries to parse inline options like:
    (A) 4    (B) 5    (C) 6    (D) 7
    A) val   B) val2  C) val3  D) val4
    """
    pattern = re.compile(r'(?:^|\s)[\(]?([A-D])[\)]?[\.\)]\s+')
    matches = list(pattern.finditer(line))
    if len(matches) == 4:
        opts = []
        for i in range(4):
            start = matches[i].end()
            end = matches[i+1].start() if i < 3 else len(line)
            opts.append(line[start:end].strip())
        return opts
    return []

def parse_questions_from_text(raw_text: str) -> List[Dict[str, Any]]:
    """Splits raw text into clean English question objects."""
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
            # Check for inline options if we don't have 4 options yet
            if len(current_q['options']) == 0:
                # Look in the text for inline options
                inline_opts = parse_inline_options(current_q['text'])
                if inline_opts:
                    current_q['options'] = inline_opts
                    # Remove the options from the text
                    # We can just trim the text up to the first option
                    first_match = re.search(r'(?:^|\s)[\(]?[A-D][\)]?[\.\)]\s+', current_q['text'])
                    if first_match:
                        current_q['text'] = current_q['text'][:first_match.start()].strip()

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
            # If the same line starts a question and has options, it might be an inline option line
            inline_opts = parse_inline_options(q_text_start)
            if inline_opts:
                finalize_question()
                current_q = {
                    'tempId': f"py_{current_section[:3].lower()}_{q_num}_{len(questions) + 1}",
                    'questionNumber': q_num,
                    'question_number': q_num,
                    'section': current_section,
                    'type': 'MCQ',
                    'text': q_text_start[:re.search(r'(?:^|\s)[\(]?[A-D][\)]?[\.\)]\s+', q_text_start).start()].strip(),
                    'options': inline_opts,
                    'correctAnswer': 'A',
                    'correct_answer': 'A',
                    'imageUrl': '',
                    'status': 'draft_review'
                }
                continue

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
            # First check for inline options in the current line
            inline_opts = parse_inline_options(line)
            if inline_opts and len(current_q['options']) == 0:
                current_q['options'] = inline_opts
                continue

            # Fallback to line-by-line options
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

            if not current_q['options']:
                current_q['text'] += " " + line
            else:
                current_q['options'][-1] += " " + line

    finalize_question()
    return questions

def classify_subject_keywords(text: str) -> Optional[str]:
    """Classifies a question into Physics, Chemistry, Mathematics, or Biology using scientific terms."""
    t = text.lower()
    biology_terms = [
        'mendel', 'gamete', 'allele', 'chromosome', 'dna', 'rna', 'gene', 'protein', 'enzyme', 'cell', 'bacteria', 
        'plant', 'animal', 'organism', 'species', 'mitosis', 'meiosis', 'mutation', 'evolution', 'photosynthesis', 
        'respiration', 'ecology', 'ecosystem', 'taxonomy', 'anatomy', 'physiology', 'hormone', 'neuron', 'immune', 
        'antibody', 'antigen', 'virus', 'genetics', 'peptidoglycan', 'chloroplast', 'mitochondria', 'membrane', 
        'nucleotide', 'amino acid', 'lipid', 'polysaccharide', 'hemoglobin', 'lysosome', 'ribosome', 'flagella'
    ]
    chemistry_terms = [
        'reaction', 'acid', 'base', 'bond', 'mole', 'compound', 'organic', 'inorganic', 'element', 'periodic', 'ion', 
        'cation', 'anion', 'oxidation', 'reduction', 'equilibrium', 'catalyst', 'polymer', 'isomer', 'electrode', 
        'electrolysis', 'solution', 'solvent', 'titration', 'molar', 'enthalpy', 'entropy', 'molecular', 'atomic', 
        'valence', 'orbital', 'hybridization', 'aromatic', 'alkane', 'alkene', 'alkyne', 'ester', 'amine', 'aldehyde', 
        'ketone', 'carboxylic', 'ph', 'redox', 'galvanic', 'electrochemical'
    ]
    math_terms = [
        'matrix', 'integral', 'derivative', 'differential', 'probability', 'vector', 'calculus', 'equation', 'polynomial', 
        'function', 'limit', 'series', 'sequence', 'determinant', 'eigenvalue', 'trigonometric', 'logarithm', 'exponential', 
        'algebra', 'geometry', 'theorem', 'proof', 'inequality', 'permutation', 'combination', 'statistics', 'mean', 
        'variance', 'graph', 'coordinate', 'parabola', 'ellipse', 'hyperbola', 'tangent', 'normal', 'binomial', 'geometry',
        'calculus', 'integration', 'differentiation', 'continuous', 'differentiable', 'complex number', 'locus'
    ]
    physics_terms = [
        'force', 'velocity', 'acceleration', 'mass', 'energy', 'power', 'momentum', 'electric', 'magnetic', 'field', 
        'wave', 'frequency', 'wavelength', 'optics', 'lens', 'mirror', 'circuit', 'resistance', 'current', 'voltage', 
        'capacitor', 'inductor', 'thermodynamics', 'heat', 'temperature', 'pressure', 'torque', 'angular', 'gravitational', 
        'potential', 'kinetic', 'permittivity', 'electromagnetic', 'refraction', 'diffraction', 'interference', 'photoelectric', 
        'quantum', 'frictional', 'tension', 'pendulum', 'spring', 'kinematics', 'oscillation'
    ]

    bio_score = sum(1 for k in biology_terms if k in t)
    chem_score = sum(1 for k in chemistry_terms if k in t)
    math_score = sum(1 for k in math_terms if k in t)
    phys_score = sum(1 for k in physics_terms if k in t)

    max_score = max(bio_score, chem_score, math_score, phys_score)
    if max_score > 0:
        if bio_score == max_score: return 'Biology'
        if chem_score == max_score: return 'Chemistry'
        if math_score == max_score: return 'Mathematics'
        if phys_score == max_score: return 'Physics'
    return None

def balance_and_renumber_sections(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Classifies questions into 4 subjects and ensures 1..N renumbering per section."""
    total_q = len(questions)
    quarter = max(1, total_q // 4)

    for idx, q in enumerate(questions):
        raw_text = q.get('text', '')
        classified = classify_subject_keywords(raw_text)
        if classified:
            q['section'] = classified
        elif not q.get('section') or q['section'] == 'General':
            # NEST order: Biology (Q1-20), Chemistry (Q21-40), Mathematics (Q41-60), Physics (Q61-80)
            if idx < quarter:
                q['section'] = 'Biology'
            elif idx < 2 * quarter:
                q['section'] = 'Chemistry'
            elif idx < 3 * quarter:
                q['section'] = 'Mathematics'
            else:
                q['section'] = 'Physics'

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
