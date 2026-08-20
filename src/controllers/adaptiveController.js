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
      {
        name: 'Mechanics & Kinematics',
        subTopics: [
          'Kinematics in 1D (Rectilinear Motion, Graphs, Acceleration)',
          'Kinematics in 2D & Projectile Motion (Horizontal & Inclined)',
          'Relative Motion in 1D and 2D (River-Boat, Rain-Man)',
          'Newton\'s Laws of Motion & Constraint Relations',
          'Friction (Static, Kinetic, Rolling)',
          'Circular Motion (Centripetal Acceleration, Banking)',
          'Work, Energy & Power (Work-Energy Theorem)',
          'Center of Mass, Linear Momentum & Collisions'
        ]
      },
      { name: 'Rotational Motion', subTopics: ['Moment of Inertia', 'Angular Momentum & Conservation', 'Torque & Angular Acceleration', 'Rolling Motion without Slipping', 'Rotational Dynamics'] },
      { name: 'Gravitation', subTopics: ['Kepler\'s Laws', 'Gravitational Potential & Field', 'Escape Velocity', 'Orbital Mechanics & Satellites', 'Gravitational Binding Energy'] },
      { name: 'Oscillations & Waves', subTopics: ['Simple Harmonic Motion (SHM)', 'Damped & Forced Oscillations', 'Wave Equation & Velocity', 'Doppler Effect in Sound', 'Superposition & Standing Waves'] },
      { name: 'Thermodynamics & Heat', subTopics: ['First & Second Laws of Thermodynamics', 'Carnot Engine & Efficiency', 'Entropy & Heat Transfer', 'Ideal Gas Equation & Kinetic Theory', 'Calorimetry & Thermal Expansion'] },
      { name: 'Electrostatics', subTopics: ['Coulomb\'s Law & Superposition', 'Gauss\'s Law & Applications', 'Electric Potential & Energy', 'Capacitors & Dielectrics', 'Charge Distribution & Dipoles'] },
      { name: 'Current Electricity', subTopics: ['Ohm\'s Law & Drift Velocity', 'Kirchhoff\'s Current & Voltage Laws', 'RC Circuits & Transient Analysis', 'Wheatstone Bridge & Potentiometer', 'Electrical Power & Heating Effect'] },
      { name: 'Magnetism & EMI', subTopics: ['Biot-Savart Law & Magnetic Field', 'Ampere\'s Circuital Law & Solenoids', 'Lorentz Force & Cyclotron', 'Faraday\'s & Lenz\'s Law', 'Self & Mutual Inductance', 'AC Circuits & Resonance'] },
      { name: 'Optics & Wave Optics', subTopics: ['Geometrical Optics (Reflection & Refraction)', 'Thin Lens & Mirror Formulas', 'Total Internal Reflection & Prisms', 'Young\'s Double Slit Experiment (YDSE)', 'Diffraction & Polarization'] },
      { name: 'Modern Physics', subTopics: ['Photoelectric Effect & Photons', 'Bohr Model of Hydrogen Atom', 'De Broglie Wavelength & Dual Nature', 'Nuclear Physics & Binding Energy', 'Radioactivity & Nuclear Decay'] },
    ],
    Chemistry: [
      { name: 'Atomic Structure', subTopics: ['Quantum Numbers & Orbitals', 'Bohr Model & Rydberg Formula', 'Electronic Configuration & Aufbau Principle', 'Heisenberg Uncertainty Principle'] },
      { name: 'Chemical Bonding', subTopics: ['VSEPR Theory & Shapes of Molecules', 'Hybridization & Molecular Geometry', 'Molecular Orbital Theory (MOT)', 'Hydrogen Bonding & Intermolecular Forces', 'Dipole Moments & Ionic Character'] },
      { name: 'Thermodynamics & Thermochemistry', subTopics: ['Enthalpy & First Law', 'Hess\'s Law & Bond Energy Calculations', 'Gibbs Free Energy & Spontaneity', 'Entropy & Second Law of Thermodynamics'] },
      { name: 'Chemical Kinetics', subTopics: ['Rate Laws & Integrated Rate Equations', 'First Order & Second Order Reactions', 'Arrhenius Equation & Activation Energy', 'Reaction Mechanisms & Catalysis'] },
      { name: 'Chemical & Ionic Equilibrium', subTopics: ['Le Chatelier\'s Principle', 'Equilibrium Constant (Kc, Kp)', 'pH Calculations & Buffer Solutions', 'Solubility Product (Ksp) & Salt Hydrolysis'] },
      { name: 'Electrochemistry', subTopics: ['Nernst Equation & Cell Potential', 'Galvanic & Electrolytic Cells', 'Kohlrausch\'s Law & Conductance', 'Faraday\'s Laws of Electrolysis'] },
      { name: 'Organic Reaction Mechanisms', subTopics: ['IUPAC Nomenclature & Isomerism', 'Electrophilic & Nucleophilic Substitution', 'Elimination Reactions (E1, E2)', 'Aldol, Cannizzaro & Named Reactions', 'Aromatic Compounds & Resonance'] },
      { name: 'Coordination Chemistry', subTopics: ['Crystal Field Theory (CFT)', 'Werner\'s Theory & Isomerism', 'Spectrochemical Series & CFSE', 'Magnetic Properties & Color of Complexes'] },
    ],
    Mathematics: [
      { name: 'Differential Calculus', subTopics: ['Limits & Indeterminate Forms', 'Continuity & Differentiability', 'Derivatives & Chain Rule', 'Application of Derivatives (Maxima, Minima, Tangents)', 'Mean Value Theorems'] },
      { name: 'Integral Calculus', subTopics: ['Indefinite Integration Techniques', 'Definite Integrals & Properties', 'Area Under Curves', 'Differential Equations (Separable & Linear)'] },
      { name: 'Algebra & Complex Numbers', subTopics: ['Quadratic Equations & Roots', 'Complex Numbers (Argand Plane, De Moivre\'s)', 'Matrices & Determinants (Properties & Inverses)', 'Sequences & Series (AP, GP, HP, Arithmetico-Geometric)'] },
      { name: 'Coordinate Geometry', subTopics: ['Straight Lines & Pair of Lines', 'Circles & Tangents', 'Parabola & Standard Forms', 'Ellipse & Hyperbola (Eccentricity, Directrix)'] },
      { name: 'Vectors & 3D Geometry', subTopics: ['Vector Algebra & Linear Combinations', 'Dot Product & Cross Product', 'Triple Products (Scalar & Vector)', 'Equation of Lines & Planes in 3D', 'Shortest Distance between Skew Lines'] },
      { name: 'Probability & Permutations', subTopics: ['Permutations & Combinations', 'Conditional Probability & Bayes\' Theorem', 'Binomial Distribution & Expectation', 'Probability Distributions'] },
    ],
    Biology: [
      { name: 'Cell Biology & Biomolecules', subTopics: ['Cell Structure & Organelles', 'Cell Division (Mitosis & Meiosis)', 'Biomolecules (Proteins, Lipids, Carbohydrates, Nucleic Acids)', 'Enzymes & Kinetics'] },
      { name: 'Genetics & Molecular Biology', subTopics: ['Mendelian Genetics & Inheritance Patterns', 'DNA Replication, Transcription & Translation', 'Gene Regulation & Operon Model', 'Mutations & Genetic Disorders'] },
      { name: 'Human Physiology', subTopics: ['Nervous System & Neural Conduction', 'Endocrine Control & Hormones', 'Circulatory System & Cardiac Cycle', 'Respiration & Gas Exchange', 'Excretion & Osmoregulation'] },
      { name: 'Plant Physiology', subTopics: ['Photosynthesis (Light & Dark Reactions)', 'Plant Water Relations & Transpiration', 'Mineral Nutrition & Transport', 'Plant Growth Regulators (Auxins, Gibberellins)'] },
      { name: 'Ecology & Evolution', subTopics: ['Ecosystem Structure & Energy Flow', 'Population Ecology & Interactions', 'Biodiversity & Conservation', 'Darwinian Evolution & Speciation'] },
    ]
  },
  nest: {
    Physics: [
      { name: 'Classical Mechanics', subTopics: ['Kinematics in 1D & 2D', 'Newton\'s Laws & Applications', 'Work, Energy & Power', 'Center of Mass & Collisions', 'Rotational Dynamics & Moment of Inertia', 'Gravitation & Kepler\'s Laws', 'Simple Harmonic Motion'] },
      { name: 'Electromagnetism', subTopics: ['Coulomb\'s Law & Electric Field', 'Gauss\'s Law & Capacitors', 'Current Electricity & Circuits', 'Magnetic Field & Biot-Savart Law', 'Electromagnetic Induction & AC', 'Maxwell\'s Equations & EM Waves'] },
      { name: 'Optics & Waves', subTopics: ['Ray Optics (Reflection, Refraction, Prisms)', 'Wave Optics (Interference, Diffraction, Polarization)', 'Wave Motion & Superposition', 'Sound Waves & Doppler Effect', 'Standing Waves & Resonance'] },
      { name: 'Thermodynamics & Kinetic Theory', subTopics: ['Laws of Thermodynamics', 'Carnot Engine & Entropy', 'Kinetic Theory of Gases', 'Ideal Gas & Equation of State', 'Thermal Properties & Heat Transfer'] },
      { name: 'Modern Physics', subTopics: ['Photoelectric Effect & Photons', 'Bohr Model & Hydrogen Spectrum', 'De Broglie & Wave-Particle Duality', 'Nuclear Physics & Radioactivity', 'Special Relativity Basics', 'Quantum Mechanics Fundamentals'] }
    ],
    Chemistry: [
      { name: 'Physical Chemistry', subTopics: ['Atomic Structure & Quantum Numbers', 'Chemical Thermodynamics & Hess\'s Law', 'Chemical Kinetics & Rate Laws', 'Chemical Equilibrium & Le Chatelier', 'Electrochemistry & Nernst Equation', 'Solutions & Colligative Properties', 'Surface Chemistry & Catalysis'] },
      { name: 'Inorganic Chemistry', subTopics: ['Periodic Table & Periodic Trends', 'Chemical Bonding & Molecular Structure', 's-Block & p-Block Elements', 'd-Block Elements & Transition Metals', 'Coordination Compounds & CFT', 'Metallurgy & Extraction Processes', 'Qualitative Salt Analysis'] },
      { name: 'Organic Chemistry', subTopics: ['IUPAC Nomenclature & Isomerism', 'Reaction Mechanisms (SN1, SN2, E1, E2)', 'Stereochemistry & Optical Activity', 'Hydrocarbons & Functional Groups', 'Carbonyl Compounds & Named Reactions', 'Biomolecules (Amino Acids, Carbohydrates)', 'Polymers & Practical Organic Chemistry'] }
    ],
    Mathematics: [
      { name: 'Calculus', subTopics: ['Limits & Continuity', 'Differentiation & Chain Rule', 'Applications of Derivatives', 'Indefinite & Definite Integration', 'Area Under Curves', 'Differential Equations', 'Series Convergence Tests'] },
      { name: 'Algebra', subTopics: ['Quadratic Equations & Roots', 'Complex Numbers & De Moivre', 'Matrices & Determinants', 'Linear Algebra Basics', 'Sequences, Series & Summations', 'Polynomials & Factorization'] },
      { name: 'Combinatorics & Probability', subTopics: ['Permutations & Combinations', 'Pigeonhole Principle', 'Binomial Theorem', 'Probability & Conditional Probability', 'Bayes Theorem & Distributions', 'Generating Functions Basics'] },
      { name: 'Number Theory & Geometry', subTopics: ['Prime Numbers & Divisibility', 'Congruences & Modular Arithmetic', 'Coordinate Geometry (Lines, Conics)', 'Vectors & 3D Geometry', 'Trigonometry & Identities', 'Geometric Constructions & Proofs'] }
    ],
    Biology: [
      { name: 'Cell & Molecular Biology', subTopics: ['Cell Structure & Organelles', 'Cell Membrane & Transport', 'DNA Replication & Repair', 'Transcription & Translation', 'Cell Signaling & Signal Transduction', 'Cell Cycle, Mitosis & Meiosis'] },
      { name: 'Genetics & Evolution', subTopics: ['Mendelian Inheritance & Pedigree', 'Linkage, Crossing Over & Mapping', 'Gene Regulation (Prokaryotic & Eukaryotic)', 'Mutations & Chromosomal Aberrations', 'Population Genetics & Hardy-Weinberg', 'Natural Selection & Speciation', 'Human Evolution'] },
      { name: 'Ecology & Environment', subTopics: ['Ecosystem Structure & Energy Flow', 'Population Ecology & Interactions', 'Biogeochemical Cycles', 'Biodiversity & Conservation', 'Environmental Issues & Pollution', 'Climate Change & Ozone Depletion'] },
      { name: 'Physiology (Plant & Animal)', subTopics: ['Photosynthesis & Respiration in Plants', 'Plant Water Relations & Mineral Nutrition', 'Plant Growth Regulators', 'Human Digestive & Respiratory Systems', 'Circulatory & Excretory Systems', 'Nervous System & Endocrine Control', 'Immune System & Human Health'] },
      { name: 'Biotechnology & Applications', subTopics: ['Recombinant DNA Technology', 'PCR & DNA Fingerprinting', 'Transgenic Organisms & Bt Crops', 'Gene Therapy & Molecular Diagnostics', 'Bioethics & Biosafety Issues'] }
    ]
  },
  isi: {
    Mathematics: [
      { name: 'Algebra & Polynomials', subTopics: ['Quadratic Equations & Discriminant', 'Polynomials & Factor Theorem', 'Complex Numbers & Argand Plane', 'Inequalities (AM-GM, Cauchy-Schwarz)', 'Sequences & Series (AP, GP, Telescoping)', 'Matrices & Determinants', 'Systems of Linear Equations'] },
      { name: 'Number Theory', subTopics: ['Divisibility & GCD/LCM', 'Prime Numbers & Fundamental Theorem', 'Modular Arithmetic & Congruences', 'Diophantine Equations', 'Euler\'s Totient & Fermat\'s Little Theorem', 'Floor & Ceiling Functions'] },
      { name: 'Combinatorics', subTopics: ['Permutations & Combinations', 'Pigeonhole Principle', 'Inclusion-Exclusion Principle', 'Binomial Theorem & Identities', 'Generating Functions', 'Graph Theory Basics (Paths, Cycles, Trees)'] },
      { name: 'Geometry & Trigonometry', subTopics: ['Triangles (Congruence, Similarity, Cevians)', 'Circles (Power of a Point, Radical Axes)', 'Coordinate Geometry (Lines, Conics)', 'Trigonometric Identities & Equations', 'Geometric Transformations', 'Vectors in 2D & 3D'] },
      { name: 'Calculus', subTopics: ['Limits & Continuity', 'Differential Calculus (Derivatives, Rolle, MVT)', 'Applications of Derivatives (Maxima, Minima, Curve Sketching)', 'Integral Calculus (Techniques, Definite Integrals)', 'Area Under Curves', 'Ordinary Differential Equations (First Order)'] },
      { name: 'Probability & Statistics', subTopics: ['Classical Probability & Counting', 'Conditional Probability & Bayes Theorem', 'Random Variables & Expectation', 'Binomial & Poisson Distributions', 'Descriptive Statistics (Mean, Variance, SD)'] }
    ]
  }
};

// ─── AI QUESTION GENERATION ─────────────────────────────────────────────

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

// Primary models in priority order (Fastest first to guarantee sub-3-second generation)
const AI_MODELS = [
  { provider: 'openrouter', model: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
  { provider: 'openrouter', model: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
];

function buildQuestionPrompt(examType, subject, chapterName, subTopics, count, difficulty, weakSubTopics, seenPrompts = []) {
  const focusInstruction = weakSubTopics && weakSubTopics.length > 0
    ? `\n\nIMPORTANT: The student previously struggled with these specific sub-topics: ${weakSubTopics.join(', ')}. Generate at least ${Math.ceil(count * 0.6)} questions targeting these weak areas to help remediate their understanding.`
    : '';

  const excludeInstruction = seenPrompts && seenPrompts.length > 0
    ? `\n\nDO NOT repeat or generate similar questions to these previously answered questions: ${seenPrompts.slice(0, 6).join(' | ')}`
    : '';

  return `You are an expert scientific examination creator for competitive Indian science entrance exams (IISER IAT, NISER NEST, ISI).

Generate EXACTLY ${count} unique, high-quality multiple-choice questions.

**Exam**: ${examType.toUpperCase()}
**Subject**: ${subject}
**Chapter**: ${chapterName}
**Target Sub-topics**: ${subTopics.join(', ')}
**Difficulty**: ${difficulty}
${focusInstruction}
${excludeInstruction}

STRICT JSON OUTPUT RULES:
1. You MUST output a valid JSON object with a root "questions" array containing EXACTLY ${count} question objects.
2. Every question object MUST have:
   - "subTopic": (string matching one of the target sub-topics)
   - "questionText": (string with LaTeX math enclosed in $...$ or $$...$$)
   - "options": (array of exactly 4 strings: [option A, option B, option C, option D])
   - "correctAnswer": ("A" | "B" | "C" | "D")
   - "difficulty": "${difficulty}"
   - "explanation": (step-by-step mathematical derivation with KaTeX math)
3. CRITICAL: All LaTeX backslashes MUST be escaped with double backslashes in JSON strings (e.g. \\\\frac{a}{b}, \\\\sqrt{x}, \\\\omega, \\\\theta, \\\\vec{F}, \\\\mu, \\\\text{...}). Never produce raw control characters like form-feed or unescaped backslashes.
4. Questions must be challenging, rigorous, and test scientific reasoning rather than trivia.
5. Output ONLY the JSON object. Do NOT wrap in markdown backticks.

Example JSON structure:
{
  "questions": [
    {
      "subTopic": "${subTopics[0] || chapterName}",
      "questionText": "A particle moves such that its velocity is $v(t) = 3t^2 + 2\\\\text{ m/s}$. Find its displacement between $t = 0$ and $t = 2\\\\text{ s}$.",
      "options": ["$8\\\\text{ m}$", "$12\\\\text{ m}$", "$14\\\\text{ m}$", "$16\\\\text{ m}$"],
      "correctAnswer": "B",
      "difficulty": "${difficulty}",
      "explanation": "Step 1: Displacement $s = \\\\int_0^2 (3t^2 + 2)\\\\ dt = [t^3 + 2t]_0^2 = 8 + 4 = 12\\\\text{ m}$."
    }
  ]
}`;
}

async function callOpenRouter(prompt, model, maxTokens = 3500) {
  if (!OPENROUTER_KEY) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

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
          { role: 'system', content: 'You are an expert exam question creator. Output ONLY valid JSON objects with a "questions" array. All LaTeX backslashes must be double-escaped.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

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

async function callGroq(prompt, maxTokens = 3500) {
  if (!GROQ_KEY) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an expert exam question creator. Output ONLY valid JSON objects with a "questions" array. All LaTeX backslashes must be double-escaped.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

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

  // Sanitize invalid control characters before JSON parse
  text = text.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f]/g, (match) => {
    if (match === '\x0c') return '\\f';
    return ' ';
  });

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
    console.error('[Adaptive] JSON parse failed, trying fallback:', e.message);

    // Attempt to extract JSON object with questions array
    const objMatch = text.match(/\{[\s\S]*"questions"[\s\S]*\}/);
    if (objMatch) {
      try {
        const obj = JSON.parse(objMatch[0]);
        if (obj.questions && Array.isArray(obj.questions)) return obj.questions;
      } catch {}
    }

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

async function generateQuestionsWithAI(examType, subject, chapterName, subTopics, count, difficulty, weakSubTopics, seenPrompts = []) {
  const prompt = buildQuestionPrompt(examType, subject, chapterName, subTopics, count, difficulty, weakSubTopics, seenPrompts);

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

// ─── PAID ACCESS HELPER ───────────────────────────────────────────────
export async function checkPaidAccess(studentEmail, studentId) {
  if (!studentEmail) return false;

  // Platform admins & owner always have full preview access
  const emailLower = studentEmail.toLowerCase().trim();
  if (emailLower === 'anandharsh437@gmail.com' || emailLower.includes('admin@') || emailLower.startsWith('admin_')) {
    return true;
  }

  const isUUID = (str) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

  try {
    // 1. Check subscriptions table for active pass
    try {
      let subQuery = supabase
        .from('subscriptions')
        .select('id, status, plan_name, exam_type')
        .eq('status', 'active');

      if (studentId && isUUID(studentId)) {
        subQuery = subQuery.or(`student_id.eq.${studentId},student_email.eq.${studentEmail.trim()}`);
      } else {
        subQuery = subQuery.ilike('student_email', studentEmail.trim());
      }

      const { data: activeSubs, error: subErr } = await subQuery.limit(1);
      if (!subErr && activeSubs && activeSubs.length > 0) return true;
    } catch {}

    // 2. Check purchased_tests table
    try {
      const { data: purchased, error: purchErr } = await supabase
        .from('purchased_tests')
        .select('id')
        .ilike('email', studentEmail.trim())
        .limit(1);
      if (!purchErr && purchased && purchased.length > 0) return true;
    } catch {}

    // 3. Check successful payment transactions
    try {
      const { data: payments, error: payErr } = await supabase
        .from('payment_transactions')
        .select('id')
        .ilike('email', studentEmail.trim())
        .eq('status', 'paid')
        .limit(1);
      if (!payErr && payments && payments.length > 0) return true;
    } catch {}

    return false;
  } catch (err) {
    console.warn('[Adaptive] checkPaidAccess warning:', err.message);
    return false;
  }
}

/**
 * GET /api/adaptive/check-access
 * Check if the logged-in student has paid access to AI revision
 */
export async function checkAccessStatus(req, res) {
  try {
    const studentEmail = req.user?.email;
    const studentId = req.user?.id;

    if (!studentEmail) {
      return res.status(401).json({ success: false, isPaid: false, error: 'Authentication required' });
    }

    const isPaid = await checkPaidAccess(studentEmail, studentId);
    return res.json({
      success: true,
      isPaid,
      studentEmail,
      message: isPaid ? 'Full access granted' : 'Subscription required to unlock AI revision'
    });
  } catch (error) {
    return res.status(500).json({ success: false, isPaid: false, error: error.message });
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
    const studentId = req.user?.id;
    if (!studentEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // 🔒 PAID STUDENT GATE: Check if student has purchased any test or pass
    const isPaid = await checkPaidAccess(studentEmail, studentId);
    if (!isPaid) {
      return res.status(403).json({
        success: false,
        code: 'PAID_STUDENTS_ONLY',
        error: 'Smart AI Daily Chapter Revision is an exclusive feature for enrolled students with an active test series or pass. Please purchase a test pass to unlock unlimited AI revisions.',
        redirect: 'https://vigyanprep.com/tests'
      });
    }

    const {
      examType = 'iat',
      subject,
      chapterName,
      selectedSubTopics,
      subTopics,
      questionCount,
      count: directCount,
      durationMinutes = 15,
      difficulty = 'medium'
    } = req.body;

    const requestedSubTopics = selectedSubTopics || subTopics;
    const requestedCount = questionCount || directCount || 10;

    // Validate inputs
    if (!subject || !chapterName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: subject and chapterName are required'
      });
    }

    const examChapters = CHAPTER_DATA[examType.toLowerCase()] || CHAPTER_DATA.iat;
    const subjectChapters = examChapters[subject] || [];
    const chapterDef = subjectChapters.find(
      c => c.name.toLowerCase() === chapterName.toLowerCase()
    );

    if (!chapterDef) {
      return res.status(404).json({
        success: false,
        error: `Chapter "${chapterName}" not found in ${subject} for ${examType}`
      });
    }

    const activeSubTopics = (requestedSubTopics && Array.isArray(requestedSubTopics) && requestedSubTopics.length > 0)
      ? requestedSubTopics
      : chapterDef.subTopics;

    const count = Math.min(Math.max(parseInt(requestedCount) || 10, 3), 30);
    const durationSec = Math.min(Math.max(parseInt(durationMinutes) || 15, 3), 120) * 60;

    // ─── STEP 0: Fetch questions previously seen by this student to prevent repetition ───
    let seenQuestionIds = [];
    let seenQuestionTexts = [];
    try {
      const { data: pastAttempts } = await supabase
        .from('adaptive_attempts')
        .select('questions_data')
        .eq('student_email', studentEmail)
        .eq('exam_type', examType.toLowerCase())
        .eq('chapter_name', chapterName)
        .order('created_at', { ascending: false })
        .limit(10);

      if (pastAttempts) {
        for (const pa of pastAttempts) {
          const qList = typeof pa.questions_data === 'string' ? JSON.parse(pa.questions_data) : pa.questions_data;
          if (Array.isArray(qList)) {
            for (const q of qList) {
              if (q.id && !q.id.startsWith('ai-')) seenQuestionIds.push(q.id);
              if (q.questionText) seenQuestionTexts.push(q.questionText.slice(0, 60));
            }
          }
        }
      }
      if (seenQuestionIds.length > 0) {
        console.log(`[Adaptive] Excluding ${seenQuestionIds.length} previously attempted questions for ${studentEmail}`);
      }
    } catch (pastErr) {
      console.warn('[Adaptive] Past attempts lookup:', pastErr.message);
    }

    // ─── STEP 1: Check for cached questions in database ───
    let cachedQuestions = [];
    try {
      let cacheQuery = supabase
        .from('adaptive_question_bank')
        .select('*')
        .eq('exam_type', examType.toLowerCase())
        .eq('subject', subject)
        .eq('chapter_name', chapterName)
        .eq('is_flagged', false);

      if (selectedSubTopics && Array.isArray(selectedSubTopics) && selectedSubTopics.length > 0) {
        cacheQuery = cacheQuery.in('sub_topic', selectedSubTopics);
      }

      if (seenQuestionIds.length > 0) {
        const idFilterList = `(${seenQuestionIds.map(id => `"${id}"`).join(',')})`;
        cacheQuery = cacheQuery.not('id', 'in', idFilterList);
      }

      const { data: cached } = await cacheQuery
        .order('times_served', { ascending: true })
        .limit(count);

      if (cached && cached.length >= count) {
        cachedQuestions = cached.slice(0, count);
        console.log(`[Adaptive] ✅ Serving ${cachedQuestions.length} fresh cached questions for ${chapterName} (${activeSubTopics.join(', ')})`);
      }
    } catch (cacheErr) {
      console.warn('[Adaptive] Cache lookup failed:', cacheErr.message);
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

      // Increment times_served (fire & forget)
      const ids = cachedQuestions.map(q => q.id);
      if (ids.length > 0) {
        supabase.rpc('increment_times_served', { question_ids: ids }).then(() => {}, () => {});
      }
    } else {
      // Generate fresh questions with AI
      const needed = count - cachedQuestions.length;
      console.log(`[Adaptive] Generating ${needed} new questions via AI...`);

      const result = await generateQuestionsWithAI(
        examType, subject, chapterName,
        activeSubTopics, needed, difficulty, weakSubTopics,
        seenQuestionTexts
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
        }).then(() => {}, () => {});
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

/**
 * POST /api/adaptive/bookmark
 * Add a question to bookmarks
 * Body: { questionId, questionText, options, correctAnswer, explanation, subTopic, chapterName, subject, examType, difficulty }
 */
export async function addBookmark(req, res) {
  try {
    const studentEmail = req.user?.email;
    if (!studentEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { questionId, questionText, options, correctAnswer, explanation, subTopic, chapterName, subject, examType, difficulty } = req.body;

    if (!questionId || !questionText) {
      return res.status(400).json({ success: false, error: 'questionId and questionText are required' });
    }

    const { data, error } = await supabase
      .from('bookmarked_questions')
      .upsert({
        student_email: studentEmail,
        question_id: questionId,
        question_text: questionText,
        options: typeof options === 'string' ? JSON.parse(options) : options,
        correct_answer: correctAnswer,
        explanation: explanation || '',
        sub_topic: subTopic || '',
        chapter_name: chapterName || '',
        subject: subject || '',
        exam_type: (examType || 'iat').toLowerCase(),
        difficulty: difficulty || 'medium'
      }, { onConflict: 'student_email,question_id' })
      .select('id')
      .single();

    if (error) {
      console.error('[Adaptive] Bookmark add error:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to add bookmark' });
    }

    return res.json({ success: true, bookmarkId: data.id });
  } catch (err) {
    console.error('[Adaptive] addBookmark error:', err);
    return res.status(500).json({ success: false, error: 'Failed to add bookmark' });
  }
}

/**
 * DELETE /api/adaptive/bookmark/:questionId
 * Remove a question from bookmarks
 */
export async function removeBookmark(req, res) {
  try {
    const studentEmail = req.user?.email;
    if (!studentEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { questionId } = req.params;
    if (!questionId) {
      return res.status(400).json({ success: false, error: 'questionId is required' });
    }

    const { error } = await supabase
      .from('bookmarked_questions')
      .delete()
      .eq('student_email', studentEmail)
      .eq('question_id', questionId);

    if (error) {
      console.error('[Adaptive] Bookmark remove error:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to remove bookmark' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[Adaptive] removeBookmark error:', err);
    return res.status(500).json({ success: false, error: 'Failed to remove bookmark' });
  }
}

/**
 * GET /api/adaptive/bookmarks
 * Get all bookmarked questions for current student
 * Query params: subject, chapterName, examType (all optional filters)
 */
export async function getBookmarks(req, res) {
  try {
    const studentEmail = req.user?.email;
    if (!studentEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    let query = supabase
      .from('bookmarked_questions')
      .select('*')
      .eq('student_email', studentEmail)
      .order('created_at', { ascending: false });

    if (req.query.subject) {
      query = query.eq('subject', req.query.subject);
    }
    if (req.query.chapterName) {
      query = query.eq('chapter_name', req.query.chapterName);
    }
    if (req.query.examType) {
      query = query.eq('exam_type', req.query.examType.toLowerCase());
    }

    const { data, error } = await query.limit(200);

    if (error) {
      console.error('[Adaptive] Bookmarks fetch error:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch bookmarks' });
    }

    return res.json({
      success: true,
      bookmarks: (data || []).map(b => ({
        id: b.id,
        questionId: b.question_id,
        questionText: b.question_text,
        options: b.options,
        correctAnswer: b.correct_answer,
        explanation: b.explanation,
        subTopic: b.sub_topic,
        chapterName: b.chapter_name,
        subject: b.subject,
        examType: b.exam_type,
        difficulty: b.difficulty,
        createdAt: b.created_at
      }))
    });
  } catch (err) {
    console.error('[Adaptive] getBookmarks error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch bookmarks' });
  }
}
