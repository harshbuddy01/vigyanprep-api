import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
}

async function checkData() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Check collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📦 Available Collections:');
        collections.forEach(c => console.log(`   - ${c.name}`));
        console.log('');

        // Check if TestSeries collection exists
        const hasTestSeries = collections.some(c => c.name === 'testseries');
        console.log('🔍 TestSeries collection exists:', hasTestSeries ? '✅ YES' : '❌ NO');
        console.log('');

        // If TestSeries exists, show what's in it
        if (hasTestSeries) {
            const TestSeries = mongoose.model('TestSeries', new mongoose.Schema({
                testId: String,
                name: String,
                price: Number,
                isActive: Boolean
            }));
            const testSeriesData = await TestSeries.find();
            
            console.log('💰 Current TestSeries Records:');
            console.log('═══════════════════════════════════════════════');
            if (testSeriesData.length === 0) {
                console.log('   (empty - no records found)');
            } else {
                testSeriesData.forEach(ts => {
                    console.log(`   ✅ ${ts.testId.padEnd(10)} | ${ts.name.padEnd(30)} | ₹${ts.price} | Active: ${ts.isActive}`);
                });
            }
            console.log('═══════════════════════════════════════════════\n');
        }

        // Check existing test IDs from purchases
        const hasPurchasedTests = collections.some(c => c.name === 'purchasedtests');
        
        if (hasPurchasedTests) {
            const PurchasedTest = mongoose.model('PurchasedTest', new mongoose.Schema({
                test_id: String,
                email: String,
                purchased_at: Date
            }));

            const existingTests = await PurchasedTest.distinct('test_id');
            const totalPurchases = await PurchasedTest.countDocuments();
            
            console.log('📋 Test IDs from Student Purchases:');
            console.log('═══════════════════════════════════════════════');
            if (existingTests.length === 0) {
                console.log('   (no purchases yet)');
            } else {
                for (const testId of existingTests) {
                    const count = await PurchasedTest.countDocuments({ test_id: testId });
                    console.log(`   📝 ${testId.toUpperCase().padEnd(10)} - ${count} student(s) purchased`);
                }
            }
            console.log(`\n   Total Purchases: ${totalPurchases}`);
            console.log('═══════════════════════════════════════════════\n');
        }

        // Check student payments
        const hasStudentPayments = collections.some(c => c.name === 'studentpayments');
        
        if (hasStudentPayments) {
            const StudentPayment = mongoose.model('StudentPayment', new mongoose.Schema({
                email: String,
                roll_number: String,
                created_at: Date
            }));

            const totalStudents = await StudentPayment.countDocuments();
            console.log('👥 Student Payment Records:');
            console.log('═══════════════════════════════════════════════');
            console.log(`   Total Students: ${totalStudents}`);
            
            if (totalStudents > 0 && totalStudents <= 5) {
                const recentStudents = await StudentPayment.find().limit(5).sort({ created_at: -1 });
                console.log('\n   Recent Students:');
                recentStudents.forEach(s => {
                    console.log(`   - ${s.email} | Roll: ${s.roll_number}`);
                });
            }
            console.log('═══════════════════════════════════════════════\n');
        }

        // Summary and recommendations
        console.log('📊 SUMMARY & RECOMMENDATIONS:');
        console.log('═══════════════════════════════════════════════');
        
        if (!hasTestSeries) {
            console.log('⚠️  TestSeries collection is MISSING!');
            console.log('✅ SOLUTION: Run the seed script');
            console.log('   Command: node backend/scripts/seed_test_series.js\n');
            console.log('✅ This is SAFE - it won\'t affect existing student data\n');
        } else {
            const TestSeries = mongoose.model('TestSeries');
            const count = await TestSeries.countDocuments();
            if (count === 0) {
                console.log('⚠️  TestSeries collection exists but is EMPTY!');
                console.log('✅ SOLUTION: Run the seed script');
                console.log('   Command: node backend/scripts/seed_test_series.js\n');
            } else {
                console.log('✅ TestSeries collection has data!');
                console.log(`   Found ${count} test series record(s)\n`);
            }
        }
        console.log('═══════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error checking data:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);
    }
}

checkData();
