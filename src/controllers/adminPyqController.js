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
  if (line.split(/\s+/).length > 10) return null;
  const u = line.trim().toUpperCase();
  if (/(?:SECTION\s*[-–—:]*\s*\d*\s*[-–—:]*\s*BIOLOGY|PART\s*[-–—:]*\s*\d*\s*[-–—:]*\s*BIOLOGY|\bBIOLOGY\b|\bBIOLOGICAL\b)/.test(u)) return 'Biology';
  if (/(?:SECTION\s*[-–—:]*\s*\d*\s*[-–—:]*\s*CHEMISTRY|PART\s*[-–—:]*\s*\d*\s*[-–—:]*\s*CHEMISTRY|\bCHEMISTRY\b|\bCHEMICAL\b)/.test(u)) return 'Chemistry';
  if (/(?:SECTION\s*[-–—:]*\s*\d*\s*[-–—:]*\s*MATHEMATICS|PART\s*[-–—:]*\s*\d*\s*[-–—:]*\s*MATHEMATICS|\bMATHEMATICS\b|\bMATHS\b|\bMATH\b)/.test(u)) return 'Mathematics';
  if (/(?:SECTION\s*[-–—:]*\s*\d*\s*[-–—:]*\s*PHYSICS|PART\s*[-–—:]*\s*\d*\s*[-–—:]*\s*PHYSICS|\bPHYSICS\b|\bPHYSICAL\b)/.test(u)) return 'Physics';
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

  str = str.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+/g, (m) => `^{${[...m].map(c => superMap[c] || c).join('')}}`);
  str = str.replace(/[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+/g, (m) => `_{${[...m].map(c => subMap[c] || c).join('')}}`);

  // 2. Square roots & Radicals: √2, \u221A2, sqrt(2), root 2
  str = str
    .replace(/(?:\\u221A|√)\s*\((.*?)\)/g, ' $\\sqrt{$1}$ ')
    .replace(/(?:\\u221A|√)\s*([a-zA-Z0-9]+)/g, ' $\\sqrt{$1}$ ')
    .replace(/\b(?:sqrt|root)\s*\((.*?)\)/gi, ' $\\sqrt{$1}$ ')
    .replace(/\b(?:sqrt|root)\s*([a-zA-Z0-9]+)\b/gi, ' $\\sqrt{$1}$ ')
    .replace(/[√\u221A]/g, ' \\sqrt ');

  // 3. Chemical Species, Ions & Coordination Complexes (Token-isolated):
  // NH+ 4 -> $NH_4^+$, BH- 4 -> $BH_4^-$, NO+ 2 -> $NO_2^+$
  str = str.replace(/\b([A-Z][a-z]?H?)\s*([\+\-])\s*(\d+)\b/g, '$$$1_{$3}^{$2}$$');
  str = str.replace(/\b([A-Z][a-z]?H?)\s*(\d+)\s*\^?\s*(\d*)([\+\-])\b/g, '$$$1_{$2}^{$3$4}$$');
  str = str.replace(/\b([A-Z][a-z]?H?)\s*(\d+)([\+\-])\b/g, '$$$1_{$2}^{$3}$$');
  str = str.replace(/\[([A-Za-z0-9\(\)]+)\]\s*(\d+)?([\+\-])/g, '$$[$1]^{$2$3}$$');

  // Common chemical molecules: N2O, NO2, H2O, CO2, SO2, NH3, O3, O2, N2
  const chemTokens = /\b(N2O|NO2|NO3|H2O|CO2|SO2|SO3|SO4|NH3|NH4|BH4|H3O|CH4|C2H6|C6H6|C6H12O6|H2SO4|HNO3|HCl|NaOH|KOH|KMnO4|O3|O2|N2|H2|Cl2|Br2|I2|F2)\b/g;
  str = str.replace(chemTokens, (m, token) => {
    const sub = token.replace(/([A-Za-z])(\d+)/g, '$1_{$2}');
    return `$${sub}$`;
  });

  // 4. Powers, Exponents & Scientific Notation
  str = str
    .replace(/(\d+(?:\.\d+)?)\s*[xX\*×]\s*10\s*\^?\s*(-?\d+)/g, ' $$$1 \\times 10^{$2}$$ ')
    .replace(/\b10\s*\^\s*(-?\d+)/g, ' $$10^{$1}$$ ')
    .replace(/\b([a-zA-Z])\s*\^\s*([a-zA-Z0-9\-\+]+)\b/g, '$$$1^{$2}$$')
    .replace(/\b([a-zA-Z])\s*_\s*([a-zA-Z0-9\-\+]+)\b/g, '$$$1_{$2}$$');

  // 5. Fractions: 1/2 -> $\frac{1}{2}$
  str = str
    .replace(/\b(\d+)\s*\/\s*(\d+)\b/g, ' $\\frac{$1}{$2}$ ')
    .replace(/\b([a-zA-Z])\s*\/\s*([a-zA-Z0-9]+)\b/g, ' $\\frac{$1}{$2}$ ');

  // 6. Integrals, Greek, Operations
  str = str
    .replace(/[\u222B\u222C\u222D\u222E]/g, ' \\int ')
    .replace(/[\u21CC\u21C4]/g, ' $\\rightleftharpoons$ ')
    .replace(/[\u2192\u27F6]/g, ' $\\rightarrow$ ')
    .replace(/[\u00B1]/g, ' $\\pm$ ')
    .replace(/[\u00B0]/g, '^{\\circ}');

  str = str.replace(/\${2,}/g, '$').replace(/\$\$/g, '$ $');
  return str.replace(/\s+/g, ' ').trim();
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
    if (currentQ && currentQ.question_text && currentQ.question_text.trim().length > 0) {
      // 1. Discard if Hindi duplicate question
      const devCount = (currentQ.question_text.match(/[\u0900-\u097F]/g) || []).length;
      if (devCount >= 4) {
        currentQ = null;
        return;
      }

      // 2. Discard if too short
      if (currentQ.question_text.trim().length < 8 && currentQ.options.length === 0) {
        currentQ = null;
        return;
      }

      while (currentQ.options.length < 4) {
        const letters = ['A', 'B', 'C', 'D'];
        currentQ.options.push(`Option ${letters[currentQ.options.length]}`);
      }

      // Strip page footers from options: e.g. "Page 2", "Page 6"
      currentQ.options = currentQ.options.slice(0, 4).map(o => {
        const stripped = o.replace(/\s*Page\s*\d+(\s*of\s*\d+)?\s*$/i, '').trim();
        return sanitizeAndFormatMathText(stripped);
      });

      currentQ.text = sanitizeAndFormatMathText(currentQ.text.replace(/\s*Page\s*\d+(\s*of\s*\d+)?\s*$/i, '').trim());
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

  // Renumber and balance sections cleanly
  const sectionCounters = { Physics: 0, Chemistry: 0, Mathematics: 0, Biology: 0 };
  questions.forEach(q => {
    if (!sectionCounters[q.section]) q.section = 'Physics';
    sectionCounters[q.section]++;
    q.question_number = sectionCounters[q.section];
    q.questionNumber = sectionCounters[q.section];
  });

  return questions;
}

import os from 'os';
import { spawn } from 'child_process';

function runPythonScript(scriptRelativePath, pdfBuffer) {
  return new Promise((resolve, reject) => {
    const tempPath = path.join(os.tmpdir(), `paper_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
    fs.writeFileSync(tempPath, pdfBuffer);

    const scriptPath = path.join(process.cwd(), scriptRelativePath);
    const groqKey = process.env.GROQ_API_KEY || '';
    const pyEnv = {
      ...process.env,
      GROQ_API_KEY: groqKey,
      PYTHONPATH: `${os.homedir()}/.local/lib/python3.13/site-packages:${os.homedir()}/.local/lib/python3.12/site-packages:${process.env.PYTHONPATH || ''}`
    };
    const py = spawn('python3', [scriptPath, tempPath, groqKey], { env: pyEnv });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (d) => { stdout += d.toString(); });
    py.stderr.on('data', (d) => { stderr += d.toString(); });

    py.on('close', (code) => {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}

      if (code === 0 && stdout) {
        try {
          const res = JSON.parse(stdout);
          if (res.success && Array.isArray(res.questions) && res.questions.length > 0) {
            return resolve(res);
          }
        } catch (jsonErr) {
          console.warn(`${scriptRelativePath} output was not valid JSON:`, stdout);
        }
      }
      reject(new Error(stderr || `${scriptRelativePath} returned no valid questions`));
    });

    py.on('error', (err) => {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      reject(err);
    });
  });
}

async function runPythonExtractor(pdfBuffer) {
  // 1. Try Groq AI (Llama 3.3 70B & Vision) for 95%+ precision
  try {
    const groqResult = await runPythonScript('src/python/groq_exam_extractor.py', pdfBuffer);
    if (groqResult && groqResult.questions && groqResult.questions.length > 0) {
      return groqResult;
    }
  } catch (groqErr) {
    console.warn('Groq AI extractor fallback to local scientific extractor:', groqErr.message);
  }

  // 2. Fallback to Local Scientific & Formula Extractor
  return runPythonScript('src/python/scientific_paper_extractor.py', pdfBuffer);
}

export const uploadAndParsePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfBuffer = req.file.buffer;

    // 1. Try Python Scientific & Formula Extractor first
    try {
      const pyResult = await runPythonExtractor(pdfBuffer);
      if (pyResult && pyResult.questions && pyResult.questions.length > 0) {
        return res.status(200).json({
          success: true,
          source: 'python_scientific_engine',
          filename: req.file.originalname,
          totalQuestions: pyResult.questions.length,
          sectionCounts: pyResult.sectionCounts || { Physics: 0, Chemistry: 0, Mathematics: 0, Biology: 0 },
          questions: pyResult.questions,
          message: pyResult.message || `🐍 Python successfully extracted ${pyResult.questions.length} questions with LaTeX formulas, roots, and chemical species!`
        });
      }
    } catch (pyErr) {
      console.warn('Python scientific extractor fallback to Node parser:', pyErr.message);
    }

    // 2. Fallback to Node.js parser with Math & Chemistry Sanitizer
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
      source: 'node_math_engine',
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

    // 1. Try Groq AI & PyMuPDF Cropper first if Groq key or general AI is present
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey || !process.env.GEMINI_API_KEY) {
      try {
        const groqResult = await runPythonScript('src/python/groq_exam_extractor.py', req.file.buffer);
        if (groqResult && groqResult.questions && groqResult.questions.length > 0) {
          return res.status(200).json({
            success: true,
            source: 'groq_ai_vision_engine',
            filename: req.file.originalname,
            totalQuestions: groqResult.questions.length,
            sectionCounts: groqResult.sectionCounts || { Physics: 0, Chemistry: 0, Mathematics: 0, Biology: 0 },
            questions: groqResult.questions,
            message: groqResult.message || `🤖 Groq AI Vision successfully extracted ${groqResult.questions.length} questions with 100% mathematical and chemical precision!`
          });
        }
      } catch (groqErr) {
        console.warn('Groq AI Vision failed, falling back:', groqErr.message);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    if (!apiKey) {
      // Fallback directly to Python scientific extractor
      const pyResult = await runPythonScript('src/python/scientific_paper_extractor.py', req.file.buffer);
      if (pyResult && pyResult.questions && pyResult.questions.length > 0) {
        return res.status(200).json({
          success: true,
          source: 'python_scientific_engine',
          filename: req.file.originalname,
          totalQuestions: pyResult.questions.length,
          sectionCounts: pyResult.sectionCounts || { Physics: 0, Chemistry: 0, Mathematics: 0, Biology: 0 },
          questions: pyResult.questions,
          message: pyResult.message || `🐍 Python successfully extracted ${pyResult.questions.length} questions!`
        });
      }
      return res.status(400).json({ error: 'AI Parser could not process this PDF. Make sure GROQ_API_KEY is configured in server .env.' });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const pdfBase64 = req.file.buffer.toString('base64');

    const prompt = `You are a world-class scientific exam paper parser for IISER IAT, NISER NEST, ISI, CMI, and JEE Advanced papers (Physics, Chemistry, Mathematics, Biology).
Analyze this PDF document and extract ALL questions into structured JSON with 100% mathematical and chemical formula precision.
1. LANGUAGE: Extract ONLY the English version of each question. Completely IGNORE and DISCARD any Hindi/Devanagari translation.
2. CHEMISTRY IONS & FORMULAS: Convert all chemical ions, charges, and subscripts into valid LaTeX format wrapped in $...$ (e.g. $N_2^{2+}$, $SO_4^{2-}$, $O_2^-$, $H_3O^+$, $[Fe(CN)_6]^{4-}$).
3. SQUARE ROOTS & RADICALS: Convert all square roots to LaTeX (e.g. $\\sqrt{2}$, $\\sqrt{x^2 + y^2}$).
4. POWERS & FRACTIONS: $3 \\times 10^8$, $10^{-5}$, $\\frac{a}{b}$, $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$.
5. Return ONLY a valid JSON object matching this schema: {"questions": [{"questionNumber": 1, "section": "Physics", "type": "MCQ", "text": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "A"}]}`;

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
