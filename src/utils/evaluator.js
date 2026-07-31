export function normaliseAnswer(raw) {
    if (raw === undefined || raw === null) return null;
    return String(raw).trim().toUpperCase();
}

export function evaluateOneQuestion(question, studentAnswer, marksPos, marksNeg) {
    const normalisedStudent = normaliseAnswer(studentAnswer);
    if (!normalisedStudent) return 0; // unattempted

    if (question.type === 'MCQ' || question.type === 'TrueFalse') {
        let correct = null;
        if (question.correct_answer) {
            correct = normaliseAnswer(question.correct_answer);
        } else if (question.correct_option_index !== undefined && question.correct_option_index !== null) {
            const index = Number(question.correct_option_index);
            if (index >= 0 && index <= 3) {
                correct = ['A', 'B', 'C', 'D'][index];
            }
        }

        if (normalisedStudent === correct) {
            return marksPos ?? 4;
        } else {
            return -(marksNeg ?? 1);
        }
    }

    if (question.type === 'MSQ') {
        const studentArr = normalisedStudent.split(',').map(s => s.trim()).sort();
        const correctStr = normaliseAnswer(question.correct_answer) || '';
        const correctArr = correctStr.split(',').map(s => s.trim()).sort();
        
        const allCorrect = studentArr.length === correctArr.length && studentArr.every((v, i) => v === correctArr[i]);
        const allInCorrect = studentArr.every(v => correctArr.includes(v));
        
        if (allCorrect) {
            return marksPos ?? 4;
        } else if (allInCorrect) {
            return 0; // partial match
        } else {
            return -(marksNeg ?? 1);
        }
    }

    if (question.type === 'Numerical') {
        const tolerance = question.numerical_tolerance ?? 0;
        const studentVal = parseFloat(normalisedStudent);
        const correctVal = parseFloat(normaliseAnswer(question.correct_answer));
        
        if (!isNaN(studentVal) && !isNaN(correctVal) && Math.abs(studentVal - correctVal) <= tolerance) {
            return marksPos ?? 4;
        } else {
            return -(marksNeg ?? 1);
        }
    }

    if (question.type === 'Descriptive') {
        return { score: 0, status: 'pending_manual' };
    }

    throw new Error(`Unknown question type: ${question.type}`);
}

export function evaluateNEST(answers, questions) {
    const subjectScores = { physics: 0, chemistry: 0, mathematics: 0, biology: 0 };
    const breakdown = [];
    
    for (const q of questions) {
        const subj = (q.subject || q.section || 'unknown').toLowerCase();
        const studentAns = answers[q.id];
        const score = evaluateOneQuestion(q, studentAns, q.marks_positive, q.marks_negative);
        
        if (typeof score === 'number' && subjectScores[subj] !== undefined) {
            subjectScores[subj] += score;
        }
        
        breakdown.push({ questionId: q.id, score });
    }
    
    const sortedScores = Object.entries(subjectScores)
        .sort((a, b) => b[1] - a[1]);
        
    const top3 = sortedScores.slice(0, 3);
    const dropped = sortedScores[3];
    
    const total = top3.reduce((sum, [_, s]) => sum + s, 0);
    
    return {
        total,
        subjectScores,
        droppedSubject: dropped[0],
        breakdown
    };
}

export function evaluateIAT(answers, questions) {
    const subjectScores = { physics: 0, chemistry: 0, mathematics: 0, biology: 0 };
    const breakdown = [];
    
    for (const q of questions) {
        const subj = (q.subject || q.section || 'unknown').toLowerCase();
        const studentAns = answers[q.id];
        const score = evaluateOneQuestion(q, studentAns, q.marks_positive, q.marks_negative);
        
        if (typeof score === 'number' && subjectScores[subj] !== undefined) {
            subjectScores[subj] += score;
        } else if (typeof score === 'number') {
            subjectScores[subj] = (subjectScores[subj] || 0) + score;
        }
        
        breakdown.push({ questionId: q.id, score });
    }
    
    const total = Object.values(subjectScores).reduce((sum, s) => sum + s, 0);
    
    return {
        total,
        subjectScores,
        breakdown
    };
}

export function evaluateCMI(answers, questions, partACutoff = 24) {
    let partAScore = 0;
    
    for (const q of questions) {
        if (q.part_type === 'Part A') {
            const studentAns = answers[q.id];
            const score = evaluateOneQuestion(q, studentAns, q.marks_positive ?? 4, q.marks_negative ?? 1);
            if (typeof score === 'number') {
                partAScore += score;
            }
        }
    }
    
    const partBStatus = partAScore >= partACutoff ? 'pending_manual' : 'not_evaluated';
    
    return {
        partAScore,
        partBStatus,
        total: partAScore
    };
}
