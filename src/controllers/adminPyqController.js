import { supabase } from '../db/supabase.js';
// ✅ FIXED: pdf-parse v2+ exports PDFParse as a named class, not a default function
import { PDFParse } from 'pdf-parse';

// Helper: parse PDF buffer → plain text string
// PDFParse v2+ API: pass data in constructor options, call getText()
async function extractTextFromBuffer(buffer) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  // result.pages is an array of { text, num }
  if (result && result.pages && Array.isArray(result.pages)) {
    return result.pages.map(p => p.text || '').join('\n');
  }
  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPROVED SUBJECT CLASSIFIER
// Uses exam-paper keyword matching (Physics > Chemistry > Math > Biology)
// ─────────────────────────────────────────────────────────────────────────────
function classifySubject(text) {
  const t = text.toLowerCase();

  const biology = ['cell', 'dna', 'rna', 'gene', 'protein', 'enzyme', 'plant',
    'animal', 'organism', 'chromosome', 'photosynthesis', 'respiration',
    'nucleus', 'membrane', 'evolution', 'species', 'ecology', 'mitosis',
    'meiosis', 'bacteria', 'virus', 'fungi', 'hormone', 'blood', 'tissue'];

  const chemistry = ['reaction', 'acid', 'base', 'bond', 'mole', 'compound',
    'organic', 'element', 'periodic', 'oxidation', 'reduction', 'ionization',
    'equilibrium', 'entropy', 'enthalpy', 'activation', 'catalyst', 'polymer',
    'alkane', 'alkene', 'benzene', 'carbonate', 'hydroxide', 'valence',
    'crystal', 'lattice', 'electrode', 'electrolysis'];

  const maths = ['matrix', 'integral', 'derivative', 'differential', 'polynomial',
    'probability', 'vector', 'determinant', 'eigenvalue', 'sequence', 'series',
    'limit', 'continuous', 'function', 'trigonometry', 'logarithm', 'complex',
    'permutation', 'combination', 'binomial', 'coordinate', 'parabola',
    'hyperbola', 'ellipse', 'circle', 'triangle', 'calculus', 'summation'];

  const physics = ['force', 'velocity', 'acceleration', 'mass', 'energy', 'power',
    'momentum', 'electric', 'magnetic', 'current', 'voltage', 'resistance',
    'capacitor', 'inductor', 'photon', 'wavelength', 'frequency', 'refraction',
    'reflection', 'gravity', 'pressure', 'temperature', 'entropy', 'wave',
    'quantum', 'orbit', 'angular', 'torque', 'work', 'kinetic', 'potential'];

  let bioScore = biology.filter(k => t.includes(k)).length;
  let chemScore = chemistry.filter(k => t.includes(k)).length;
  let mathScore = maths.filter(k => t.includes(k)).length;
  let physScore = physics.filter(k => t.includes(k)).length;

  const max = Math.max(bioScore, chemScore, mathScore, physScore);
  if (max === 0) return null; // unknown – will use positional fallback
  if (max === physScore) return 'Physics';
  if (max === chemScore) return 'Chemistry';
  if (max === mathScore) return 'Mathematics';
  return 'Biology';
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER DETECTOR
// Detects lines like "PHYSICS", "SECTION A", "PART I – BIOLOGY", etc.
// ─────────────────────────────────────────────────────────────────────────────
function detectSectionHeader(line) {
  const u = line.trim().toUpperCase();
  if (/\bPHYSICS\b/.test(u)) return 'Physics';
  if (/\bCHEMISTR/.test(u)) return 'Chemistry';
  if (/\bMATH/.test(u)) return 'Mathematics';
  if (/\bBIOLOG/.test(u)) return 'Biology';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCURATE PDF PARSER FOR IAT / NEST PAPERS
// Handles:
//   • Q1, Q.1, 1., 1) numbered questions
//   • Multi-line question text
//   • Options: A) B) C) D), (A) (B) (C) (D), A. B. C. D.
//   • Section headers embedded in PDF text
//   • Answer keys if present (Answer: B, Ans: C)
// ─────────────────────────────────────────────────────────────────────────────
function parseQuestionsFromText(rawText) {
  const cleanText = rawText
    .replace(/\u0000/g, '')           // null bytes
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\f/g, '\n')             // form feeds → newline
    .replace(/[ \t]{2,}/g, ' ')      // collapse multiple spaces
    .trim();

  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  const questions = [];
  let currentQ = null;
  let currentSection = 'Physics'; // default

  // Patterns
  const qPatterns = [
    // "Q1.", "Q. 1", "Question 1.", "Q1)"
    /^(?:Q(?:uestion)?\.?\s*)(\d{1,3})[.):\s]/i,
    // "1.", "1)", "1 ."
    /^(\d{1,3})[.)]\s+\S/,
    // "1 ." with space before dot
    /^(\d{1,3})\s+\.\s+\S/,
  ];

  // Option patterns: A) B) C) D)  or  (A) (B) (C) (D)  or  A. B. C.
  const optPattern = /^[\[(]?([A-D])[\])]?[.)]\s*(.*)/i;

  // Answer key pattern: "Answer: B", "Ans. C", "Correct Answer: (D)"
  const ansPattern = /^(?:answer|ans(?:wer)?)[.:\s]+[\[(]?([A-D])[\])]?/i;

  const pushCurrentQ = () => {
    if (currentQ && currentQ.text && currentQ.text.trim().length > 5) {
      // Pad options to 4 if needed
      while (currentQ.options.length < 4) {
        const letters = ['A', 'B', 'C', 'D'];
        currentQ.options.push(`Option ${letters[currentQ.options.length]}`);
      }
      // Ensure only 4 options
      currentQ.options = currentQ.options.slice(0, 4);
      questions.push(currentQ);
    }
  };

  for (const line of lines) {
    // 1. Section header detection
    const secHeader = detectSectionHeader(line);
    if (secHeader && line.split(/\s+/).length <= 4) {
      currentSection = secHeader;
      continue;
    }

    // 2. Answer key line
    const ansMatch = line.match(ansPattern);
    if (ansMatch && currentQ) {
      currentQ.correct_answer = ansMatch[1].toUpperCase();
      continue;
    }

    // 3. New question detection
    let qMatch = null;
    for (const pat of qPatterns) {
      const m = line.match(pat);
      if (m) { qMatch = m; break; }
    }

    if (qMatch) {
      pushCurrentQ();
      const qNum = parseInt(qMatch[1], 10);
      // Text after the question number
      const qText = line.replace(/^(?:Q(?:uestion)?\.?\s*)?\d{1,3}[.):\s]+/i, '').trim();

      currentQ = {
        question_number: qNum,
        question_text: qText,
        text: qText,
        options: [],
        correct_answer: 'A',
        section: currentSection, // positional section
        type: 'MCQ',
        status: 'draft'
      };
      continue;
    }

    // 4. Option line
    const optMatch = line.match(optPattern);
    if (optMatch && currentQ) {
      if (currentQ.options.length < 4) {
        currentQ.options.push(optMatch[2].trim() || `Option ${optMatch[1]}`);
      }
      continue;
    }

    // 5. Continuation of current question or option
    if (currentQ) {
      if (currentQ.options.length === 0) {
        // Still building question text
        currentQ.question_text += ' ' + line;
        currentQ.text += ' ' + line;
      } else {
        // Continuation of last option
        const lastIdx = currentQ.options.length - 1;
        if (currentQ.options[lastIdx] !== `Option ${['A','B','C','D'][lastIdx]}`) {
          currentQ.options[lastIdx] += ' ' + line;
        }
      }
    }
  }

  pushCurrentQ(); // push last question

  // ── Post-process: refine subject classification using question text
  const SECTION_SIZES = [15, 15, 15, 15]; // IAT: 15 Q per subject approx
  let boundaries = [0, SECTION_SIZES[0], SECTION_SIZES[0]+SECTION_SIZES[1], SECTION_SIZES[0]+SECTION_SIZES[1]+SECTION_SIZES[2]];

  questions.forEach((q, idx) => {
    // Try keyword-based classification first
    const keyword = classifySubject(q.question_text);
    if (keyword) {
      q.section = keyword;
    } else {
      // Fall back to positional assignment
      const total = questions.length;
      const quarter = Math.ceil(total / 4);
      if (idx < quarter) q.section = 'Physics';
      else if (idx < 2 * quarter) q.section = 'Chemistry';
      else if (idx < 3 * quarter) q.section = 'Mathematics';
      else q.section = 'Biology';
    }
  });

  return questions;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER: Upload & Parse PDF
// ─────────────────────────────────────────────────────────────────────────────
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
      console.error('PDFParse error:', parseErr);
      return res.status(400).json({
        error: 'Could not read this PDF. Make sure it is a text-based PDF (not a scanned image).',
        details: parseErr.message
      });
    }

    if (!rawText || rawText.trim().length < 50) {
      return res.status(400).json({
        error: 'PDF appears to be a scanned image or has no extractable text. Please use a text-based PDF.'
      });
    }

    const questions = parseQuestionsFromText(rawText);

    if (questions.length === 0) {
      return res.status(400).json({
        error: 'No questions found in this PDF',
        details: 'Make sure questions are numbered (e.g., "1.", "Q1.", "Question 1") with options labeled A, B, C, D.',
        rawTextSample: rawText.substring(0, 300)
      });
    }

    // Map to frontend format (must have tempId, text, options, section, type, correctAnswer)
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

    return res.status(200).json({
      success: true,
      filename: req.file.originalname,
      totalQuestions: mapped.length,
      questions: mapped,
      debug: {
        extractedChars: rawText.length,
        linesProcessed: rawText.split('\n').length
      }
    });

  } catch (err) {
    console.error('PDF upload/parse error:', err);
    return res.status(500).json({ error: 'Failed to parse PDF', details: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER: Approve & Publish PYQ to Supabase
// ─────────────────────────────────────────────────────────────────────────────
export const approveAndPublishPyq = async (req, res) => {
  try {
    const { title, examType, year, durationMinutes, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Title and non-empty questions array are required' });
    }

    // 1. Insert Test Record into 'tests' table
    let testId = null;
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .insert({
        title,
        exam_type: examType || 'IAT',
        description: `${title} — Official Question Paper`,
        duration_minutes: durationMinutes || 180,
        is_active: true,
        is_published: true
      })
      .select()
      .single();

    if (testErr || !test) {
      console.warn('tests insert failed, trying test_series:', testErr?.message);
      // Fallback to test_series table
      const { data: series, error: seriesErr } = await supabase
        .from('test_series')
        .insert({
          title,
          test_type: examType || 'IAT',
          duration_minutes: durationMinutes || 180,
          is_published: true
        })
        .select()
        .single();

      if (seriesErr || !series) {
        throw testErr || seriesErr || new Error('Failed to create test entry in any table');
      }
      testId = series.id;
    } else {
      testId = test.id;
    }

    // 2. Format & Insert Questions
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
      status: 'active'
    }));

    const { data: insertedQs, error: qErr } = await supabase
      .from('questions')
      .insert(sanitizedQuestions)
      .select();

    if (qErr) {
      console.error('Questions insert error:', qErr);
      throw qErr;
    }

    return res.status(200).json({
      success: true,
      message: `${insertedQs.length} questions published successfully`,
      testId,
      insertedCount: insertedQs.length
    });

  } catch (err) {
    console.error('Publishing error:', err);
    return res.status(500).json({ error: 'Failed to publish PYQ', details: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER: Get PYQ List
// ─────────────────────────────────────────────────────────────────────────────
export const getPyqList = async (req, res) => {
  try {
    const { data: testsData } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: seriesData } = await supabase
      .from('test_series')
      .select('*')
      .order('created_at', { ascending: false });

    const combined = [...(testsData || []), ...(seriesData || [])];
    const uniqueMap = new Map();
    combined.forEach(t => {
      if (t && t.id && !uniqueMap.has(t.id)) uniqueMap.set(t.id, t);
    });

    return res.status(200).json({ success: true, tests: Array.from(uniqueMap.values()) });
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
      .or(`test_id.eq.${testId},test_series_id.eq.${testId}`)
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

    const { data, error } = await supabase
      .from('questions')
      .update({
        question_text: updates.question_text || updates.text,
        options: updates.options,
        correct_answer: updates.correct_answer || updates.correctAnswer,
        section: updates.section,
        image_url: updates.image_url || updates.imageUrl || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, question: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update question', details: err.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Question deleted' });
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

    await supabase
      .from('test_series')
      .update({ title, test_type: examType || 'IAT', duration_minutes: durationMinutes || 180 })
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ success: true, test: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update test paper', details: err.message });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from('questions').delete().or(`test_id.eq.${id},test_series_id.eq.${id}`);
    await supabase.from('tests').delete().eq('id', id);
    await supabase.from('test_series').delete().eq('id', id);
    return res.status(200).json({ success: true, message: 'Test paper and all questions deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete test paper', details: err.message });
  }
};
