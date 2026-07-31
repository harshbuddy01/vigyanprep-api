import { supabase } from '../db/supabase.js';
import pdfParseModule from 'pdf-parse';

const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule && pdfParseModule.default) || pdfParseModule;

export const uploadAndParsePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfBuffer = req.file.buffer;
    const data = await pdfParse(pdfBuffer);
    const textStr = (data && data.text) ? data.text : (typeof data === 'string' ? data : '');

    if (!textStr || textStr.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    const cleanText = textStr.replace(/\u0000/g, '');
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

    const questions = [];
    let currentQ = null;

    const subjectClassifier = (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('cell') || lower.includes('dna') || lower.includes('rna') || lower.includes('gene') || lower.includes('protein') || lower.includes('plant') || lower.includes('animal') || lower.includes('organism') || lower.includes('biology')) return 'Biology';
      if (lower.includes('reaction') || lower.includes('acid') || lower.includes('base') || lower.includes('bond') || lower.includes('mole') || lower.includes('compound') || lower.includes('organic') || lower.includes('chemistry')) return 'Chemistry';
      if (lower.includes('matrix') || lower.includes('integral') || lower.includes('derivative') || lower.includes('equation') || lower.includes('probability') || lower.includes('vector') || lower.includes('math')) return 'Mathematics';
      if (lower.includes('force') || lower.includes('velocity') || lower.includes('mass') || lower.includes('energy') || lower.includes('electric') || lower.includes('magnetic') || lower.includes('physics')) return 'Physics';
      return 'Physics';
    };

    lines.forEach((line) => {
      const qMatch = line.match(/^(?:Q(?:uestion)?\s*(\d+)[\.:\)]?|\b(\d+)[\.:\)])\s*(.*)/i);
      const optMatch = line.match(/^[(\[]?([A-D])[)\].]\s*(.*)/i);

      if (qMatch) {
        if (currentQ && currentQ.text) {
          questions.push(currentQ);
        }
        const qNum = parseInt(qMatch[1] || qMatch[2], 10);
        const restText = qMatch[3] || line;
        currentQ = {
          question_number: qNum || (questions.length + 1),
          question_text: restText,
          text: restText,
          options: [],
          correct_answer: 'A',
          section: subjectClassifier(restText),
          type: 'MCQ',
          status: 'draft'
        };
      } else if (optMatch && currentQ) {
        if (currentQ.options.length < 4) {
          currentQ.options.push(optMatch[2] || line);
        }
      } else if (currentQ) {
        if (currentQ.options.length === 0) {
          currentQ.question_text += ' ' + line;
          currentQ.text += ' ' + line;
        } else {
          const lastIdx = currentQ.options.length - 1;
          currentQ.options[lastIdx] += ' ' + line;
        }
      }
    });

    if (currentQ && currentQ.text) {
      questions.push(currentQ);
    }

    questions.forEach((q, idx) => {
      if (!q.section) {
        if (idx < 15) q.section = 'Physics';
        else if (idx < 30) q.section = 'Chemistry';
        else if (idx < 45) q.section = 'Mathematics';
        else q.section = 'Biology';
      }
      while (q.options.length < 4) {
        const optLetter = ['A', 'B', 'C', 'D'][q.options.length];
        q.options.push(`Option ${optLetter}`);
      }
    });

    return res.status(200).json({
      success: true,
      filename: req.file.originalname,
      totalQuestions: questions.length,
      questions
    });

  } catch (err) {
    console.error('PDF parsing error:', err);
    return res.status(500).json({ error: 'Failed to parse PDF', details: err.message });
  }
};

export const approveAndPublishPyq = async (req, res) => {
  try {
    const { title, examType, durationMinutes, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Title and non-empty questions array are required' });
    }

    // 1. Insert Test Record
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .insert({
        title,
        exam_type: examType || 'IAT',
        description: `${examType || 'IAT'} Official Question Paper Archive`,
        duration_minutes: durationMinutes || 180,
        is_active: true,
        is_published: true
      })
      .select()
      .single();

    if (testErr || !test) {
      const fallbackTest = await supabase.from('test_series').insert({
        title,
        test_type: examType || 'IAT',
        duration_minutes: durationMinutes || 180,
        is_published: true
      }).select().single();
      
      if (!fallbackTest.data) {
        throw testErr || new Error('Failed to create test entry');
      }
    }

    const testId = test ? test.id : null;

    // 2. Format & Insert Questions
    const sanitizedQuestions = questions.map((q, idx) => ({
      test_id: testId,
      section: q.section || 'Physics',
      question_number: q.question_number || idx + 1,
      question_text: q.question_text || q.text || `Question ${idx + 1}`,
      type: q.type || 'MCQ',
      question_type: q.type || 'MCQ',
      options: Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'],
      correct_answer: q.correct_answer || 'A',
      image_url: q.image_url || null,
      marks_positive: 4,
      marks_negative: 1,
      status: 'draft'
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
      message: 'Test paper published successfully',
      testId: testId,
      insertedCount: insertedQs.length
    });

  } catch (err) {
    console.error('Publishing error:', err);
    return res.status(500).json({ error: 'Failed to publish PYQ', details: err.message });
  }
};

export const getPyqList = async (req, res) => {
  try {
    let { data, error } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      const fallback = await supabase.from('test_series').select('*').order('created_at', { ascending: false });
      data = fallback.data;
    }

    return res.status(200).json({ success: true, tests: data || [] });
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
        correct_answer: updates.correct_answer,
        section: updates.section,
        image_url: updates.image_url || null
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
      .update({
        title,
        exam_type: examType || 'IAT',
        duration_minutes: durationMinutes || 180,
        description
      })
      .eq('id', id)
      .select()
      .single();

    // Also update test_series fallback table if present
    await supabase
      .from('test_series')
      .update({
        title,
        test_type: examType || 'IAT',
        duration_minutes: durationMinutes || 180
      })
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

    // 1. Delete questions first
    await supabase.from('questions').delete().or(`test_id.eq.${id},test_series_id.eq.${id}`);

    // 2. Delete test record from 'tests' and 'test_series'
    const res1 = await supabase.from('tests').delete().eq('id', id);
    const res2 = await supabase.from('test_series').delete().eq('id', id);

    return res.status(200).json({ success: true, message: 'Test paper and all questions deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete test paper', details: err.message });
  }
};
