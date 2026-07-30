import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function resetAdminPassword() {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        console.error('❌ Error: MONGODB_URI not found in your .env file!');
        console.error('Please create a .env file in the backend directory with your MongoDB connection string.');
        process.exit(1);
    }

    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected.');

        // Reference Admin schema implicitly for a quick update
        const db = mongoose.connection.db;
        const collection = db.collection('admins');

        // New hash for exactly 'admin123'
        const rawPassword = 'admin123';
        const newHash = await bcrypt.hash(rawPassword, 10);

        console.log(`🔐 Updating password for user 'admin' to '${rawPassword}'...`);

        const result = await collection.updateOne(
            { username: 'admin' },
            {
                $set: {
                    username: 'admin',
                    passwordHash: newHash,
                    lastLoginAt: new Date()
                }
            },
            { upsert: true }
        );

        if (result.upsertedCount > 0) {
            console.log('✅ Created new admin account.');
        } else if (result.modifiedCount > 0) {
            console.log('✅ Successfully updated existing admin password.');
        } else {
            console.log('✅ Admin account already exists with this data.');
        }

        console.log('🟢 HARD RESET COMPLETE: You can now log in with user: admin, in with: admin123');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database connection or update failed:', error);
        process.exit(1);
    }
}

resetAdminPassword();
