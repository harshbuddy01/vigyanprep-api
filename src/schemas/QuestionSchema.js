import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema(
    {
        testId: {
            type: String,
            required: [true, "Test ID is required"],
            index: true,
        },
        status: {
            type: String,
            enum: ["draft", "approved", "archived"],
            default: "draft",
            index: true,
        },
        approvedAt: { type: Date, default: null },
        archivedAt: { type: Date, default: null },

        // Auto numbering (backend should set this)
        questionNumber: { type: Number, default: 0 },

        // You need Physics/Chem/Math filters
        section: {
            type: String,
            required: true,
            enum: ["Physics", "Chemistry", "Mathematics", "Biology", "General"],
            index: true,
        },

        // ✅ IMPORTANT: No default MCQ
        // Backend must set this based on paper/test config while creating draft.
        questionType: {
            type: String,
            enum: ["MCQ", "MSQ", "Numerical", "TrueFalse", "Descriptive"],
            required: true,
            index: true,
        },

        questionText: {
            type: String,
            required: function () {
                return this.status === "approved" || this.status === "draft"; // Basic text needed even for draft
            },
            default: "",
            // minlength: [5, "Question text must be at least 5 characters"], // Relaxed for drafts
        },

        // Image URL (store file separately, store link here)
        imageUrl: { type: String, default: "" },

        // MCQ/TrueFalse options (required only when approved + type requires it)
        options: {
            type: [mongoose.Schema.Types.Mixed],
            default: [],
            validate: {
                validator: function (v) {
                    if (this.status !== "approved") return true;

                    if (this.questionType === "MCQ" || this.questionType === "MSQ") {
                        return Array.isArray(v) && v.length === 4;
                    }

                    if (this.questionType === "TrueFalse") {
                        // Can auto-fill ["True","False"] from backend, but validate anyway:
                        return Array.isArray(v) && v.length === 2;
                    }

                    // Numerical/Descriptive do not require options
                    return true;
                },
                message: "Options are invalid for the selected question type (Expected 4 for MCQ/MSQ, 2 for T/F)",
            },
        },

        // For MCQ/TrueFalse: store correct option index (0..3 or 0..1)
        correctOptionIndex: {
            type: Number,
            default: null,
            validate: {
                validator: function (v) {
                    if (this.status !== "approved") return true;

                    if (this.questionType === "MCQ") return v !== null && v >= 0 && v <= 3;
                    if (this.questionType === "TrueFalse") return v !== null && v >= 0 && v <= 1;

                    // MSQ/Numerical/Descriptive do not use single option index
                    return true;
                },
                message: "Correct option index invalid for the selected question type",
            },
        },

        // Answer field (String for MCQ/TF, Array for MSQ)
        correctAnswer: {
            type: mongoose.Schema.Types.Mixed,
            required: function () {
                return this.status === 'approved' && (this.questionType === 'MCQ' || this.questionType === 'TrueFalse' || this.questionType === 'MSQ');
            }
        },

        // For Numerical: correct numeric answer (+ optional tolerance)
        correctNumericAnswer: {
            type: Number,
            default: null,
            validate: {
                validator: function (v) {
                    if (this.status !== "approved") return true;
                    if (this.questionType === "Numerical") return typeof v === "number";
                    return v === null;
                },
                message: "Correct numeric answer required for Numerical questions",
            },
        },
        numericTolerance: {
            type: Number,
            default: 0, // allow exact match by default
            min: 0,
        },

        // For Descriptive: model answer / key (manual checking or rubric-based later)
        modelAnswer: {
            type: String,
            default: "",
            validate: {
                validator: function (v) {
                    if (this.status !== "approved") return true;
                    if (this.questionType === "Descriptive") return typeof v === "string" && v.length >= 0;
                    return true;
                },
                message: "Model answer invalid",
            },
        },

        // Marks can remain here or be overridden by paper-level scheme
        marksPositive: { type: Number, default: 4, min: 0 },
        marksNegative: { type: Number, default: -1, max: 0 },
    },
    { timestamps: true, collection: "questions" }
);

// Timestamp updates when status changes
QuestionSchema.pre("save", function (next) {
    if (this.isModified("status") && this.status === "approved" && !this.approvedAt) {
        this.approvedAt = new Date();
    }
    if (this.isModified("status") && this.status === "archived" && !this.archivedAt) {
        this.archivedAt = new Date();
    }
    next();
});

QuestionSchema.index({ testId: 1, status: 1, section: 1 });
QuestionSchema.index(
    { testId: 1, section: 1, questionNumber: 1 },
    { unique: true, partialFilterExpression: { questionNumber: { $gt: 0 } } }
);

// Performance optimization for auto-numbering sort
QuestionSchema.index({ testId: 1, section: 1, questionNumber: -1 });

QuestionSchema.virtual("id").get(function () {
    return this._id.toString();
});
QuestionSchema.set("toJSON", { virtuals: true });
QuestionSchema.set("toObject", { virtuals: true });

export default mongoose.model("Question", QuestionSchema);