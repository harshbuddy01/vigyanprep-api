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
  const biology = ['cell', 'dna', 'rna', 'gene', 'protein', 'enzyme', 'plant', 'animal', 'organism', 'species'];
  const chemistry = ['reaction', 'acid', 'base', 'bond', 'mole', 'compound', 'organic', 'element', 'periodic'];
  const maths = ['matrix', 'integral', 'derivative', 'differential', 'probability', 'vector', 'calculus'];
  const physics = ['force', 'velocity', 'acceleration', 'mass', 'energy', 'power', 'momentum', 'electric'];

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
  const u = line.trim().toUpperCase();
  if (/\bPHYSICS\b/.test(u)) return 'Physics';
  if (/\bCHEMISTR/.test(u)) return 'Chemistry';
  if (/\bMATH/.test(u)) return 'Mathematics';
  if (/\bBIOLOG/.test(u)) return 'Biology';
  return null;
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
      currentQ.options = currentQ.options.slice(0, 4);
      questions.push(currentQ);
    }
  };

  for (const line of lines) {
    const secHeader = detectSectionHeader(line);
    if (secHeader && line.split(/\s+/).length <= 4) {
      currentSection = secHeader;
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

    return res.status(200).json({
      success: true,
      filename: req.file.originalname,
      totalQuestions: mapped.length,
      questions: mapped
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to parse PDF', details: err.message });
  }
};

/**
 * Approve & Publish PYQ Paper
 */
export const approveAndPublishPyq = async (req, res) => {
  try {
    const { title, examType, year, durationMinutes, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Title and non-empty questions array are required' });
    }

    // Extract year from title if year not explicitly passed
    const parsedYear = parseInt(year) || (title.match(/\d{4}/) ? parseInt(title.match(/\d{4}/)[0]) : new Date().getFullYear());

    // 1. Insert PYQ into 'tests' table strictly with content_type = 'pyq'
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .insert({
        title,
        exam_type: examType || 'IAT',
        content_type: 'pyq',
        pyq_year: parsedYear,
        description: `${title} — Official PYQ Paper`,
        duration_minutes: durationMinutes || 180,
        is_active: true,
        is_published: true
      })
      .select()
      .single();

    if (testErr || !test) {
      throw testErr || new Error('Failed to create PYQ test entry');
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
      message: `${insertedQs.length} questions published successfully`,
      testId,
      insertedCount: insertedQs.length
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to publish PYQ', details: err.message });
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

    // Filter out any explicitly designated test series papers (where content_type === 'test_series')
    const pyqPapers = (data || []).filter(t => t.content_type !== 'test_series');

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
    const { data: existingQ } = await supabase.from('questions').select('test_id').eq('id', id).single();

    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) throw error;

    if (existingQ?.test_id) {
      await invalidatePreviewStatus(existingQ.test_id);
    }

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
