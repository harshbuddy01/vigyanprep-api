/**
 * Question Repository - MongoDB Version
 * Migrated from MySQL to MongoDB/Mongoose
 * 
 * CHANGES:
 * - Replaced SQL queries with Mongoose queries
 * - All method signatures remain the same (backward compatible)
 * - Domain Model (Question.js) unchanged - still works!
 */

import QuestionModel from '../schemas/QuestionSchema.js';
import { Question } from '../models/Question.js';

export class QuestionRepository {
    constructor() {
        this.model = QuestionModel;
    }
    
    /**
     * Find all questions with optional filters
     */
    async findAll(filters = {}) {
        try {
            const query = {};
            
            // Filter by section (subject)
            if (filters.section || filters.subject) {
                query.section = filters.section || filters.subject;
            }
            
            // Filter by difficulty
            if (filters.difficulty) {
                query.difficulty = filters.difficulty;
            }
            
            // Filter by test ID
            if (filters.testId || filters.test_id) {
                query.testId = filters.testId || filters.test_id;
            }
            
            // Search in question text
            if (filters.search) {
                query.$or = [
                    { questionText: { $regex: filters.search, $options: 'i' } },
                    { testId: { $regex: filters.search, $options: 'i' } }
                ];
            }
            
            // Ordering
            const orderBy = filters.orderBy || '_id';
            const order = filters.order === 'ASC' ? 1 : -1;
            const sort = { [orderBy]: order };
            
            // Pagination
            const limit = parseInt(filters.limit) || 100;
            const offset = parseInt(filters.offset) || 0;
            
            const docs = await this.model
                .find(query)
                .sort(sort)
                .skip(offset)
                .limit(limit)
                .lean();
            
            // Convert MongoDB docs to Domain Models
            return docs.map(doc => this._toQuestion(doc));
            
        } catch (error) {
            console.error('❌ QuestionRepository.findAll error:', error);
            throw new Error(`Failed to fetch questions: ${error.message}`);
        }
    }
    
    /**
     * Find question by ID
     */
    async findById(id) {
        try {
            const doc = await this.model.findById(id).lean();
            
            if (!doc) {
                return null;
            }
            
            return this._toQuestion(doc);
            
        } catch (error) {
            console.error(`❌ QuestionRepository.findById(${id}) error:`, error);
            throw new Error(`Failed to fetch question: ${error.message}`);
        }
    }
    
    /**
     * Find questions by test ID
     */
    async findByTestId(testId) {
        try {
            const docs = await this.model
                .find({ testId })
                .sort({ questionNumber: 1 })
                .lean();
            
            return docs.map(doc => this._toQuestion(doc));
            
        } catch (error) {
            console.error(`❌ QuestionRepository.findByTestId(${testId}) error:`, error);
            throw new Error(`Failed to fetch questions for test: ${error.message}`);
        }
    }
    
    /**
     * Count questions (useful for pagination)
     */
    async count(filters = {}) {
        try {
            const query = {};
            
            if (filters.section || filters.subject) {
                query.section = filters.section || filters.subject;
            }
            
            if (filters.difficulty) {
                query.difficulty = filters.difficulty;
            }
            
            if (filters.testId) {
                query.testId = filters.testId;
            }
            
            return await this.model.countDocuments(query);
            
        } catch (error) {
            console.error('❌ QuestionRepository.count error:', error);
            throw new Error(`Failed to count questions: ${error.message}`);
        }
    }
    
    /**
     * Create new question
     */
    async create(question) {
        try {
            // Convert Domain Model to MongoDB document
            const docData = {
                testId: question.testId,
                questionNumber: question.questionNumber,
                questionText: question.text,
                options: question.options,
                correctAnswer: question.correctAnswer,
                section: question.section,
                topic: question.topic,
                difficulty: question.difficulty,
                marksPositive: question.marks,
                marksNegative: question.negativeMarks,
                type: question.type
            };
            
            const doc = await this.model.create(docData);
            
            // Update Question domain model with new ID
            question.id = doc._id.toString();
            
            console.log(`✅ Question created with ID: ${question.id}`);
            return question;
            
        } catch (error) {
            console.error('❌ QuestionRepository.create error:', error);
            throw new Error(`Failed to create question: ${error.message}`);
        }
    }
    
    /**
     * Update existing question
     */
    async update(id, question) {
        try {
            const updateData = {
                questionText: question.text,
                options: question.options,
                correctAnswer: question.correctAnswer,
                section: question.section,
                topic: question.topic,
                difficulty: question.difficulty,
                marksPositive: question.marks,
                marksNegative: question.negativeMarks,
                type: question.type
            };
            
            await this.model.findByIdAndUpdate(id, updateData, { new: true });
            console.log(`✅ Question ${id} updated`);
            
            return question;
            
        } catch (error) {
            console.error(`❌ QuestionRepository.update(${id}) error:`, error);
            throw new Error(`Failed to update question: ${error.message}`);
        }
    }
    
    /**
     * Delete question
     */
    async delete(id) {
        try {
            await this.model.findByIdAndDelete(id);
            console.log(`✅ Question ${id} deleted`);
            return true;
            
        } catch (error) {
            console.error(`❌ QuestionRepository.delete(${id}) error:`, error);
            throw new Error(`Failed to delete question: ${error.message}`);
        }
    }
    
    /**
     * Get next question number for a test
     */
    async getNextQuestionNumber(testId) {
        try {
            const result = await this.model
                .findOne({ testId })
                .sort({ questionNumber: -1 })
                .select('questionNumber')
                .lean();
            
            return (result?.questionNumber || 0) + 1;
            
        } catch (error) {
            console.error(`❌ QuestionRepository.getNextQuestionNumber(${testId}) error:`, error);
            throw new Error(`Failed to get next question number: ${error.message}`);
        }
    }
    
    /**
     * Get statistics about questions
     */
    async getStatistics() {
        try {
            // Total questions
            const total = await this.model.countDocuments();
            
            // By section
            const bySectionResult = await this.model.aggregate([
                { $group: { _id: '$section', count: { $sum: 1 } } }
            ]);
            
            const bySection = {};
            bySectionResult.forEach(item => {
                bySection[item._id || 'Unknown'] = item.count;
            });
            
            // By difficulty
            const byDifficultyResult = await this.model.aggregate([
                { $group: { _id: '$difficulty', count: { $sum: 1 } } }
            ]);
            
            const byDifficulty = {};
            byDifficultyResult.forEach(item => {
                byDifficulty[item._id || 'Unknown'] = item.count;
            });
            
            // Top tests
            const topTestsResult = await this.model.aggregate([
                { $group: { _id: '$testId', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);
            
            const topTests = topTestsResult.map(item => ({
                testId: item._id,
                questionCount: item.count
            }));
            
            return {
                total,
                bySection,
                byDifficulty,
                topTests
            };
            
        } catch (error) {
            console.error('❌ QuestionRepository.getStatistics error:', error);
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }
    
    /**
     * Bulk insert questions (useful for importing)
     */
    async bulkCreate(questions) {
        try {
            const docsData = questions.map(q => ({
                testId: q.testId,
                questionNumber: q.questionNumber,
                questionText: q.text,
                options: q.options,
                correctAnswer: q.correctAnswer,
                section: q.section,
                topic: q.topic,
                difficulty: q.difficulty,
                marksPositive: q.marks,
                marksNegative: q.negativeMarks,
                type: q.type
            }));
            
            const docs = await this.model.insertMany(docsData);
            
            // Update Question domain models with new IDs
            docs.forEach((doc, index) => {
                questions[index].id = doc._id.toString();
            });
            
            console.log(`✅ Bulk created ${questions.length} questions`);
            return questions;
            
        } catch (error) {
            console.error('❌ QuestionRepository.bulkCreate error:', error);
            throw new Error(`Failed to bulk create questions: ${error.message}`);
        }
    }
    
    /**
     * Helper: Convert MongoDB document to Question domain model
     */
    _toQuestion(doc) {
        return new Question({
            id: doc._id.toString(),
            test_id: doc.testId,
            question_number: doc.questionNumber,
            question_text: doc.questionText,
            options: doc.options,
            correct_answer: doc.correctAnswer,
            section: doc.section,
            topic: doc.topic,
            difficulty: doc.difficulty,
            marks_positive: doc.marksPositive,
            marks_negative: doc.marksNegative,
            type: doc.type,
            created_at: doc.createdAt,
            updated_at: doc.updatedAt
        });
    }
    
    /**
     * Column exists check - Not needed for MongoDB (graceful compatibility)
     */
    async columnExists(columnName) {
        // MongoDB is schemaless - all fields "exist" conceptually
        return true;
    }
}

export default QuestionRepository;