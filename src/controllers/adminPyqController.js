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
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // remove control chars
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
        status: 'draft_review'
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
        status: 'draft_review'
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

    let testSeries = null;
    const desc = `Previous Year Question Paper for ${examType || 'IAT'} ${year || new Date().getFullYear()}`;
    const type = (examType || 'IAT').toUpperCase();

    // Support both 'tests' and 'test_series' tables seamlessly
    const targetTables = ['tests', 'test_series'];
    const payloadVariants = [
      { title, description: desc, test_type: type, total_questions: questions.length, price: 0, is_active: true, duration_minutes: 180 },
      { title, description: desc, test_type: type, total_questions: questions.length, price: 0, is_active: true },
      { title, description: desc, exam_type: type, total_questions: questions.length, price: 0, is_active: true },
      { title, description: desc, total_questions: questions.length, price: 0, is_active: true },
      { title, description: desc, is_active: true },
      { title }
    ];

    let lastError = null;
    for (const table of targetTables) {
      for (const payload of payloadVariants) {
        const res = await supabase.from(table).insert(payload).select().single();
        if (!res.error && res.data) {
          testSeries = res.data;
          break;
        } else if (res.error) {
          lastError = res.error;
        }
      }
      if (testSeries) break;
    }

    if (!testSeries) {
      console.error('Insert test record error:', lastError);
      throw new Error(`Could not insert test record: ${lastError ? lastError.message : 'Unknown database error'}`);
    }

    const targetTestId = testSeries.id;

    const buildQuestionRow = (q, variant) => {
      const sanitizedText = sanitizeText(q.text || '');
      const rawOptions = Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'];
      const sanitizedOptions = rawOptions.map(opt => sanitizeText(opt || ''));

      const row = {
        question_text: sanitizedText,
        options: sanitizedOptions,
        correct_answer: q.correctAnswer || 'A',
      };
      if (variant.includes('test_id')) row.test_id = targetTestId;
      if (variant.includes('test_series_id')) row.test_series_id = targetTestId;
      if (variant.includes('section')) row.section = q.section || 'Physics';
      if (variant.includes('type')) row.type = q.type || 'MCQ';
      if (variant.includes('image_url') && (q.imageUrl || q.image_url)) row.image_url = sanitizeText(q.imageUrl || q.image_url);
      if (variant.includes('explanation') && q.explanation) row.explanation = sanitizeText(q.explanation);
      return row;
    };

    const questionVariants = [
      ['test_id', 'section', 'type', 'image_url', 'explanation'],
      ['test_id', 'section', 'type', 'image_url'],
      ['test_id', 'section', 'type'],
      ['test_id', 'section'],
      ['test_id'],
      ['test_series_id', 'section', 'type', 'image_url', 'explanation'],
      ['test_series_id', 'section', 'type', 'image_url'],
      ['test_series_id', 'section', 'type'],
      ['test_series_id', 'section'],
      ['test_series_id'],
      ['section', 'type', 'image_url'],
      ['section', 'type'],
      []
    ];

    let insertedQuestions = [];
    let qError = null;

    for (const variant of questionVariants) {
      const rows = questions.map(q => buildQuestionRow(q, variant));
      const res = await supabase.from('questions').insert(rows).select();
      if (!res.error && res.data) {
        insertedQuestions = res.data;
        qError = null;
        console.log(`✅ Successfully inserted ${insertedQuestions.length} questions into database using variant:`, variant);
        break;
      } else {
        qError = res.error;
        console.warn(`⚠️ Question insert variant failed [${variant.join(',')}]:`, res.error?.message);
      }
    }

    if (insertedQuestions.length === 0 && qError) {
      console.error('Questions insert error:', qError);
      throw new Error(`Failed to insert questions: ${qError.message}`);
    }

    return res.status(200).json({
      success: true,
      message: 'PYQ successfully published to main website & exam portal!',
      testId: targetTestId,
      questionsCount: insertedQuestions.length
    });
  } catch (error) {
    console.error('Publish PYQ Error:', error);
    return res.status(500).json({ error: 'Failed to publish PYQ', details: error.message });
  }
};

export const getPyqList = async (req, res) => {
  try {
    let { data, error } = await supabase
      .from('test_series')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const fallback = await supabase.from('tests').select('*').order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    return res.status(200).json({ success: true, tests: data || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch PYQs', details: error.message });
  }
};
