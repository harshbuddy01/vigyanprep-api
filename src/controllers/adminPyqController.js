import { createRequire } from 'module';
import { supabase } from '../db/supabase.js';

const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');
const { PDFParse } = pdfModule;

function sanitizeText(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/\u0000/g, '') // remove null bytes
    .replace(/\\u0000/g, '') // remove literal \u0000
    .replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u') // sanitize incomplete unicode escapes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // remove non-printable control chars
}

function extractString(val) {
  let str = '';
  if (typeof val === 'string') str = val;
  else if (!val) str = '';
  else if (typeof val.text === 'string') str = val.text;
  else if (Array.isArray(val.pages)) str = val.pages.map(p => (typeof p === 'string' ? p : (p.text || ''))).join('\n');
  else str = String(val);
  return sanitizeText(str);
}

/**
 * Helper to parse text into structured questions and sections accurately
 */
function parsePdfTextToQuestions(rawInput) {
  const rawText = extractString(rawInput);
  const lines = rawText.split('\n');
  const questions = [];
  let currentSection = 'Physics';
  let currentQ = null;

  // Section header matcher
  const detectSectionHeader = (text) => {
    const clean = text.trim().toLowerCase();
    if (/\b(biology|bio)\b/i.test(clean)) return 'Biology';
    if (/\b(chemistry|chem)\b/i.test(clean)) return 'Chemistry';
    if (/\b(mathematics|maths|math)\b/i.test(clean)) return 'Mathematics';
    if (/\b(physics|phys)\b/i.test(clean)) return 'Physics';
    return null;
  };

  // Content-based keyword auto-classifier
  const autoDetectSection = (text) => {
    const t = text.toLowerCase();
    if (/\b(dna|rna|gene|genetic|pedigree|protein|enzyme|cell|organism|chromosome|allele|mitosis|meiosis|amino|strand|inheritance)\b/i.test(t)) return 'Biology';
    if (/\b(acid|base|reaction|mole|molar|element|compound|isotope|catalyst|oxidation|reduction|orbital|isomer|ph\b|solution|titration)\b/i.test(t)) return 'Chemistry';
    if (/\b(integral|derivative|calculus|matrix|matrices|determinant|vector|probability|permutation|combination|equation|logarithm|trigonometry|cos|sin|tan|polynomial)\b/i.test(t)) return 'Mathematics';
    if (/\b(velocity|acceleration|force|torque|momentum|magnetic|electric|wavelength|refraction|lens|current|voltage|resistance|friction|capacitor|gravitation)\b/i.test(t)) return 'Physics';
    return null;
  };

  const isIgnoredLine = (line) => {
    const l = line.toLowerCase();
    return /^(page\s+\d+|total\s+marks|time\s+allowed|instructions|space\s+for\s+rough|rough\s+work|www\.|http|copyright)/i.test(l);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || isIgnoredLine(line)) continue;

    // Check if standalone heading line specifies section
    const foundSection = detectSectionHeader(line);
    if (foundSection && line.length < 60 && !line.match(/^(?:Q|Question|\d+[\.\:)])/i)) {
      currentSection = foundSection;
      continue;
    }

    // Match question starts like "Q.1", "Question 15", "1.", "1)"
    const qMatch = line.match(/^(?:Q(?:uestion)?\s*(\d+)[\.:\)]|(\d+)[\.:\)])\s*(.*)/i);
    if (qMatch) {
      const qNumStr = qMatch[1] || qMatch[2];
      const restText = qMatch[3] || '';

      // Skip lines that look like ranges e.g. "1 to 15" or "Q1 - Q15"
      if (restText.match(/^(?:to|-)\s*\d+/i)) continue;

      if (currentQ && currentQ.text && currentQ.text.trim().length > 5) {
        const contentSec = autoDetectSection(currentQ.text);
        if (contentSec) currentQ.section = contentSec;
        questions.push(currentQ);
      }

      currentQ = {
        tempId: `q_${questions.length + 1}`,
        questionNumber: parseInt(qNumStr, 10),
        section: foundSection || currentSection,
        type: 'MCQ',
        text: restText,
        options: ['', '', '', ''],
        correctAnswer: 'A',
        status: 'draft'
      };
      continue;
    }

    if (currentQ) {
      const optMatch = line.match(/^[\(\[\{]?([A-D])[\)\]\.\:]\s*(.*)/i);
      if (optMatch) {
        const optLetter = optMatch[1].toUpperCase();
        const optVal = optMatch[2] || '';
        const idx = optLetter.charCodeAt(0) - 65;
        if (idx >= 0 && idx < 4) {
          currentQ.options[idx] = optVal;
        }
      } else {
        if (!currentQ.options.some(o => o && o.length > 0)) {
          currentQ.text += ' ' + line;
        }
      }
    }
  }

  if (currentQ && currentQ.text && currentQ.text.trim().length > 5) {
    const contentSec = autoDetectSection(currentQ.text);
    if (contentSec) currentQ.section = contentSec;
    questions.push(currentQ);
  }

  if (questions.length === 0 && rawText.length > 0) {
    const paragraphs = rawText.split('\n\n').filter(p => p.trim().length > 20);
    paragraphs.forEach((p, idx) => {
      questions.push({
        tempId: `q_${idx + 1}`,
        questionNumber: idx + 1,
        section: idx % 4 === 0 ? 'Physics' : idx % 4 === 1 ? 'Chemistry' : idx % 4 === 2 ? 'Mathematics' : 'Biology',
        type: 'MCQ',
        text: p.trim(),
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'A',
        status: 'draft'
      });
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
    let pageCount = 1;

    if (typeof pdfModule === 'function') {
      const parsedData = await pdfModule(pdfBuffer);
      rawText = parsedData.text || '';
      pageCount = parsedData.numpages || 1;
    } else if (PDFParse) {
      const parser = new PDFParse(new Uint8Array(pdfBuffer));
      await parser.load();
      rawText = (await parser.getText()) || '';
      const info = await parser.getInfo().catch(() => ({}));
      pageCount = info?.numpages || 1;
    } else {
      throw new Error('PDF parsing engine unavailable');
    }

    const parsedQuestions = parsePdfTextToQuestions(rawText);

    return res.status(200).json({
      success: true,
      fileName: req.file.originalname,
      totalPageCount: pageCount,
      totalParsedQuestions: parsedQuestions.length,
      questions: parsedQuestions
    });
  } catch (error) {
    console.error('PDF Parse Error:', error);
    return res.status(500).json({ error: 'Failed to parse PDF document', details: error.message });
  }
};

export const approveAndPublishPyq = async (req, res) => {
  try {
    const { title, examType, year, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Invalid payload: title and questions array required' });
    }

    const testPayload = {
      title: title.trim(),
      description: `Previous Year Question Paper for ${examType || 'IAT'} ${year || new Date().getFullYear()}`,
      exam_type: (examType || 'IAT').toUpperCase(),
      duration_minutes: 180,
      is_active: true,
      is_published: true
    };

    // 1. Insert test into `tests` table (or fallback to `test_series`)
    let testRecord = null;

    const res1 = await supabase.from('tests').insert(testPayload).select().single();
    if (!res1.error && res1.data) {
      testRecord = res1.data;
    } else {
      console.warn('tests insert warning, trying test_series fallback:', res1.error?.message);
      const res2 = await supabase.from('test_series').insert({
        title: title.trim(),
        description: testPayload.description,
        test_type: testPayload.exam_type,
        total_questions: questions.length,
        price: 0,
        is_active: true
      }).select().single();

      if (res2.error) throw res1.error || res2.error;
      testRecord = res2.data;
    }

    const targetTestId = testRecord.id;

    // 2. Format question rows using verified Supabase table schema
    const questionRows = questions.map((q, idx) => ({
      test_id: targetTestId,
      section: q.section || 'Physics',
      question_number: q.questionNumber || (idx + 1),
      question_text: sanitizeText(q.text || ''),
      question_type: q.type || 'MCQ',
      type: q.type || 'MCQ',
      options: (Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D']).map(opt => sanitizeText(opt || '')),
      correct_answer: q.correctAnswer || 'A',
      image_url: q.imageUrl || q.image_url ? sanitizeText(q.imageUrl || q.image_url) : null,
      marks_positive: 4,
      marks_negative: -1,
      status: 'draft'
    }));

    // 3. Insert questions into `questions` table
    const { data: insertedQuestions, error: qErr } = await supabase
      .from('questions')
      .insert(questionRows)
      .select();

    if (qErr) {
      console.error('Questions batch insert error:', qErr);
      throw qErr;
    }

    return res.status(200).json({
      success: true,
      message: 'PYQ successfully published to main website & exam portal!',
      testId: targetTestId,
      questionsCount: insertedQuestions.length
    });
  } catch (error) {
    console.error('Publish PYQ Error:', error);
    return res.status(500).json({ error: 'Failed to publish PYQ', details: error.message || error });
  }
};

export const getPyqList = async (req, res) => {
  try {
    let { data, error } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const fallback = await supabase.from('test_series').select('*').order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    return res.status(200).json({ success: true, tests: data || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch PYQs', details: error.message });
  }
};
