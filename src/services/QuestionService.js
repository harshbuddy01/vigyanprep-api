import { QuestionRepository } from '../repositories/QuestionRepository.js';
import { Question } from '../models/Question.js';

/**
 * QuestionService - Business Logic Layer
 * Handles all question-related operations with validation and error handling
 */
export class QuestionService {
    constructor() {
        this.repository = new QuestionRepository();
    }

    /**
     * Get all questions with optional filtering
     * @param {Object} filters - Filter options (section, difficulty, search, limit)
     * @returns {Object} Success response with questions array
     */
    async getAllQuestions(filters = {}) {
        try {
            console.log('🔍 [QuestionService] Fetching questions with filters:', filters);
            const startTime = Date.now();

            // Get questions from repository
            const questions = await this.repository.findAll(filters);

            const duration = Date.now() - startTime;
            console.log(`✅ [QuestionService] Fetched ${questions.length} questions in ${duration}ms`);

            return {
                success: true,
                questions: questions.map(q => q.toJSON()),
                count: questions.length,
                filters: filters,
                performance: {
                    duration: `${duration}ms`,
                    cached: false
                }
            };
        } catch (error) {
            console.error('❌ [QuestionService] Error fetching questions:', error);
            throw new Error(`Failed to fetch questions: ${error.message}`);
        }
    }

    /**
     * Get a single question by ID
     * @param {number} id - Question ID
     * @returns {Object} Success response with question data
     */
    async getQuestionById(id) {
        try {
            console.log(`🔍 [QuestionService] Fetching question ID: ${id}`);

            const question = await this.repository.findById(id);

            if (!question) {
                throw new Error(`Question with ID ${id} not found`);
            }

            console.log(`✅ [QuestionService] Found question ID: ${id}`);

            return {
                success: true,
                question: question.toJSON()
            };
        } catch (error) {
            console.error(`❌ [QuestionService] Error fetching question ${id}:`, error);
            throw error;
        }
    }

    /**
     * Create a new question
     * @param {Object} questionData - Question data
     * @returns {Object} Success response with created question
     */
    async createQuestion(questionData) {
        try {
            console.log('➕ [QuestionService] Creating new question:', questionData);

            // Validate required fields
            if (!questionData.testId) {
                throw new Error('testId is required');
            }

            if (!questionData.questionText && !questionData.text) {
                throw new Error('Question text is required');
            }

            if (!questionData.section) {
                throw new Error('Section/subject is required');
            }

            // Assign question number: use provided one or get next from repository
            let questionNumber = questionData.questionNumber;
            if (questionNumber === undefined || questionNumber === null || questionNumber === 0) {
                questionNumber = await this.repository.getNextQuestionNumber(questionData.testId);
                console.log(`📋 [QuestionService] Assigning next available question number: ${questionNumber}`);
            } else {
                console.log(`📋 [QuestionService] Using provided question number: ${questionNumber}`);
            }

            // Create Question object
            const question = new Question({
                ...questionData,
                questionNumber,
                text: questionData.questionText || questionData.text
            });

            // Validate question data
            const validation = question.validate();
            if (!validation.isValid) {
                console.error('❌ [QuestionService] Validation failed:', validation.errors);
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            console.log('✅ [QuestionService] Validation passed');

            // Save to database
            const savedQuestion = await this.repository.create(question);

            console.log(`✅ [QuestionService] Question created with ID: ${savedQuestion.id}`);

            return {
                success: true,
                message: 'Question created successfully',
                question: savedQuestion.toJSON()
            };
        } catch (error) {
            console.error('❌ [QuestionService] Error creating question:', error);
            throw error;
        }
    }

    /**
     * Update an existing question
     * @param {number} id - Question ID
     * @param {Object} questionData - Updated question data
     * @returns {Object} Success response with updated question
     */
    async updateQuestion(id, questionData) {
        try {
            console.log(`✏️ [QuestionService] Updating question ${id}:`, questionData);

            // Check if question exists
            const existing = await this.repository.findById(id);
            if (!existing) {
                throw new Error(`Question with ID ${id} not found`);
            }

            console.log(`📋 [QuestionService] Found existing question: ${existing.text.substring(0, 50)}...`);

            // Update fields
            if (questionData.questionText || questionData.text) {
                existing.text = questionData.questionText || questionData.text;
            }
            if (questionData.options) {
                existing.options = questionData.options;
            }
            if (questionData.correctAnswer) {
                existing.correctAnswer = questionData.correctAnswer;
            }
            if (questionData.section) {
                existing.section = questionData.section;
            }
            if (questionData.marks) {
                existing.marks = questionData.marks;
            }
            if (questionData.difficulty) {
                existing.difficulty = questionData.difficulty;
            }
            if (questionData.topic) {
                existing.topic = questionData.topic;
            }

            // Validate updated question
            const validation = existing.validate();
            if (!validation.isValid) {
                console.error('❌ [QuestionService] Validation failed:', validation.errors);
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            console.log('✅ [QuestionService] Validation passed');

            // Save to database
            await this.repository.update(id, existing);

            console.log(`✅ [QuestionService] Question ${id} updated successfully`);

            return {
                success: true,
                message: 'Question updated successfully',
                question: existing.toJSON()
            };
        } catch (error) {
            console.error(`❌ [QuestionService] Error updating question ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a question
     * @param {number} id - Question ID
     * @returns {Object} Success response
     */
    async deleteQuestion(id) {
        try {
            console.log(`🗑️ [QuestionService] Deleting question ${id}`);

            // Check if question exists
            const existing = await this.repository.findById(id);
            if (!existing) {
                throw new Error(`Question with ID ${id} not found`);
            }

            console.log(`📋 [QuestionService] Found question to delete: ${existing.text.substring(0, 50)}...`);

            // Delete from database
            await this.repository.delete(id);

            console.log(`✅ [QuestionService] Question ${id} deleted successfully`);

            return {
                success: true,
                message: 'Question deleted successfully',
                deletedId: id
            };
        } catch (error) {
            console.error(`❌ [QuestionService] Error deleting question ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get questions by test ID
     * @param {string} testId - Test ID
     * @returns {Object} Success response with questions array
     */
    async getQuestionsByTestId(testId) {
        try {
            console.log(`🔍 [QuestionService] Fetching questions for test: ${testId}`);

            const questions = await this.repository.findByTestId(testId);

            console.log(`✅ [QuestionService] Found ${questions.length} questions for test ${testId}`);

            return {
                success: true,
                testId,
                questions: questions.map(q => q.toJSON()),
                count: questions.length
            };
        } catch (error) {
            console.error(`❌ [QuestionService] Error fetching questions for test ${testId}:`, error);
            throw new Error(`Failed to fetch questions for test: ${error.message}`);
        }
    }

    /**
     * Bulk import questions
     * @param {Array} questionsData - Array of question data objects
     * @returns {Object} Success response with import statistics
     */
    async bulkImportQuestions(questionsData) {
        try {
            console.log(`📦 [QuestionService] Starting bulk import of ${questionsData.length} questions`);

            const results = {
                success: 0,
                failed: 0,
                errors: []
            };

            for (let i = 0; i < questionsData.length; i++) {
                try {
                    await this.createQuestion(questionsData[i]);
                    results.success++;
                    console.log(`✅ [QuestionService] Imported question ${i + 1}/${questionsData.length}`);
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        index: i,
                        question: questionsData[i],
                        error: error.message
                    });
                    console.error(`❌ [QuestionService] Failed to import question ${i + 1}:`, error.message);
                }
            }

            console.log(`✅ [QuestionService] Bulk import completed: ${results.success} success, ${results.failed} failed`);

            return {
                success: true,
                message: 'Bulk import completed',
                statistics: {
                    total: questionsData.length,
                    successful: results.success,
                    failed: results.failed
                },
                errors: results.errors
            };
        } catch (error) {
            console.error('❌ [QuestionService] Error in bulk import:', error);
            throw new Error(`Bulk import failed: ${error.message}`);
        }
    }

    /**
     * Get question statistics
     * @returns {Object} Statistics about questions
     */
    async getStatistics() {
        try {
            console.log('📊 [QuestionService] Calculating statistics');

            const stats = await this.repository.getStatistics();

            console.log('✅ [QuestionService] Statistics calculated:', stats);

            return {
                success: true,
                statistics: stats
            };
        } catch (error) {
            console.error('❌ [QuestionService] Error calculating statistics:', error);
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }
}
