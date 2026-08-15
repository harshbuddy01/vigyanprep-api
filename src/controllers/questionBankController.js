// backend/controllers/questionBankController.js
// 🏛️ CENTRAL QUESTION BANK CONTROLLER (Unacademy/PW Grade)

import { supabase } from '../db/supabase.js';

/**
 * GET /api/admin/questions/bank
 * List questions with search, section, topic, difficulty, pagination
 */
export const getQuestionBank = async (req, res) => {
  try {
    const {
      search = '',
      section = '',
      topic = '',
      difficulty = '',
      exam_type = '',
      page = 1,
      limit = 30
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('questions')
      .select('*', { count: 'exact' });

    if (section && section !== 'All') {
      query = query.eq('section', section);
    }

    if (search && search.trim()) {
      query = query.ilike('question_text', `%${search.trim()}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data: questions, count, error } = await query;

    if (error) throw error;

    // Fetch tests to enrich questions with PYQ source metadata
    const testIds = Array.from(new Set((questions || []).map(q => q.test_id).filter(Boolean)));
    const testMap = new Map();

    if (testIds.length > 0) {
      const { data: testRows } = await supabase
        .from('tests')
        .select('id, title, name, content_type, pyq_year, exam_type')
        .in('id', testIds);

      (testRows || []).forEach(t => testMap.set(t.id, t));
    }

    const enriched = (questions || []).map(q => {
      const parentTest = q.test_id ? testMap.get(q.test_id) : null;
      const isPyq = parentTest?.content_type === 'pyq' || !!parentTest?.pyq_year || !!q.pyq_year;
      return {
        ...q,
        is_pyq: isPyq,
        pyq_year: q.pyq_year || parentTest?.pyq_year || null,
        test_title: parentTest?.title || parentTest?.name || (q.test_id ? 'Test Paper' : 'Master Bank'),
        exam_type: q.exam_type || parentTest?.exam_type || 'IAT'
      };
    });

    return res.status(200).json({
      success: true,
      questions: enriched,
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum)
    });
  } catch (err) {
    console.error('getQuestionBank error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/admin/questions/bank/stats
 * Aggregate counts by subject, difficulty, and total
 */
export const getQuestionBankStats = async (req, res) => {
  try {
    const { data: allQuestions, error } = await supabase
      .from('questions')
      .select('id, section');

    if (error) throw error;

    const stats = {
      total: allQuestions?.length || 0,
      Physics: 0,
      Chemistry: 0,
      Mathematics: 0,
      Biology: 0,
      Other: 0,
      easy: 0,
      medium: 0,
      hard: 0
    };

    (allQuestions || []).forEach(q => {
      const sec = q.section || 'Physics';
      if (stats[sec] !== undefined) {
        stats[sec]++;
      } else {
        stats.Other++;
      }
    });

    return res.status(200).json({ success: true, stats });
  } catch (err) {
    console.error('getQuestionBankStats error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/admin/questions/bank
 * Create a new question directly in the bank
 */
export const createQuestionInBank = async (req, res) => {
  try {
    const {
      test_id,
      section = 'Physics',
      question_number = 1,
      question_text = '',
      type = 'MCQ',
      options = ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer = 'A',
      image_url = null,
      marks_positive = 4,
      marks_negative = 1,
      solution_explanation = '',
      topic = '',
      difficulty = 'Medium',
      exam_type = 'IAT'
    } = req.body;

    if (!question_text || !question_text.trim()) {
      return res.status(400).json({ success: false, error: 'Question text is required' });
    }

    const { data, error } = await supabase
      .from('questions')
      .insert({
        test_id: test_id || null,
        section,
        question_number: parseInt(question_number, 10) || 1,
        question_text: question_text.trim(),
        type,
        question_type: type,
        options: Array.isArray(options) ? options : ['A', 'B', 'C', 'D'],
        correct_answer,
        image_url: image_url || null,
        marks_positive: Number(marks_positive) || 4,
        marks_negative: Number(marks_negative) || 1,
        model_answer: solution_explanation || '',
        status: 'approved'
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, question: data });
  } catch (err) {
    console.error('createQuestionInBank error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /api/admin/questions/bank/:id
 * Update an existing question
 */
export const updateQuestionInBank = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      section,
      question_number,
      question_text,
      type,
      options,
      correct_answer,
      image_url,
      marks_positive,
      marks_negative,
      solution_explanation
    } = req.body;

    const updates = {};
    if (section !== undefined) updates.section = section;
    if (question_number !== undefined) updates.question_number = parseInt(question_number, 10);
    if (question_text !== undefined) {
      updates.question_text = question_text.trim();
    }
    if (type !== undefined) {
      updates.type = type;
      updates.question_type = type;
    }
    if (options !== undefined && Array.isArray(options)) updates.options = options;
    if (correct_answer !== undefined) updates.correct_answer = correct_answer;
    if (image_url !== undefined) updates.image_url = image_url || null;
    if (marks_positive !== undefined) updates.marks_positive = Number(marks_positive);
    if (marks_negative !== undefined) updates.marks_negative = Number(marks_negative);
    if (solution_explanation !== undefined) updates.model_answer = solution_explanation;

    const { data, error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, question: data });
  } catch (err) {
    console.error('updateQuestionInBank error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /api/admin/questions/bank/:id
 * Permanently delete question from database
 */
export const deleteQuestionFromBank = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Question id is required' });

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Question permanently deleted from database' });
  } catch (err) {
    console.error('deleteQuestionFromBank error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/admin/questions/bank/import-to-test
 * Batch copy/assign questions from Question Bank into a test paper
 */
export const importQuestionsToTest = async (req, res) => {
  try {
    const { test_id, question_ids } = req.body;

    if (!test_id || !Array.isArray(question_ids) || question_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'test_id and question_ids array are required' });
    }

    // 1. Fetch source questions from bank
    const { data: sourceQuestions, error: fetchErr } = await supabase
      .from('questions')
      .select('*')
      .in('id', question_ids);

    if (fetchErr) throw fetchErr;
    if (!sourceQuestions || sourceQuestions.length === 0) {
      return res.status(404).json({ success: false, error: 'No matching questions found in bank' });
    }

    // 2. Fetch existing questions in test to determine section numbering offsets
    const { data: existingTestQs } = await supabase
      .from('questions')
      .select('section, question_number')
      .eq('test_id', test_id);

    const sectionMaxNum = {
      Physics: 0,
      Chemistry: 0,
      Mathematics: 0,
      Biology: 0
    };

    (existingTestQs || []).forEach(q => {
      const sec = q.section || 'Physics';
      if (sectionMaxNum[sec] !== undefined) {
        sectionMaxNum[sec] = Math.max(sectionMaxNum[sec], q.question_number || 0);
      }
    });

    // 3. Prepare duplicated entries for the test
    const newQuestionsToInsert = sourceQuestions.map(src => {
      const sec = src.section || 'Physics';
      sectionMaxNum[sec] = (sectionMaxNum[sec] || 0) + 1;

      return {
        test_id,
        section: sec,
        question_number: sectionMaxNum[sec],
        question_text: src.question_text || src.text,
        type: src.type || src.question_type || 'MCQ',
        question_type: src.type || src.question_type || 'MCQ',
        options: src.options,
        correct_answer: src.correct_answer,
        image_url: src.image_url,
        marks_positive: src.marks_positive || 4,
        marks_negative: src.marks_negative || 1,
        model_answer: src.model_answer || src.solution_explanation || '',
        status: 'approved'
      };
    });

    const { data: inserted, error: insertErr } = await supabase
      .from('questions')
      .insert(newQuestionsToInsert)
      .select();

    if (insertErr) throw insertErr;

    // Update test question count
    const totalCount = (existingTestQs?.length || 0) + (inserted?.length || 0);
    await supabase
      .from('tests')
      .update({ questions_count: totalCount, total_marks: totalCount * 4 })
      .eq('id', test_id);

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} questions into test`,
      importedCount: inserted.length,
      questions: inserted
    });
  } catch (err) {
    console.error('importQuestionsToTest error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
