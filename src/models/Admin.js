import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        default: 'admin'
    },
    passwordHash: {
        type: String,
        required: true
    },
    lastLoginAt: {
        type: Date
    }
}, { timestamps: true });

export const Admin = mongoose.model('Admin', adminSchema);
