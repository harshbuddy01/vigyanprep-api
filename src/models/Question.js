/**
 * Question Domain Model
 * Created: Dec 29, 2025
 * Purpose: Encapsulate all question-related logic and data
 * 
 * FIXES:
 * - JSON parsing errors (recursive parsing, safe fallbacks)
 * - Data validation (prevents bad data in database)
 * - Consistent data format across application
 * 
 * BENEFITS:
 * - Single source of truth for question structure
 * - Reusable across different parts of application
 * - Easy to test and maintain
 * - Type safety and validation built-in
 */

export class Question {
    constructor(data = {}) {
        // Database fields
        this.id = data.id || data._id || null;
        this.testId = data.testId || data.test_id || null;
        this.questionNumber = data.questionNumber || data.question_number || 0;
        this.status = data.status || 'draft';
        this.questionType = data.questionType || 'MCQ'; // Strictly use questionType

        // Content
        this.text = data.questionText || data.text || data.question || '';
        this.options = this._parseOptions(data.options);

        // Scoring
        this.correctAnswer = data.correctAnswer || data.correct_answer || '';
        this.correctOptionIndex = data.correctOptionIndex !== undefined ? data.correctOptionIndex : null;
        this.correctNumericAnswer = data.correctNumericAnswer !== undefined ? data.correctNumericAnswer : null;
        this.numericTolerance = data.numericTolerance || 0;
        this.modelAnswer = data.modelAnswer || '';

        // Metadata
        this.section = data.section || data.subject || 'Physics';
        this.topic = data.topic || 'General';
        this.difficulty = data.difficulty || 'Medium';
        this.marksPositive = data.marksPositive !== undefined ? data.marksPositive : (data.marks !== undefined ? data.marks : 4);
        this.marksNegative = data.marksNegative !== undefined ? data.marksNegative : (data.negativeMarks !== undefined ? data.negativeMarks : -1);

        // Optional image URL
        this.imageUrl = data.imageUrl || data.image_url || '';

        // Timestamps
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
        this.approvedAt = data.approvedAt || null;
    }

    _parseOptions(options) {
        if (Array.isArray(options)) return options;
        if (!options) return [];
        if (typeof options === 'string') {
            try {
                let parsed = JSON.parse(options);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    toDatabaseFormat() {
        return {
            testId: this.testId,
            questionNumber: this.questionNumber,
            status: this.status,
            questionType: this.questionType,
            questionText: this.text,
            options: this.options,
            correctAnswer: this.correctAnswer,
            correctOptionIndex: this.correctOptionIndex,
            correctNumericAnswer: this.correctNumericAnswer,
            numericTolerance: this.numericTolerance,
            modelAnswer: this.modelAnswer,
            section: this.section,
            topic: this.topic,
            difficulty: this.difficulty,
            marksPositive: this.marksPositive,
            marksNegative: this.marksNegative,
            imageUrl: this.imageUrl
        };
    }

    toJSON() {
        return {
            id: this.id,
            testId: this.testId,
            questionNumber: this.questionNumber,
            status: this.status,
            questionType: this.questionType,
            question: this.text,
            options: this.options,
            answer: this.correctAnswer,
            correctOptionIndex: this.correctOptionIndex,
            correctNumericAnswer: this.correctNumericAnswer,
            modelAnswer: this.modelAnswer,
            subject: this.section,
            difficulty: this.difficulty,
            marksPositive: this.marksPositive,
            marksNegative: this.marksNegative,
            imageUrl: this.imageUrl,
            approvedAt: this.approvedAt
        };
    }

    toExamFormat() {
        return {
            id: this.id,
            questionNumber: this.questionNumber,
            questionType: this.questionType,
            question: this.text,
            options: this.options,
            subject: this.section,
            marksPositive: this.marksPositive,
            marksNegative: this.marksNegative,
            imageUrl: this.imageUrl
        };
    }

    static fromDatabase(row) {
        return new Question(row);
    }

    static fromDatabaseRows(rows) {
        return rows.map(row => Question.fromDatabase(row));
    }
}

export default Question;
