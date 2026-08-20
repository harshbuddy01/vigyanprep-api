// =============================================
// ADAPTIVE CHAPTER REVISION CONTROLLER
// AI-powered question generation + weakness tracking
// Created: 2026-08-20
// =============================================

import { supabase } from '../db/supabase.js';

// ─── CHAPTER DATA ────────────────────────────────────────────────────────
// Static chapter definitions for each exam type
const CHAPTER_DATA = {
  iat: {
    Physics: [
      { name: 'Mechanics & Kinematics', subTopics: ['Newton\'s Laws', 'Projectile Motion', 'Friction', 'Circular Motion', 'Work-Energy Theorem'] },
      { name: 'Rotational Motion', subTopics: ['Moment of Inertia', 'Angular Momentum', 'Torque', 'Rolling Motion', 'Rotational Kinetic Energy'] },
      { name: 'Gravitation', subTopics: ['Kepler\'s Laws', 'Gravitational Potential', 'Escape Velocity', 'Orbital Mechanics', 'Tidal Forces'] },
      { name: 'Oscillations & Waves', subTopics: ['SHM', 'Damped Oscillations', 'Forced Oscillations', 'Wave Equation', 'Superposition', 'Standing Waves'] },
      { name: 'Thermodynamics', subTopics: ['Laws of Thermodynamics', 'Carnot Cycle', 'Entropy', 'Ideal Gas', 'Kinetic Theory'] },
      { name: 'Electrostatics', subTopics: ['Coulomb\'s Law', 'Gauss\'s Law', 'Electric Potential', 'Capacitance', 'Dielectrics'] },
      { name: 'Current Electricity', subTopics: ['Ohm\'s Law', 'Kirchhoff\'s Laws', 'RC Circuits', 'Wheatstone Bridge', 'Potentiometer'] },
      { name: 'Magnetism & EMI', subTopics: ['Biot-Savart Law', 'Ampere\'s Law', 'Faraday\'s Law', 'Lenz\'s Law', 'Inductance', 'AC Circuits'] },
      { name: 'Optics', subTopics: ['Reflection', 'Refraction', 'Interference', 'Diffraction', 'Polarization', 'Lens Formula'] },
      { name: 'Modern Physics', subTopics: ['Photoelectric Effect', 'Bohr Model', 'De Broglie Wavelength', 'Nuclear Physics', 'Radioactivity'] },
    ],
    Chemistry: [
      { name: 'Atomic Structure', subTopics: ['Quantum Numbers', 'Electron Configuration', 'Periodic Trends', 'Aufbau Principle'] },
      { name: 'Chemical Bonding', subTopics: ['VSEPR Theory', 'Hybridization', 'Molecular Orbital Theory', 'Hydrogen Bonding', 'Ionic vs Covalent'] },
      { name: 'Thermochemistry', subTopics: ['Enthalpy', 'Hess\'s Law', 'Bond Energy', 'Gibbs Free Energy', 'Spontaneity'] },
      { name: 'Chemical Kinetics', subTopics: ['Rate Laws', 'Order of Reaction', 'Arrhenius Equation', 'Catalysis', 'Reaction Mechanisms'] },
      { name: 'Equilibrium', subTopics: ['Le Chatelier\'s Principle', 'Equilibrium Constants', 'Ionic Equilibrium', 'Buffer Solutions', 'Solubility Product'] },
      { name: 'Electrochemistry', subTopics: ['Nernst Equation', 'Galvanic Cells', 'Electrolysis', 'Faraday\'s Laws', 'Corrosion'] },
      { name: 'Organic Chemistry', subTopics: ['IUPAC Nomenclature', 'Reaction Mechanisms', 'Functional Groups', 'Stereochemistry', 'Named Reactions'] },
      { name: 'Coordination Chemistry', subTopics: ['Crystal Field Theory', 'Isomerism', 'Werner\'s Theory', 'CFSE', 'Spectrochemical Series'] },
    ],
    Mathematics: [
      { name: 'Calculus', subTopics: ['Limits', 'Continuity', 'Differentiation', 'Integration', 'Definite Integrals', 'Differential Equations'] },
      { name: 'Algebra', subTopics: ['Quadratic Equations', 'Polynomials', 'Complex Numbers', 'Matrices', 'Determinants', 'Sequences & Series'] },
      { name: 'Coordinate Geometry', subTopics: ['Straight Lines', 'Circles', 'Parabola', 'Ellipse', 'Hyperbola'] },
      { name: 'Trigonometry', subTopics: ['Identities', 'Equations', 'Inverse Trig', 'Properties of Triangles', 'Heights & Distances'] },
      { name: 'Vectors & 3D Geometry', subTopics: ['Vector Algebra', 'Dot & Cross Product', 'Lines in 3D', 'Planes', 'Shortest Distance'] },
      { name: 'Probability & Statistics', subTopics: ['Conditional Probability', 'Bayes\' Theorem', 'Binomial Distribution', 'Mean & Variance', 'Random Variables'] },
      { name: 'Number Theory', subTopics: ['Divisibility', 'Modular Arithmetic', 'Prime Numbers', 'GCD & LCM', 'Fermat\'s Little Theorem'] },
    ],
    Biology: [
      { name: 'Cell Biology', subTopics: ['Cell Structure', 'Cell Division', 'Membrane Transport', 'Organelles', 'Cell Cycle'] },
      { name: 'Genetics & Evolution', subTopics: ['Mendelian Genetics', 'DNA Replication', 'Transcription', 'Translation', 'Mutations', 'Natural Selection'] },
      { name: 'Ecology', subTopics: ['Ecosystems', 'Food Chains', 'Biodiversity', 'Population Dynamics', 'Biogeochemical Cycles'] },
      { name: 'Human Physiology', subTopics: ['Nervous System', 'Endocrine System', 'Digestive System', 'Circulatory System', 'Respiratory System'] },
      { name: 'Plant Biology', subTopics: ['Photosynthesis', 'Plant Hormones', 'Transport in Plants', 'Plant Anatomy', 'Reproduction'] },
      { name: 'Molecular Biology', subTopics: ['Protein Structure', 'Enzyme Kinetics', 'Gene Regulation', 'PCR', 'Gel Electrophoresis'] },
    ]
  },
  nest: {
    Physics: [
      { name: 'Classical Mechanics', subTopics: ['Newton\'s Laws', 'Conservation Laws', 'Rotational Dynamics', 'Gravitation', 'Oscillations'] },
      { name: 'Electromagnetism', subTopics: ['Electrostatics', 'Magnetostatics', 'Electromagnetic Induction', 'Maxwell\'s Equations', 'EM Waves'] },
      { name: 'Optics & Waves', subTopics: ['Wave Optics', 'Interference', 'Diffraction', 'Polarization', 'Geometrical Optics'] },
      { name: 'Thermodynamics & Statistical Mechanics', subTopics: ['Laws of Thermodynamics', 'Entropy', 'Kinetic Theory', 'Ideal Gas', 'Phase Transitions'] },
      { name: 'Modern Physics', subTopics: ['Quantum Mechanics Basics', 'Photoelectric Effect', 'Bohr Model', 'Nuclear Physics', 'Special Relativity'] },
    ],
    Chemistry: [
      { name: 'Physical Chemistry', subTopics: ['Thermodynamics', 'Kinetics', 'Equilibrium', 'Electrochemistry', 'Surface Chemistry'] },
      { name: 'Inorganic Chemistry', subTopics: ['Periodic Table', 'Coordination Compounds', 'd-block Elements', 'Metallurgy', 'Qualitative Analysis'] },
      { name: 'Organic Chemistry', subTopics: ['Reaction Mechanisms', 'Stereochemistry', 'Functional Group Chemistry', 'Biomolecules', 'Polymers'] },
    ],
    Mathematics: [
      { name: 'Analysis', subTopics: ['Limits', 'Continuity', 'Differentiability', 'Integration', 'Series Convergence'] },
      { name: 'Algebra', subTopics: ['Groups', 'Rings', 'Linear Algebra', 'Matrices', 'Polynomials'] },
      { name: 'Combinatorics', subTopics: ['Permutations', 'Combinations', 'Pigeonhole Principle', 'Generating Functions', 'Graph Theory Basics'] },
      { name: 'Number Theory', subTopics: ['Primes', 'Divisibility', 'Congruences', 'Diophantine Equations', 'Euler\'s Theorem'] },
    ],
    Biology: [
      { name: 'Cell & Molecular Biology', subTopics: ['Cell Structure', 'DNA & RNA', 'Protein Synthesis', 'Cell Signaling', 'Cell Cycle'] },
      { name: 'Genetics & Evolution', subTopics: ['Mendelian Genetics', 'Population Genetics', 'Molecular Genetics', 'Evolution', 'Speciation'] },
      { name: 'Ecology & Environment', subTopics: ['Ecosystems', 'Biodiversity', 'Conservation', 'Environmental Issues', 'Biogeography'] },
      { name: 'Physiology', subTopics: ['Nervous System', 'Endocrine System', 'Immune System', 'Plant Physiology', 'Animal Physiology'] },
    ]
  }
};

// Copy IAT data for ISI (similar syllabus)
CHAPTER_DATA.isi = CHAPTER_DATA.iat;

// ─── AI QUESTION GENERATION ─────────────────────────────────────────────

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

// Primary models in priority order
const AI_MODELS = [
  { provider: 'openrouter', model: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
  { provider: 'openrouter', model: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
];

function buildQuestionPrompt(examType, subject, chapterName, subTopics, count, difficulty, weakSubTopics) {
  const focusInstruction = weakSubTopics && weakSubTopics.length > 0
    ? `\n\nIMPORTANT: The student previously struggled with these specific sub-topics: ${weakSubTopics.join(', ')}. Generate at least ${Math.ceil(count * 0.6)} questions targeting these weak areas to help remediate their understanding.`
    : '';

  return `You are an expert scientific examination creator for competitive Indian science entrance exams (IISER IAT, NISER NEST, ISI).

Generate exactly ${count} unique, high-quality multiple-choice questions.

**Exam**: ${examType.toUpperCase()}
**Subject**: ${subject}
**Chapter**: ${chapterName}
**Available Sub-topics**: ${subTopics.join(', ')}
**Difficulty**: ${difficulty}
${focusInstruction}

STRICT RULES:
1. Use KaTeX LaTeX for ALL mathematical formulas: $...$ for inline, $$...$$ for display math.
2. Each question MUST have exactly 4 distinct options labeled A, B, C, D.
3. Questions must be conceptual and test deep understanding, NOT rote memorization.
4. Include the specific sub-topic each question belongs to.
5. Provide a detailed step-by-step explanation with derivation using KaTeX LaTeX.
6. Output ONLY a valid JSON array — no markdown, no code fences, no extra text.

Output format — a JSON array of objects:
[
  {
    "subTopic": "Name of the specific sub-topic",
    "questionText": "The question text with $LaTeX$ formulas...",
    "options": ["$Option A$", "$Option B$", "$Option C$", "$Option D$"],
    "correctAnswer": "A",
    "difficulty": "${difficulty}",
    "explanation": "Step 1: ... Step 2: ... Therefore the answer is A."
  }
]`;
}

async function callOpenRouter(prompt, model, maxTokens = 4000) {
  if (!OPENROUTER_KEY) return null;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vigyanprep.com',
        'X-Title': 'VigyanPrep Adaptive Revision'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an expert exam question creator. Output ONLY valid JSON arrays. No markdown fences.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      console.warn(`[Adaptive] OpenRouter ${model} returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data.choices && data.choices[0]) {
      return {
        content: data.choices[0].message.content,
        model: model
      };
    }
    return null;
  } catch (err) {
    console.error(`[Adaptive] OpenRouter ${model} error:`, err.message);
    return null;
  }
}

async function callGroq(prompt, maxTokens = 4000) {
  if (!GROQ_KEY) return null;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an expert exam question creator. Output ONLY valid JSON arrays. No markdown fences.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.choices && data.choices[0]) {
      return {
        content: data.choices[0].message.content,
        model: 'groq/llama-3.3-70b-versatile'
      };
    }
    return null;
  } catch (err) {
    console.error('[Adaptive] Groq fallback error:', err.message);
    return null;
  }
}

function parseAIResponse(rawContent) {
  if (!rawContent) return [];

  let text = rawContent.trim();

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  try {
    const parsed = JSON.parse(text);

    // Handle both { "questions": [...] } and direct [...]
    if (Array.isArray(parsed)) return parsed;
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
    if (parsed.data && Array.isArray(parsed.data)) return parsed.data;

    // If it's a single question object, wrap in array
    if (parsed.questionText && parsed.options) return [parsed];

    return [];
  } catch (e) {
    console.error('[Adaptive] JSON parse failed:', e.message);

    // Attempt to extract JSON array from the text
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e2) {
        console.error('[Adaptive] Fallback JSON parse also failed');
      }
    }
    return [];
  }
}

async function generateQuestionsWithAI(examType, subject, chapterName, subTopics, count, difficulty, weakSubTopics) {
  const prompt = buildQuestionPrompt(examType, subject, chapterName, subTopics, count, difficulty, weakSubTopics);

  // Try OpenRouter models in order
  for (const modelConfig of AI_MODELS) {
    console.log(`[Adaptive] Trying ${modelConfig.name} (${modelConfig.model})...`);
    const result = await callOpenRouter(prompt, modelConfig.model);
    if (result) {
      const questions = parseAIResponse(result.content);
      if (questions.length > 0) {
        console.log(`[Adaptive] ✅ ${modelConfig.name} generated ${questions.length} questions`);
        return { questions, aiModel: result.model };
      }
    }
  }

  // Fallback to Groq
  console.log('[Adaptive] Trying Groq fallback...');
  const groqResult = await callGroq(prompt);
  if (groqResult) {
    const questions = parseAIResponse(groqResult.content);
    if (questions.length > 0) {
      console.log(`[Adaptive] ✅ Groq generated ${questions.length} questions`);
      return { questions, aiModel: groqResult.model };
    }
  }

  return { questions: [], aiModel: null };
}

// ─── CONTROLLER ENDPOINTS ────────────────────────────────────────────────

/**
 * GET /api/adaptive/chapters
 * List all chapters for a given exam type, optionally filtered by subject
 */
export async function getChapters(req, res) {
  try {
    const { examType = 'iat', subject } = req.query;
    const chapters = CHAPTER_DATA[examType.toLowerCase()];

    if (!chapters) {
      return res.status(400).json({
        success: false,
        error: `Invalid exam type: ${examType}. Supported: iat, nest, isi`
      });
    }

    if (subject) {
      const subjectChapters = chapters[subject];
      if (!subjectChapters) {
        return res.status(400).json({
          success: false,
          error: `Invalid subject: ${subject}. Available: ${Object.keys(chapters).join(', ')}`
        });
      }
      return res.json({
        success: true,
        examType,
        subject,
        chapters: subjectChapters
      });
    }

    // Return all subjects and chapters
    return res.json({
      success: true,
      examType,
      subjects: Object.keys(chapters),
      chapters
    });
  } catch (error) {
    console.error('[Adaptive] getChapters error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch chapters' });
  }
}

/**
 * POST /api/adaptive/generate-test
 * Generate an adaptive practice test for a student
 * Body: { examType, subject, chapterName, questionCount, durationMinutes, difficulty }
 */
export async function generateTest(req, res) {
  try {
    const studentEmail = req.user?.email;
    if (!studentEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const {
      examType = 'iat',
      subject,
      chapterName,
      questionCount = 10,
      durationMinutes = 15,
      difficulty = 'medium'
    } = req.body;

    // Validate inputs
    if (!subject || !chapterName) {
      return res.status(400).json({
        success: false,
        error: 'subject and chapterName are required'
      });
    }

    const chapters = CHAPTER_DATA[examType.toLowerCase()];
    if (!chapters || !chapters[subject]) {
      return res.status(400).json({ success: false, error: 'Invalid examType or subject' });
    }

    const chapterDef = chapters[subject].find(c => c.name === chapterName);
    if (!chapterDef) {
      return res.status(400).json({
        success: false,
        error: `Chapter "${chapterName}" not found in ${subject} for ${examType}`
      });
    }

    const count = Math.min(Math.max(parseInt(questionCount) || 10, 5), 30);
    const durationSec = Math.min(Math.max(parseInt(durationMinutes) || 15, 5), 120) * 60;

    // ─── STEP 1: Check for cached questions in database ───
    let cachedQuestions = [];
    try {
      const { data: cached } = await supabase
        .from('adaptive_question_bank')
        .select('*')
        .eq('exam_type', examType.toLowerCase())
        .eq('subject', subject)
        .eq('chapter_name', chapterName)
        .eq('is_flagged', false)
        .order('times_served', { ascending: true })
        .limit(count);

      if (cached && cached.length >= count) {
        cachedQuestions = cached.slice(0, count);
        console.log(`[Adaptive] ✅ Serving ${cachedQuestions.length} cached questions for ${chapterName}`);
      }
    } catch (cacheErr) {
      console.warn('[Adaptive] Cache lookup failed (table may not exist yet):', cacheErr.message);
    }

    // ─── STEP 2: Check student's weak sub-topics for remediation targeting ───
    let weakSubTopics = [];
    try {
      const { data: weakConcepts } = await supabase
        .from('student_concept_mastery')
        .select('sub_topic, mastery_pct')
        .eq('student_email', studentEmail)
        .eq('exam_type', examType.toLowerCase())
        .eq('chapter_name', chapterName)
        .lt('mastery_pct', 60)
        .order('mastery_pct', { ascending: true });

      if (weakConcepts && weakConcepts.length > 0) {
        weakSubTopics = weakConcepts.map(w => w.sub_topic);
        console.log(`[Adaptive] Student weak areas: ${weakSubTopics.join(', ')}`);
      }
    } catch (masteryErr) {
      console.warn('[Adaptive] Mastery lookup failed:', masteryErr.message);
    }

    // ─── STEP 3: Generate with AI if not enough cached ───
    let questions = [];
    let aiModel = null;

    if (cachedQuestions.length >= count) {
      // Use cached questions
      questions = cachedQuestions.map((q, i) => ({
        id: q.id,
        questionNumber: i + 1,
        subTopic: q.sub_topic,
        questionText: q.question_text,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty
      }));

      // Increment times_served
      const ids = cachedQuestions.map(q => q.id);
      supabase.rpc('increment_times_served', { question_ids: ids }).catch(() => {});
    } else {
      // Generate fresh questions with AI
      const needed = count - cachedQuestions.length;
      console.log(`[Adaptive] Generating ${needed} new questions via AI...`);

      const result = await generateQuestionsWithAI(
        examType, subject, chapterName,
        chapterDef.subTopics, needed, difficulty, weakSubTopics
      );

      aiModel = result.aiModel;

      if (result.questions.length === 0) {
        return res.status(503).json({
          success: false,
          error: 'AI question generation temporarily unavailable. Please try again in a moment.'
        });
      }

      // Format AI-generated questions
      const aiQuestions = result.questions.map((q, i) => ({
        id: `ai-${Date.now()}-${i}`,
        questionNumber: cachedQuestions.length + i + 1,
        subTopic: q.subTopic || q.sub_topic || 'General',
        questionText: q.questionText || q.question_text || q.question || '',
        options: q.options || [],
        correctAnswer: q.correctAnswer || q.correct_answer || 'A',
        explanation: q.explanation || '',
        difficulty: q.difficulty || difficulty
      }));

      // ─── STEP 4: Cache new questions in database (fire & forget) ───
      const cacheRows = aiQuestions.map(q => ({
        exam_type: examType.toLowerCase(),
        subject,
        chapter_name: chapterName,
        sub_topic: q.subTopic,
        difficulty: q.difficulty,
        question_text: q.questionText,
        options: q.options,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        ai_model: aiModel
      }));

      supabase.from('adaptive_question_bank').insert(cacheRows).then(({ data, error }) => {
        if (error) console.warn('[Adaptive] Cache insert warning:', error.message);
        else console.log(`[Adaptive] ✅ Cached ${cacheRows.length} questions in database`);
      });

      // Merge cached + AI questions
      const formattedCached = cachedQuestions.map((q, i) => ({
        id: q.id,
        questionNumber: i + 1,
        subTopic: q.sub_topic,
        questionText: q.question_text,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty
      }));

      questions = [...formattedCached, ...aiQuestions];
    }

    // Renumber all questions
    questions = questions.map((q, i) => ({ ...q, questionNumber: i + 1 }));

    // ─── STEP 5: Create attempt record ───
    let attemptId = null;
    try {
      const { data: attempt, error: attemptErr } = await supabase
        .from('adaptive_attempts')
        .insert({
          student_email: studentEmail,
          exam_type: examType.toLowerCase(),
          subject,
          chapter_name: chapterName,
          question_count: questions.length,
          duration_seconds: durationSec,
          questions_data: questions,
          is_remediation: weakSubTopics.length > 0
        })
        .select('id')
        .single();

      if (attempt) attemptId = attempt.id;
      if (attemptErr) console.warn('[Adaptive] Attempt insert warning:', attemptErr.message);
    } catch (attemptErr) {
      console.warn('[Adaptive] Attempt creation failed:', attemptErr.message);
    }

    // ─── RESPONSE ───
    // Strip correct answers from response (prevent cheating)
    const safeQuestions = questions.map(q => ({
      id: q.id,
      questionNumber: q.questionNumber,
      subTopic: q.subTopic,
      questionText: q.questionText,
      options: q.options,
      difficulty: q.difficulty
      // NOTE: correctAnswer and explanation are withheld
    }));

    return res.json({
      success: true,
      attemptId,
      examType,
      subject,
      chapterName,
      questionCount: safeQuestions.length,
      durationSeconds: durationSec,
      isRemediation: weakSubTopics.length > 0,
      weakAreasTargeted: weakSubTopics,
      aiModel: aiModel || 'cached',
      questions: safeQuestions
    });

  } catch (error) {
    console.error('[Adaptive] generateTest error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate test' });
  }
}

/**
 * POST /api/adaptive/submit-test
 * Submit answers, evaluate, diagnose weaknesses, update mastery
 * Body: { attemptId, answers: { questionId: 'A', ... }, timeTaken }
 */
export async function submitTest(req, res) {
  try {
    const studentEmail = req.user?.email;
    if (!studentEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { attemptId, answers = {}, timeTaken = 0 } = req.body;

    if (!attemptId) {
      return res.status(400).json({ success: false, error: 'attemptId is required' });
    }

    // Fetch the attempt with full questions data
    const { data: attempt, error: fetchErr } = await supabase
      .from('adaptive_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('student_email', studentEmail)
      .single();

    if (fetchErr || !attempt) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }

    if (attempt.submitted_at) {
      return res.status(400).json({ success: false, error: 'This test has already been submitted' });
    }

    const questions = attempt.questions_data || [];

    // We need the correct answers — fetch from cache or regenerate
    let questionMap = {};
    for (const q of questions) {
      // If question has id starting with 'ai-', answers were generated in-session
      // We need to look them up from cache
      if (q.id && !q.id.startsWith('ai-')) {
        // Fetch from adaptive_question_bank
        const { data: cached } = await supabase
          .from('adaptive_question_bank')
          .select('correct_answer, explanation, sub_topic')
          .eq('id', q.id)
          .single();
        if (cached) {
          questionMap[q.id] = { ...q, correctAnswer: cached.correct_answer, explanation: cached.explanation, subTopic: cached.sub_topic };
        }
      }
    }

    // For AI-generated questions that haven't been cached yet with real IDs,
    // fetch from adaptive_question_bank by matching question text
    for (const q of questions) {
      if (!questionMap[q.id]) {
        const { data: matched } = await supabase
          .from('adaptive_question_bank')
          .select('id, correct_answer, explanation, sub_topic')
          .eq('exam_type', attempt.exam_type)
          .eq('chapter_name', attempt.chapter_name)
          .ilike('question_text', q.questionText?.substring(0, 100) + '%')
          .limit(1)
          .single();

        if (matched) {
          questionMap[q.id] = { ...q, correctAnswer: matched.correct_answer, explanation: matched.explanation, subTopic: matched.sub_topic || q.subTopic };
        } else {
          // If we can't find the answer key, skip evaluation for this question
          questionMap[q.id] = { ...q, correctAnswer: null, explanation: '', subTopic: q.subTopic };
        }
      }
    }

    // ─── EVALUATE ───
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const resultsData = [];
    const weakSubTopics = new Set();
    const strongSubTopics = new Set();

    for (const q of questions) {
      const fullQ = questionMap[q.id] || q;
      const userAnswer = answers[q.id] || answers[String(q.questionNumber)] || null;
      const correctAnswer = fullQ.correctAnswer;

      let status = 'skipped';
      let isCorrect = false;

      if (!userAnswer || userAnswer === '' || userAnswer === null) {
        skippedCount++;
        status = 'skipped';
      } else if (correctAnswer && userAnswer.toString().toUpperCase().trim() === correctAnswer.toString().toUpperCase().trim()) {
        correctCount++;
        status = 'correct';
        isCorrect = true;
        if (fullQ.subTopic) strongSubTopics.add(fullQ.subTopic);
      } else {
        wrongCount++;
        status = 'wrong';
        if (fullQ.subTopic) weakSubTopics.add(fullQ.subTopic);
      }

      resultsData.push({
        questionId: q.id,
        questionNumber: q.questionNumber,
        subTopic: fullQ.subTopic,
        userAnswer,
        correctAnswer,
        isCorrect,
        status,
        explanation: fullQ.explanation || '',
        questionText: fullQ.questionText || q.questionText,
        options: fullQ.options || q.options
      });

      // Update question stats in cache (fire & forget)
      if (q.id && !q.id.startsWith('ai-')) {
        supabase.rpc('update_question_stats', {
          q_id: q.id,
          was_correct: isCorrect
        }).catch(() => {});
      }
    }

    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 10000) / 100 : 0;
    const score = correctCount * 4 - wrongCount * 1; // Standard IAT/NEST marking

    // Remove strong topics from weak list
    for (const s of strongSubTopics) {
      weakSubTopics.delete(s);
    }

    // ─── UPDATE ATTEMPT ───
    await supabase
      .from('adaptive_attempts')
      .update({
        total_answered: totalAnswered,
        correct_count: correctCount,
        wrong_count: wrongCount,
        skipped_count: skippedCount,
        score,
        accuracy,
        answers_data: answers,
        results_data: resultsData,
        weak_sub_topics: Array.from(weakSubTopics),
        strong_sub_topics: Array.from(strongSubTopics),
        time_taken_seconds: timeTaken,
        submitted_at: new Date().toISOString()
      })
      .eq('id', attemptId);

    // ─── UPDATE CONCEPT MASTERY (per sub-topic) ───
    for (const result of resultsData) {
      if (!result.subTopic || result.status === 'skipped') continue;

      try {
        // Check if mastery record exists
        const { data: existing } = await supabase
          .from('student_concept_mastery')
          .select('*')
          .eq('student_email', studentEmail)
          .eq('exam_type', attempt.exam_type)
          .eq('chapter_name', attempt.chapter_name)
          .eq('sub_topic', result.subTopic)
          .single();

        if (existing) {
          const newTotal = existing.total_attempts + 1;
          const newCorrect = existing.correct_count + (result.isCorrect ? 1 : 0);
          const newWrong = existing.wrong_count + (result.isCorrect ? 0 : 1);
          const newMastery = Math.round((newCorrect / newTotal) * 10000) / 100;
          const newStreak = result.isCorrect ? existing.streak + 1 : 0;

          await supabase
            .from('student_concept_mastery')
            .update({
              total_attempts: newTotal,
              correct_count: newCorrect,
              wrong_count: newWrong,
              mastery_pct: newMastery,
              streak: newStreak,
              last_result: result.isCorrect ? 'correct' : 'wrong',
              last_tested_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('student_concept_mastery')
            .insert({
              student_email: studentEmail,
              exam_type: attempt.exam_type,
              subject: attempt.subject,
              chapter_name: attempt.chapter_name,
              sub_topic: result.subTopic,
              total_attempts: 1,
              correct_count: result.isCorrect ? 1 : 0,
              wrong_count: result.isCorrect ? 0 : 1,
              mastery_pct: result.isCorrect ? 100 : 0,
              streak: result.isCorrect ? 1 : 0,
              last_result: result.isCorrect ? 'correct' : 'wrong'
            });
        }
      } catch (masteryErr) {
        console.warn('[Adaptive] Mastery update warning:', masteryErr.message);
      }
    }

    // ─── RESPONSE ───
    return res.json({
      success: true,
      attemptId,
      summary: {
        totalQuestions: questions.length,
        answered: totalAnswered,
        correct: correctCount,
        wrong: wrongCount,
        skipped: skippedCount,
        score,
        accuracy,
        timeTaken
      },
      diagnosis: {
        weakSubTopics: Array.from(weakSubTopics),
        strongSubTopics: Array.from(strongSubTopics),
        recommendation: weakSubTopics.size > 0
          ? `Focus on: ${Array.from(weakSubTopics).join(', ')}. Try a targeted revision test.`
          : accuracy >= 80
            ? 'Excellent mastery! Move to the next chapter or increase difficulty.'
            : 'Good progress. Practice more to strengthen your understanding.'
      },
      results: resultsData
    });

  } catch (error) {
    console.error('[Adaptive] submitTest error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit test' });
  }
}

/**
 * GET /api/adaptive/mastery
 * Get student's concept mastery across chapters
 * Query: ?examType=iat&subject=Physics&chapterName=Rotational Motion
 */
export async function getChapterMastery(req, res) {
  try {
    const studentEmail = req.user?.email;
    if (!studentEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { examType = 'iat', subject, chapterName } = req.query;

    let query = supabase
      .from('student_concept_mastery')
      .select('*')
      .eq('student_email', studentEmail)
      .eq('exam_type', examType.toLowerCase());

    if (subject) query = query.eq('subject', subject);
    if (chapterName) query = query.eq('chapter_name', chapterName);

    const { data: mastery, error } = await query.order('mastery_pct', { ascending: true });

    if (error) {
      console.warn('[Adaptive] Mastery fetch error:', error.message);
      return res.json({ success: true, mastery: [] });
    }

    // Also fetch attempt history
    let historyQuery = supabase
      .from('adaptive_attempts')
      .select('id, chapter_name, subject, accuracy, score, correct_count, wrong_count, question_count, created_at, is_remediation')
      .eq('student_email', studentEmail)
      .eq('exam_type', examType.toLowerCase())
      .not('submitted_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (chapterName) historyQuery = historyQuery.eq('chapter_name', chapterName);

    const { data: history } = await historyQuery;

    // Group mastery by chapter
    const chapterMastery = {};
    for (const m of (mastery || [])) {
      const key = `${m.subject}|${m.chapter_name}`;
      if (!chapterMastery[key]) {
        chapterMastery[key] = {
          subject: m.subject,
          chapterName: m.chapter_name,
          subTopics: [],
          overallMastery: 0
        };
      }
      chapterMastery[key].subTopics.push({
        name: m.sub_topic,
        mastery: m.mastery_pct,
        totalAttempts: m.total_attempts,
        streak: m.streak,
        lastResult: m.last_result,
        lastTested: m.last_tested_at
      });
    }

    // Calculate overall mastery per chapter
    for (const key of Object.keys(chapterMastery)) {
      const ch = chapterMastery[key];
      const avg = ch.subTopics.reduce((sum, s) => sum + s.mastery, 0) / ch.subTopics.length;
      ch.overallMastery = Math.round(avg * 100) / 100;
    }

    return res.json({
      success: true,
      examType,
      mastery: Object.values(chapterMastery),
      history: history || []
    });

  } catch (error) {
    console.error('[Adaptive] getChapterMastery error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch mastery data' });
  }
}

/**
 * GET /api/adaptive/attempt/:attemptId
 * Get full attempt details with results (for diagnosis page)
 */
export async function getAttemptDetails(req, res) {
  try {
    const studentEmail = req.user?.email;
    const { attemptId } = req.params;

    const { data: attempt, error } = await supabase
      .from('adaptive_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('student_email', studentEmail)
      .single();

    if (error || !attempt) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }

    return res.json({
      success: true,
      attempt: {
        id: attempt.id,
        examType: attempt.exam_type,
        subject: attempt.subject,
        chapterName: attempt.chapter_name,
        questionCount: attempt.question_count,
        durationSeconds: attempt.duration_seconds,
        timeTaken: attempt.time_taken_seconds,
        totalAnswered: attempt.total_answered,
        correct: attempt.correct_count,
        wrong: attempt.wrong_count,
        skipped: attempt.skipped_count,
        score: attempt.score,
        accuracy: attempt.accuracy,
        isRemediation: attempt.is_remediation,
        weakSubTopics: attempt.weak_sub_topics,
        strongSubTopics: attempt.strong_sub_topics,
        results: attempt.results_data,
        startedAt: attempt.started_at,
        submittedAt: attempt.submitted_at
      }
    });

  } catch (error) {
    console.error('[Adaptive] getAttemptDetails error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch attempt details' });
  }
}

export default {
  getChapters,
  generateTest,
  submitTest,
  getChapterMastery,
  getAttemptDetails
};
