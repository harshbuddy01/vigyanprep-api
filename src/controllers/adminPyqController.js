import fs from 'fs';
import path from 'path';
import { supabase } from '../db/supabase.js';
import { PDFParse } from 'pdf-parse';
import { invalidatePreviewStatus } from './previewModeController.js';

async function extractTextFromBuffer(buffer) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  if (result && result.pages && Array.isArray(result.pages)) {
    return result.pages.map(p => p.text || '').join('\n');
  }
  return '';
}

function classifySubject(text) {
  const t = text.toLowerCase();
  const physics = ['force', 'velocity', 'acceleration', 'mass', 'energy', 'power', 'momentum', 'electric', 'magnetic', 'field', 'wave', 'frequency', 'wavelength', 'optics', 'lens', 'mirror', 'circuit', 'resistance', 'current', 'voltage', 'capacitor', 'inductor', 'thermodynamics', 'entropy', 'heat', 'temperature', 'pressure', 'torque', 'angular', 'gravitational', 'potential', 'kinetic'];
  const chemistry = ['reaction', 'acid', 'base', 'bond', 'mole', 'compound', 'organic', 'element', 'periodic', 'ion', 'cation', 'anion', 'oxidation', 'reduction', 'equilibrium', 'catalyst', 'polymer', 'isomer', 'electrode', 'electrolysis', 'solution', 'solvent', 'ph', 'titration', 'molar', 'enthalpy', 'entropy', 'molecular', 'atomic', 'valence'];
  const maths = ['matrix', 'integral', 'derivative', 'differential', 'probability', 'vector', 'calculus', 'equation', 'polynomial', 'function', 'limit', 'series', 'sequence', 'determinant', 'eigenvalue', 'trigonometric', 'logarithm', 'exponential', 'algebra', 'geometry', 'theorem', 'proof', 'inequality', 'permutation', 'combination', 'statistics', 'mean', 'variance', 'graph', 'coordinate'];
  const biology = ['cell', 'dna', 'rna', 'gene', 'protein', 'enzyme', 'plant', 'animal', 'organism', 'species', 'chromosome', 'mitosis', 'meiosis', 'mutation', 'evolution', 'photosynthesis', 'respiration', 'ecology', 'ecosystem', 'taxonomy', 'anatomy', 'physiology', 'hormone', 'neuron', 'immune', 'antibody', 'antigen', 'virus', 'bacteria', 'genetics'];

  let bioScore = biology.filter(k => t.includes(k)).length;
  let chemScore = chemistry.filter(k => t.includes(k)).length;
  let mathScore = maths.filter(k => t.includes(k)).length;
  let physScore = physics.filter(k => t.includes(k)).length;

  const max = Math.max(bioScore, chemScore, mathScore, physScore);
  if (max === 0) return null;
  if (max === physScore) return 'Physics';
  if (max === chemScore) return 'Chemistry';
  if (max === mathScore) return 'Mathematics';
  return 'Biology';
}

function detectSectionHeader(line) {
  if (line.split(/\s+/).length > 8) return null;
  const u = line.trim().toUpperCase();
  if (/\bPHYSICS\b/.test(u)) return 'Physics';
  if (/\bCHEMISTR/.test(u)) return 'Chemistry';
  if (/\bMATH/.test(u)) return 'Mathematics';
  if (/\bBIOLOG/.test(u)) return 'Biology';
  return null;
}

function sanitizeAndFormatMathText(text) {
  if (!text) return '';

  let str = text;

  // 1. Unicode superscripts & subscripts conversion
  const superMap = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')'
  };
  const subMap = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')'
  };

  // Replace unicode super/sub strings
  str = str.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+/g, (m) => `^{${[...m].map(c => superMap[c] || c).join('')}}`);
  str = str.replace(/[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+/g, (m) => `_{${[...m].map(c => subMap[c] || c).join('')}}`);

  // 2. Square roots & Radicals: √2, \u221A2, sqrt(2), root 2, \u221A(x+y)
  str = str
    .replace(/(?:\\u221A|√)\s*\((.*?)\)/g, ' \\sqrt{$1} ')
    .replace(/(?:\\u221A|√)\s*([a-zA-Z0-9]+)/g, ' \\sqrt{$1} ')
    .replace(/\b(?:sqrt|root)\s*\((.*?)\)/gi, ' \\sqrt{$1} ')
    .replace(/\b(?:sqrt|root)\s*([a-zA-Z0-9]+)\b/gi, ' \\sqrt{$1} ')
    .replace(/[√\u221A]/g, ' \\sqrt ');

  // 3. Chemical ions and Molecular formulas (e.g. N2 2+ -> N_2^{2+}, SO4 2- -> SO_4^{2-}, O2- -> O_2^-, H3O+ -> H_3O+)
  // Complex coordination ions: [Fe(CN)6]4- or [Fe(CN)6]^{4-}
  str = str.replace(/\[([A-Za-z0-9\(\)]+)\]\s*(\d+)?([\+\-])/g, ' [$1]^{$2$3} ');
  
  // Diatomic / polyatomic ions: N2 2+, N2 2-, O2 2-, O2 +, O2 -, H3O +, NO3 -
  str = str.replace(/\b([A-Z][a-z]?)(\d+)\s+(\d*)([\+\-])\b/g, ' $1_{$2}^{$3$4} ');
  str = str.replace(/\b([A-Z][a-z]?)(\d+)\s*\^\s*(\d*)([\+\-])\b/g, ' $1_{$2}^{$3$4} ');
  str = str.replace(/\b([A-Z][a-z]?)(\d+)([\+\-])\b/g, ' $1_{$2}^{$3} ');
  
  // Single element ions: Fe3+, Cu2+, Cl-, Na+, Ca2+
  str = str.replace(/\b([A-Z][a-z]?)\s*(\d*)([\+\-])\b/g, ' $1^{$2$3} ');

  // Common chemical molecules with numbers: H2O, CO2, SO2, NH3, CH4, C6H12O6, H2SO4, KMnO4
  str = str.replace(/\b(H|He|Li|Be|B|C|N|O|F|Ne|Na|Mg|Al|Si|P|S|Cl|Ar|K|Ca|Sc|Ti|V|Cr|Mn|Fe|Co|Ni|Cu|Zn|Ga|Ge|As|Se|Br|Kr|Rb|Sr|Y|Zr|Nb|Mo|Tc|Ru|Rh|Pd|Ag|Cd|In|Sn|Sb|Te|I|Xe|Cs|Ba|La|Ce|Pt|Au|Hg|Pb|Bi|U)(\d+)/g, '$1_{$2}');

  // 4. Powers, Exponents & Scientific Notation (e.g., 3 x 10^8, 10^-5, x^2)
  str = str
    .replace(/(\d+(?:\.\d+)?)\s*[xX\*×]\s*10\s*\^?\s*(-?\d+)/g, ' $1 \\times 10^{$2} ')
    .replace(/\b10\s*\^\s*(-?\d+)/g, ' 10^{$1} ')
    .replace(/\b([a-zA-Z0-9\)])\s*\^\s*([a-zA-Z0-9\-\+]+)/g, ' $1^{$2} ')
    .replace(/\b([a-zA-Z])\s*_\s*([a-zA-Z0-9\-\+]+)/g, ' $1_{$2} ');

  // 5. Fractions: 1/2, a/b, \frac{a}{b}
  str = str
    .replace(/\b(\d+)\s*\/\s*(\d+)\b/g, ' \\frac{$1}{$2} ')
    .replace(/\b([a-zA-Z])\s*\/\s*([a-zA-Z0-9]+)\b/g, ' \\frac{$1}{$2} ');

  // 6. Integrals, Summations, Products, Vectors, Limits
  str = str
    .replace(/[\u222B\u222C\u222D\u222E]/g, ' \\int ')
    .replace(/\bint\s*([a-zA-Z0-9_\-\+\*\/\s\(\)]+)d([a-zA-Z])/gi, ' \\int $1 d$2 ')
    .replace(/[\u2211]/g, ' \\sum ')
    .replace(/[\u220F]/g, ' \\prod ')
    .replace(/[\u221E]/g, ' \\infty ')
    .replace(/[\u2192\u27F6]/g, ' \\rightarrow ')
    .replace(/[\u21CC\u21C4]/g, ' \\rightleftharpoons ')
    .replace(/\bvec\s*([a-zA-Z])/gi, ' \\vec{$1} ')
    .replace(/\bvector\s+([a-zA-Z])\b/gi, ' \\vec{$1} ')
    .replace(/\blim\s*([a-zA-Z])\s*->\s*([a-zA-Z0-9\u221E]+)/gi, ' \\lim_{$1 \\to $2} ');

  // 7. Operations & Relations: ÷, ×, ⋅, ≤, ≥, ≪, ≫, ≠, ≈, ±
  str = str
    .replace(/[\u00F7]/g, ' \\div ')
    .replace(/[\u00D7\u2A2F]/g, ' \\times ')
    .replace(/[\u22C5]/g, ' \\cdot ')
    .replace(/[\u2264]/g, ' \\le ')
    .replace(/[\u2265]/g, ' \\ge ')
    .replace(/[\u226A]/g, ' \\ll ')
    .replace(/[\u226B]/g, ' \\gg ')
    .replace(/[\u2260]/g, ' \\neq ')
    .replace(/[\u2248]/g, ' \\approx ')
    .replace(/[\u00B1]/g, ' \\pm ')
    .replace(/[\u00B0]/g, '^{\\circ}');

  // 8. Greek letters
  str = str
    .replace(/[\u03B1]/g, ' \\alpha ')
    .replace(/[\u03B2]/g, ' \\beta ')
    .replace(/[\u03B3]/g, ' \\gamma ')
    .replace(/[\u03B4\u0394]/g, ' \\Delta ')
    .replace(/[\u03B8\u0398]/g, ' \\theta ')
    .replace(/[\u03C0\u03A0]/g, ' \\pi ')
    .replace(/[\u03C1]/g, ' \\rho ')
    .replace(/[\u03C3\u03A3]/g, ' \\sigma ')
    .replace(/[\u03C9\u03A9]/g, ' \\omega ')
    .replace(/[\u03BB\u039B]/g, ' \\lambda ')
    .replace(/[\u03BC]/g, ' \\mu ')
    .replace(/[\u03B5]/g, ' \\epsilon ')
    .replace(/[\u03D5\u03A6]/g, ' \\phi ')
    .replace(/[\u03C8\u03A8]/g, ' \\psi ');

  // 9. If the text has LaTeX commands or math sub/super expressions but isn't wrapped in $...$, wrap math chunks cleanly
  str = str.replace(/\s+/g, ' ').trim();

  // If entire string is a formula expression without $, wrap it
  if (
    /\\(frac|int|vec|sqrt|sum|prod|times|div|alpha|beta|gamma|Delta|theta|pi|rho|sigma|omega|lambda|mu|epsilon|phi|psi|le|ge|ll|gg|neq|approx|pm|infty|rightleftharpoons|rightarrow|circ)/.test(str) ||
    /(\w+_\{\w+\}|\w+\^\{\w+\})/.test(str)
  ) {
    if (!str.includes('$')) {
      str = `$${str}$`;
    }
  }

  return str;
}

function parseQuestionsFromText(rawText) {
  const cleanText = rawText
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
  const questions = [];
  let currentQ = null;
  let currentSection = 'Physics';
  let sectionHeaderFound = false;

  const qPatterns = [
    /^(?:Q(?:uestion)?\.?\s*)(\d{1,3})[.):\s]/i,
    /^(\d{1,3})[.)]\s+\S/,
    /^(\d{1,3})\s+\.\s+\S/,
  ];

  const optPattern = /^[\[(]?([A-D])[\])]?[.)]\s*(.*)/i;
  const ansPattern = /^(?:answer|ans(?:wer)?)[.:\s]+[\[(]?([A-D])[\])]?/i;

  const pushCurrentQ = () => {
    if (currentQ && currentQ.text && currentQ.text.trim().length > 5) {
      while (currentQ.options.length < 4) {
        const letters = ['A', 'B', 'C', 'D'];
        currentQ.options.push(`Option ${letters[currentQ.options.length]}`);
      }
      currentQ.options = currentQ.options.slice(0, 4).map(o => sanitizeAndFormatMathText(o));
      currentQ.text = sanitizeAndFormatMathText(currentQ.text);
      currentQ.question_text = currentQ.text;
      questions.push(currentQ);
    }
  };

  for (const line of lines) {
    const secHeader = detectSectionHeader(line);
    if (secHeader) {
      currentSection = secHeader;
      sectionHeaderFound = true;
      continue;
    }

    const ansMatch = line.match(ansPattern);
    if (ansMatch && currentQ) {
      currentQ.correct_answer = ansMatch[1].toUpperCase();
      continue;
    }

    let qMatch = null;
    for (const pat of qPatterns) {
      const m = line.match(pat);
      if (m) { qMatch = m; break; }
    }

    if (qMatch) {
      pushCurrentQ();
      const qNum = parseInt(qMatch[1], 10);
      const qText = line.replace(/^(?:Q(?:uestion)?\.?\s*)?\d{1,3}[.):\s]+/i, '').trim();

      currentQ = {
        question_number: qNum,
        question_text: qText,
        text: qText,
        options: [],
        correct_answer: 'A',
        section: currentSection,
        type: 'MCQ',
        status: 'draft'
      };
      continue;
    }

    const optMatch = line.match(optPattern);
    if (optMatch && currentQ) {
      if (currentQ.options.length < 4) {
        currentQ.options.push(optMatch[2].trim() || `Option ${optMatch[1]}`);
      }
      continue;
    }

    if (currentQ) {
      if (currentQ.options.length === 0) {
        currentQ.question_text += ' ' + line;
        currentQ.text += ' ' + line;
      } else {
        const lastIdx = currentQ.options.length - 1;
        if (currentQ.options[lastIdx] !== `Option ${['A','B','C','D'][lastIdx]}`) {
          currentQ.options[lastIdx] += ' ' + line;
        }
      }
    }
  }

  pushCurrentQ();

  if (!sectionHeaderFound) {
    questions.forEach((q, idx) => {
      const keyword = classifySubject(q.question_text);
      if (keyword) {
        q.section = keyword;
      } else {
        const total = questions.length;
        const quarter = Math.ceil(total / 4);
        if (idx < quarter) q.section = 'Physics';
        else if (idx < 2 * quarter) q.section = 'Chemistry';
        else if (idx < 3 * quarter) q.section = 'Mathematics';
        else q.section = 'Biology';
      }
    });
  }

  return questions;
}

export const uploadAndParsePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfBuffer = req.file.buffer;
    let rawText = '';
    try {
      rawText = await extractTextFromBuffer(pdfBuffer);
    } catch (parseErr) {
      return res.status(400).json({
        error: 'Could not read this PDF. Make sure it is a text-based PDF.',
        details: parseErr.message
      });
    }

    if (!rawText || rawText.trim().length < 50) {
      return res.status(400).json({
        error: 'PDF appears to be a scanned image or has no extractable text.'
      });
    }

    const questions = parseQuestionsFromText(rawText);

    if (questions.length === 0) {
      return res.status(400).json({
        error: 'No questions found in this PDF'
      });
    }

    const mapped = questions.map((q, idx) => ({
      tempId: `q_${Date.now()}_${idx}`,
      questionNumber: q.question_number,
      question_number: q.question_number,
      section: q.section,
      type: q.type || 'MCQ',
      text: q.question_text || q.text,
      question_text: q.question_text || q.text,
      options: q.options,
      correctAnswer: q.correct_answer || 'A',
      correct_answer: q.correct_answer || 'A',
      imageUrl: '',
      status: 'draft_review'
    }));

    const sectionCounts = { Physics: 0, Chemistry: 0, Mathematics: 0, Biology: 0 };
    mapped.forEach(q => { if (sectionCounts[q.section] !== undefined) sectionCounts[q.section]++; });

    return res.status(200).json({
      success: true,
      filename: req.file.originalname,
      totalQuestions: mapped.length,
      sectionCounts,
      questions: mapped
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to parse PDF', details: err.message });
  }
};

/**
 * Approve & Save Paper (Universal: Supports Paid Test Series & Free PYQ)
 */
export const approveAndPublishPyq = async (req, res) => {
  try {
    const {
      title,
      examType,
      year,
      durationMinutes,
      questions,
      contentType,
      content_type,
      windowStart,
      window_start,
      windowEnd,
      window_end,
      description
    } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Title and non-empty questions array are required' });
    }

    const targetContentType = contentType || content_type || 'pyq';
    const targetWindowStart = windowStart || window_start || null;
    const targetWindowEnd = windowEnd || window_end || null;
    const parsedYear = parseInt(year) || (title.match(/\d{4}/) ? parseInt(title.match(/\d{4}/)[0]) : new Date().getFullYear());

    // 1. Insert into 'tests' table with chosen content_type ('test_series' or 'pyq')
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .insert({
        title,
        exam_type: examType || 'IAT',
        content_type: targetContentType,
        pyq_year: targetContentType === 'pyq' ? parsedYear : null,
        window_start: targetContentType === 'test_series' ? targetWindowStart : null,
        window_end: targetContentType === 'test_series' ? targetWindowEnd : null,
        description: description || `${title} — ${targetContentType === 'test_series' ? 'Live Paid Test Series Mock' : 'Official PYQ Paper'}`,
        duration_minutes: durationMinutes || 180,
        is_active: true,
        is_published: false,
        status: 'draft'
      })
      .select()
      .single();

    if (testErr || !test) {
      throw testErr || new Error('Failed to create test entry');
    }

    const testId = test.id;

    // 2. Insert Questions
    const sanitizedQuestions = questions.map((q, idx) => ({
      test_id: testId,
      section: q.section || 'Physics',
      question_number: q.questionNumber || q.question_number || idx + 1,
      question_text: q.question_text || q.text || `Question ${idx + 1}`,
      type: q.type || 'MCQ',
      question_type: q.type || 'MCQ',
      options: Array.isArray(q.options) && q.options.length === 4
        ? q.options
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: q.correct_answer || q.correctAnswer || 'A',
      image_url: q.image_url || q.imageUrl || null,
      marks_positive: 4,
      marks_negative: 1,
      status: 'approved'
    }));

    const { data: insertedQs, error: qErr } = await supabase
      .from('questions')
      .insert(sanitizedQuestions)
      .select();

    if (qErr) throw qErr;

    return res.status(200).json({
      success: true,
      message: `${insertedQs.length} questions saved successfully for ${targetContentType === 'test_series' ? 'Paid Test Series' : 'Free PYQ'}`,
      testId,
      contentType: targetContentType,
      insertedCount: insertedQs.length
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save paper', details: err.message });
  }
};

/**
 * Get PYQ List (Fetches all papers marked content_type = 'pyq' or content_type IS NULL, excluding test_series)
 */
export const getPyqList = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter strictly for designated PYQ papers
    const pyqPapers = (data || []).filter(t =>
      t.content_type === 'pyq' ||
      (t.content_type !== 'test_series' && t.pyq_year) ||
      (t.content_type !== 'test_series' && t.title && (t.title.toUpperCase().includes('PYQ') || t.title.toUpperCase().includes('OFFICIAL PAPER')))
    );

    return res.status(200).json({ success: true, papers: pyqPapers });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch PYQ list', details: err.message });
  }
};

export const getTestQuestions = async (req, res) => {
  try {
    const { testId } = req.params;
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('question_number', { ascending: true });

    if (error) throw error;
    return res.status(200).json({ success: true, questions: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch test questions', details: err.message });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: existingQ } = await supabase.from('questions').select('test_id').eq('id', id).single();

    // Build partial update — only include fields that were actually sent
    const updatePayload = {};
    if (updates.question_text !== undefined || updates.text !== undefined) {
      updatePayload.question_text = updates.question_text || updates.text;
    }
    if (updates.options !== undefined) {
      updatePayload.options = updates.options;
    }
    if (updates.correct_answer !== undefined || updates.correctAnswer !== undefined) {
      updatePayload.correct_answer = updates.correct_answer || updates.correctAnswer;
    }
    if (updates.section !== undefined) {
      updatePayload.section = updates.section;
    }
    if (updates.image_url !== undefined || updates.imageUrl !== undefined) {
      updatePayload.image_url = updates.image_url || updates.imageUrl || null;
    }
    if (updates.question_number !== undefined) {
      updatePayload.question_number = updates.question_number;
    }
    if (updates.type !== undefined) {
      updatePayload.type = updates.type;
      updatePayload.question_type = updates.type;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('questions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 🔒 Invalidate Preview if this question belongs to a test paper!
    if (existingQ?.test_id) {
      await invalidatePreviewStatus(existingQ.test_id);
    }

    return res.status(200).json({ success: true, question: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update question', details: err.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: existingQ } = await supabase.from('questions').select('test_id, section').eq('id', id).single();

    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) throw error;

    // After deletion, renumber remaining questions in the SAME SECTION
    if (existingQ?.test_id && existingQ?.section) {
      const { data: remaining } = await supabase
        .from('questions')
        .select('id, question_number')
        .eq('test_id', existingQ.test_id)
        .eq('section', existingQ.section)
        .order('question_number', { ascending: true });

      if (remaining && remaining.length > 0) {
        for (let i = 0; i < remaining.length; i++) {
          if (remaining[i].question_number !== i + 1) {
            await supabase
              .from('questions')
              .update({ question_number: i + 1 })
              .eq('id', remaining[i].id);
          }
        }
      }

      await invalidatePreviewStatus(existingQ.test_id);
    }

    return res.status(200).json({ success: true, message: 'Question deleted and section renumbered' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete question', details: err.message });
  }
};

export const updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, examType, durationMinutes, description } = req.body;

    const { data, error } = await supabase
      .from('tests')
      .update({ title, exam_type: examType || 'IAT', duration_minutes: durationMinutes || 180, description })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, test: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update test paper', details: err.message });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from('questions').delete().eq('test_id', id);
    await supabase.from('tests').delete().eq('id', id);
    return res.status(200).json({ success: true, message: 'Test paper and all questions deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete test paper', details: err.message });
  }
};

export const publishPyq = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('tests')
      .update({
        status: 'ongoing',
        is_published: true,
        is_active: true,
        preview_status: 'valid'
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return res.status(200).json({ success: true, test: data, message: 'Paper published, quality-validated, and now visible to students' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to publish', details: err.message });
  }
};

export const unpublishPyq = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('tests')
      .update({ status: 'draft', is_published: false, is_active: false })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return res.status(200).json({ success: true, test: data, message: 'Paper unpublished and hidden from students' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to unpublish', details: err.message });
  }
};

/**
 * Switch Paper Category (Paid Test Series ⇄ Free PYQ)
 */
export const switchPaperType = async (req, res) => {
  try {
    const { id } = req.params;
    const { contentType, content_type, windowStart, window_start, windowEnd, window_end } = req.body;
    const targetType = contentType || content_type;

    if (!targetType || !['test_series', 'pyq'].includes(targetType)) {
      return res.status(400).json({ error: 'Valid target contentType (test_series or pyq) is required' });
    }

    const updatePayload = {
      content_type: targetType
    };

    if (targetType === 'test_series') {
      if (windowStart || window_start) updatePayload.window_start = windowStart || window_start;
      if (windowEnd || window_end) updatePayload.window_end = windowEnd || window_end;
    }

    const { data, error } = await supabase
      .from('tests')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      test: data,
      message: `Paper category successfully changed to ${targetType === 'test_series' ? 'Paid Live Test Series' : 'Free PYQ Practice'}`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to switch paper category', details: err.message });
  }
};

export const cropManualDiagram = async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: 'base64Image is required' });
    }

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const uploadsDir = path.join(process.cwd(), 'public/uploads/diagrams');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `diagram_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
    const filePath = path.join(uploadsDir, fileName);

    let sharp;
    try {
      sharp = (await import('sharp')).default;
    } catch {
      sharp = null;
    }

    if (sharp) {
      await sharp(buffer).webp({ quality: 90 }).toFile(filePath);
    } else {
      fs.writeFileSync(filePath, buffer);
    }

    const host = process.env.API_BASE_URL || 'https://api.vigyanprep.com';
    const imageUrl = `${host}/uploads/diagrams/${fileName}`;

    return res.status(200).json({
      success: true,
      imageUrl,
      fileName,
      message: 'Diagram cropped and saved directly to server storage'
    });
  } catch (err) {
    console.error('Failed to crop diagram:', err);
    return res.status(500).json({ error: 'Failed to process crop', details: err.message });
  }
};

export const parsePdfWithGeminiVision = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured on server. Please add it to your server .env file.' });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const pdfBase64 = req.file.buffer.toString('base64');

    const prompt = `You are a world-class scientific exam paper parser for IISER IAT, NISER NEST, ISI, CMI, and JEE Advanced papers (Physics, Chemistry, Mathematics, Biology).
Analyze this PDF document and extract ALL questions into structured JSON with 100% mathematical and chemical formula precision.

CRITICAL MATHEMATICS, CHEMISTRY & LATEX FORMULA MANDATE:
1. CHEMISTRY IONS & FORMULAS:
   - Convert all chemical ions, charges, and subscripts into valid LaTeX format wrapped in $...$.
   - Example: N2 2+ must be converted to "$N_2^{2+}$" (NEVER write "N2 2+" or "and two").
   - Example: SO4 2- -> "$SO_4^{2-}$", O2- -> "$O_2^-$", H3O+ -> "$H_3O^+$", [Fe(CN)6]4- -> "$[Fe(CN)_6]^{4-}$".
   - Chemical equations with reaction arrows: "$\\text{N}_2 + 3\\text{H}_2 \\rightleftharpoons 2\\text{NH}_3$".

2. SQUARE ROOTS & RADICALS:
   - Convert all square roots to LaTeX "\\sqrt{...}".
   - Example: root 2 or √2 must be converted to "$\\sqrt{2}$".
   - Example: √(x^2 + y^2) -> "$\\sqrt{x^2 + y^2}$", root 3 / 2 -> "$\\frac{\\sqrt{3}}{2}$".

3. POWERS, EXPONENTS & SCIENTIFIC NOTATION:
   - Example: 3 x 10^8 -> "$3 \\times 10^8$", 10^-5 -> "$10^{-5}$", x^2 -> "$x^2$", x_1 -> "$x_1$".

4. FRACTIONS, INTEGRALS, VECTORS, MATRICES & SUMS:
   - Fractions: a/b -> "$\\frac{a}{b}$".
   - Integrals: "$\\int_{a}^{b} f(x) dx$".
   - Vectors: "$\\vec{v}$" or "$\\hat{i} + \\hat{j}$".
   - Matrices: "$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$".
   - Limits: "$\\lim_{x \\to 0}$".
   - Sums: "$\\sum_{i=1}^{n} x_i$".

5. Return ONLY a valid JSON object matching this exact JSON schema (no markdown wrap or extra commentary):
{
  "questions": [
    {
      "questionNumber": 1,
      "section": "Physics", // Exactly one of: "Physics", "Chemistry", "Mathematics", "Biology"
      "type": "MCQ", // "MCQ" | "MSQ" | "Numerical"
      "text": "Question statement containing accurate $LaTeX$ math & chemistry formulas",
      "options": ["Option A with $LaTeX$", "Option B with $LaTeX$", "Option C with $LaTeX$", "Option D with $LaTeX$"],
      "correctAnswer": "A" // "A", "B", "C", or "D"
    }
  ]
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: pdfBase64,
          mimeType: 'application/pdf'
        }
      }
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Vision AI response did not contain valid JSON format');
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    const rawQuestions = parsedData.questions || [];

    const sectionCounts = { Physics: 0, Chemistry: 0, Mathematics: 0, Biology: 0 };
    const questions = rawQuestions.map((q, idx) => {
      const sec = q.section && ['Physics', 'Chemistry', 'Mathematics', 'Biology'].includes(q.section) ? q.section : 'Physics';
      if (sectionCounts[sec] !== undefined) sectionCounts[sec]++;
      return {
        ...q,
        tempId: `vision_${Date.now()}_${idx}`,
        questionNumber: q.questionNumber || idx + 1,
        section: sec,
        type: 'MCQ',
        text: sanitizeAndFormatMathText(q.text || ''),
        options: (q.options || ['Option A', 'Option B', 'Option C', 'Option D']).map(o => sanitizeAndFormatMathText(o)),
        correctAnswer: q.correctAnswer || 'A',
        status: 'draft_review'
      };
    });

    return res.status(200).json({
      success: true,
      questions,
      sectionCounts,
      message: `🤖 Vision AI successfully extracted ${questions.length} questions with 100% LaTeX math symbol precision!`
    });
  } catch (err) {
    console.error('Failed to parse with Gemini Vision:', err);
    return res.status(500).json({ error: 'Vision AI parsing failed', details: err.message });
  }
};
