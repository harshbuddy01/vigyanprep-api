import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
}

// Define TestSeries Schema (Copy from backend/models/TestSeries.js)
const testSeriesSchema = new mongoose.Schema({
    testId: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: {
        type: Number,
        required: true,
        min: [1, 'Price must be at least ₹1'],
        max: [99999, 'Price cannot exceed ₹99,999'],
        validate: { validator: Number.isInteger, message: 'Price must be a whole number' }
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const TestSeries = mongoose.model('TestSeries', testSeriesSchema);

// ✅ ALL THREE TEST SERIES WITH CORRECT IDs MATCHING FRONTEND
const testSeriesData = [
    {
        testId: 'iat',  // ✅ Matches frontend request
        name: 'IAT SERIES',
        description: 'Speed Mastery - Comprehensive test series for IAT preparation',
        price: 199,  // ✅ Fixed from ₹1
        isActive: true
    },
    {
        testId: 'nest',  // ✅ Matches frontend request
        name: 'NEST SERIES',
        description: 'Deep Dive - Advanced test series for NEST examination',
        price: 199,  // ✅ Fixed from ₹1
        isActive: true
    },
    {
        testId: 'isi',  // ✅ Matches frontend request
        name: 'ISI SERIES',
        description: 'Proof Academy - Professional test series for ISI preparation',
        price: 199,  // ✅ Fixed from ₹1
        isActive: true
    }
];

async function seedData() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        for (const testData of testSeriesData) {
            console.log(`🔍 Processing test '${testData.testId}'...`);

            const existing = await TestSeries.findOne({ testId: testData.testId });

            if (existing) {
                console.log(`⚠️  Test '${testData.testId}' already exists`);
                console.log(`   Current: ${existing.name} - ₹${existing.price}`);
                console.log(`   Updating to: ${testData.name} - ₹${testData.price}\n`);

                existing.price = testData.price;
                existing.name = testData.name;
                existing.description = testData.description;
                existing.isActive = testData.isActive;
                existing.updatedAt = new Date();
                await existing.save();

                console.log(`✅ Test '${testData.testId}' updated successfully\n`);
            } else {
                console.log(`🌱 Creating new test '${testData.testId}'...`);
                await TestSeries.create(testData);
                console.log(`✅ Test '${testData.testId}' created successfully\n`);
            }
        }

        // Verify all tests exist
        console.log('📋 VERIFICATION - All Test Series in Database:');
        console.log('═══════════════════════════════════════════════\n');

        const allTests = await TestSeries.find({ isActive: true }).sort({ testId: 1 });
        allTests.forEach(test => {
            console.log(`✅ ${test.testId.toUpperCase().padEnd(10)} | ${test.name.padEnd(30)} | ₹${test.price}`);
        });

        console.log('\n═══════════════════════════════════════════════');
        console.log(`✅ Total Active Tests: ${allTests.length}`);
        console.log('\n🎉 Database seeding completed successfully!');
        console.log('🚀 You can now test the payment flow at testfirstpage.html\n');

    } catch (error) {
        console.error('❌ Error seeding data:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);
    }
}

seedData();
