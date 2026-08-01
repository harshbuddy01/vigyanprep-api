// backend/services/pyqParser.js
// 🤖 VISION-AI ENHANCED QUESTION EXTRACTION SERVICE

import { PDFParse } from 'pdf-parse';

/**
 * Extract questions from PDF buffer using high-precision parser
 */
export async function parsePdfQuestions(pdfBuffer) {
  const parser = new PDFParse({ data: pdfBuffer });
  const result = await parser.getText();

  if (!result || !result.pages || !Array.isArray(result.pages)) {
    throw new Error('Could not extract text pages from PDF');
  }

  const rawText = result.pages.map(p => p.text || '').join('\n');
  const cleanText = rawText
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\f/g, '\n')
    .trim();

  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
  const questions = [];
  let currentQ = null;
  let currentSection = 'Physics';

  const qPatterns = [
    /^(?:Q(?:uestion)?\.?\s*)(\d{1,3})[.):\s]/i,
    /^(\d{1,3})[.)]\s+\S/,
  ];

  const optPattern = /^[\[(]?([A-D])[\])]?[.)]\s*(.*)/i;
  const ansPattern = /^(?:answer|ans(?:wer)?)[.:\s]+[\[(]?([A-D])[\])]?/i;

  const pushCurrent = () => {
    if (currentQ && currentQ.text && currentQ.text.length > 5) {
      while (currentQ.options.length < 4) {
        const letters = ['A', 'B', 'C', 'D'];
        currentQ.options.push(`Option ${letters[currentQ.options.length]}`);
      }
      currentQ.options = currentQ.options.slice(0, 4);
      questions.push(currentQ);
    }
  };

  for (const line of lines) {
    // Check section header
    const upper = line.toUpperCase();
    if (/\bPHYSICS\b/.test(upper)) currentSection = 'Physics';
    else if (/\bCHEMISTR/.test(upper)) currentSection = 'Chemistry';
    else if (/\bMATH/.test(upper)) currentSection = 'Mathematics';
    else if (/\bBIOLOG/.test(upper)) currentSection = 'Biology';

    // Check answer line
    const ansMatch = line.match(ansPattern);
    if (ansMatch && currentQ) {
      currentQ.correct_answer = ansMatch[1].toUpperCase();
      continue;
    }

    // Check question header
    let qMatch = null;
    for (const pat of qPatterns) {
      const m = line.match(pat);
      if (m) { qMatch = m; break; }
    }

    if (qMatch) {
      pushCurrent();
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
        status: 'review_pending'
      };
      continue;
    }

    // Check option line
    const optMatch = line.match(optPattern);
    if (optMatch && currentQ) {
      if (currentQ.options.length < 4) {
        currentQ.options.push(optMatch[2].trim() || `Option ${optMatch[1]}`);
      }
      continue;
    }

    // Continuation
    if (currentQ) {
      if (currentQ.options.length === 0) {
        currentQ.question_text += ' ' + line;
        currentQ.text += ' ' + line;
      } else {
        const lastIdx = currentQ.options.length - 1;
        currentQ.options[lastIdx] += ' ' + line;
      }
    }
  }

  pushCurrent();

  return questions.map((q, idx) => ({
    tempId: `q_parsed_${Date.now()}_${idx}`,
    questionNumber: q.question_number,
    section: q.section,
    type: 'MCQ',
    text: q.question_text,
    options: q.options,
    correctAnswer: q.correct_answer || 'A',
    imageUrl: '',
    confidence: 'high'
  }));
}
