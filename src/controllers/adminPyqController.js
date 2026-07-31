import { createRequire } from 'module';
import { supabase } from '../db/supabase.js';

const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');
const { PDFParse } = pdfModule;

function extractString(val) {
  if (typeof val === 'string') return val;
  if (!val) return '';
  if (typeof val.text === 'string') return val.text;
  if (Array.isArray(val.pages)) return val.pages.map(p => (typeof p === 'string' ? p : (p.text || ''))).join('\n');
  return String(val);
}

/**
 * Helper to parse text into structured questions and sections
 */
function parsePdfTextToQuestions(rawInput) {
  const rawText = extractString(rawInput);
  const lines = rawText.split('\n');
  const questions = [];
  let currentSection = 'Physics';
  let currentQ = null;

  const sectionKeywords = {
    physics: 'Physics',
    chemistry: 'Chemistry',
    math: 'Mathematics',
    mathematics: 'Mathematics',
    biology: 'Biology'
  };

  // Section header matcher (standalone words or headings like BIOLOGY, CHEMISTRY, etc.)
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if standalone heading line specifies section
    const foundSection = detectSectionHeader(line);
    if (foundSection && line.length < 50 && !line.match(/^(?:Q|Question|\d+[\.\:)])/i)) {
      currentSection = foundSection;
      continue;
    }

    const qMatch = line.match(/^(?:Q(?:uestion)?\s*(\d+)[\.:\)]|(\d+)[\.:\)])\s*(.*)/i);
    if (qMatch) {
      if (currentQ && currentQ.text) {
        // Run auto-detection fallback if currentSection hasn't changed
        const contentSec = autoDetectSection(currentQ.text);
        if (contentSec) currentQ.section = contentSec;
        questions.push(currentQ);
      }
      const qNum = qMatch[1] || qMatch[2];
      const restText = qMatch[3] || '';
      currentQ = {
        tempId: `q_${questions.length + 1}`,
        questionNumber: parseInt(qNum, 10),
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
        if (!currentQ.options.some(o => o.length > 0)) {
          currentQ.text += ' ' + line;
        }
      }
    }
  }

  if (currentQ && currentQ.text) {
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

    const { data: testSeries, error: testErr } = await supabase
      .from('test_series')
      .insert({
        title,
        description: `Previous Year Question Paper for ${examType || 'IAT'} ${year || new Date().getFullYear()}`,
        test_type: (examType || 'IAT').toUpperCase(),
        total_questions: questions.length,
        duration_minutes: 180,
        price: 0,
        is_active: true
      })
      .select()
      .single();

    if (testErr) throw testErr;

    const questionRows = questions.map((q) => ({
      test_series_id: testSeries.id,
      section: q.section || 'Physics',
      type: q.type || 'MCQ',
      question_text: q.text,
      image_url: q.imageUrl || q.image_url || null,
      options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: q.correctAnswer || 'A',
      explanation: q.explanation || ''
    }));

    const { data: insertedQuestions, error: qErr } = await supabase
      .from('questions')
      .insert(questionRows)
      .select();

    if (qErr) throw qErr;

    return res.status(200).json({
      success: true,
      message: 'PYQ successfully published to main website & exam portal!',
      testId: testSeries.id,
      questionsCount: insertedQuestions.length
    });
  } catch (error) {
    console.error('Publish PYQ Error:', error);
    return res.status(500).json({ error: 'Failed to publish PYQ', details: error.message });
  }
};

export const getPyqList = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('test_series')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, tests: data });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch PYQs', details: error.message });
  }
};
