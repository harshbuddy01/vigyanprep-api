export function evaluateNEST(answers, questions) {
    let total = 0;
    const subjectScores = { physics: 0, chemistry: 0, biology: 0, mathematics: 0 };
    const breakdown = { correct: 0, incorrect: 0, unattempted: 0 };

    questions.forEach(q => {
        const ans = answers[q.id] || answers[q._id];
        if (!ans || !ans.selected_option) {
            breakdown.unattempted++;
            return;
        }

        const subject = (q.subject || 'physics').toLowerCase();
        if (subjectScores[subject] === undefined) subjectScores[subject] = 0;

        if (ans.selected_option === q.correct_option) {
            subjectScores[subject] += 3;
            breakdown.correct++;
        } else {
            subjectScores[subject] -= 1;
            breakdown.incorrect++;
        }
    });

    const scores = Object.entries(subjectScores).map(([sub, score]) => ({ sub, score }));
    scores.sort((a, b) => a.score - b.score);
    const droppedSubject = scores[0].sub;
    
    total = scores[1].score + scores[2].score + scores[3].score;

    return { total, subjectScores, breakdown, droppedSubject };
}

export function evaluateIAT(answers, questions) {
    let total = 0;
    const subjectScores = { physics: 0, chemistry: 0, biology: 0, mathematics: 0 };
    const breakdown = { correct: 0, incorrect: 0, unattempted: 0 };

    questions.forEach(q => {
        const ans = answers[q.id] || answers[q._id];
        if (!ans || !ans.selected_option) {
            breakdown.unattempted++;
            return;
        }

        const subject = (q.subject || 'physics').toLowerCase();
        if (subjectScores[subject] === undefined) subjectScores[subject] = 0;

        if (ans.selected_option === q.correct_option) {
            subjectScores[subject] += 4;
            breakdown.correct++;
        } else {
            subjectScores[subject] -= 1;
            breakdown.incorrect++;
        }
    });

    total = Object.values(subjectScores).reduce((a, b) => a + b, 0);

    return { total, subjectScores, breakdown };
}

export function evaluateCMI(answers, questions, partACutoff = 24) {
    let total = 0;
    const subjectScores = { partA: 0, partB: 0 };
    const breakdown = { correct: 0, incorrect: 0, unattempted: 0 };
    
    questions.forEach(q => {
        const ans = answers[q.id] || answers[q._id];
        if (!ans || !ans.selected_option) {
            breakdown.unattempted++;
            return;
        }

        // Assume part A is multiple choice, part B is subjective
        if (q.part === 'A' || q.type === 'objective') {
            // Assume marking scheme +x / -y or fallback
            const correctMarks = q.correct_marks || 4;
            const negativeMarks = q.negative_marks || 1;
            if (ans.selected_option === q.correct_option) {
                subjectScores.partA += correctMarks;
                breakdown.correct++;
            } else {
                subjectScores.partA -= negativeMarks;
                breakdown.incorrect++;
            }
        }
    });

    let partBStatus = 'pending';
    if (subjectScores.partA >= partACutoff) {
        partBStatus = 'needs_manual_review';
    } else {
        partBStatus = 'rejected';
    }

    total = subjectScores.partA + subjectScores.partB;

    return { total, subjectScores, breakdown, partBStatus };
}
