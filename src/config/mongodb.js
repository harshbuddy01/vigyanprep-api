// MongoDB Configuration
// Replaces mysql.js with MongoDB/Mongoose setup

import mongoose from 'mongoose';

// 🔴 CRITICAL: Hostinger might store variable with different name
// Try all possible variations
function getMongoDUriFromAnySource() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 FINDING MONGODB_URI FROM HOSTINGER ENVIRONMENT');
    console.log('='.repeat(80));

    // List of possible variable names Hostinger might use
    const possibleNames = [
        'MONGODB_URI',
        'mongodb_uri',
        'MONGO_DB_URI',
        'MONGO_URI',
        'DB_URI',
        'DATABASE_URL',
    ];

    console.log('\n🔍 Checking specific variable names:');
    for (const varName of possibleNames) {
        const value = process.env[varName];
        if (value) {
            console.log(`  ✅ FOUND: ${varName}`);
            console.log(`     Value: ${value.substring(0, 50)}...`);
            return value;
        } else {
            console.log(`  ❌ Not found: ${varName}`);
        }
    }

    // If not found with specific names, search all process.env keys
    console.log('\n🔍 Searching all ${Object.keys(process.env).length} environment variables...');
    const allKeys = Object.keys(process.env).sort();

    for (const key of allKeys) {
        const keyLower = key.toLowerCase();
        if (keyLower.includes('mongo') || keyLower.includes('mongodb') || (keyLower.includes('db') && keyLower.includes('uri'))) {
            const value = process.env[key];
            const valueStr = String(value);

            console.log(`  🔔 Potential match: ${key}`);

            // If it looks like a connection string, use it
            if (valueStr.includes('mongodb')) {
                console.log(`  ✅ USING: ${key}`);
                console.log(`     Value: ${valueStr.substring(0, 50)}...`);
                return value;
            }
        }
    }

    console.log('\n❌ MONGODB_URI NOT FOUND in process.env!');
    console.log('\n😨 ALL ENVIRONMENT VARIABLES:');
    allKeys.forEach((key, idx) => {
        if (idx < 20) {
            const value = process.env[key];
            const displayValue = String(value).substring(0, 30);
            console.log(`   ${key}: ${displayValue}`);
        }
    });
    if (allKeys.length > 20) {
        console.log(`   ... and ${allKeys.length - 20} more variables`);
    }

    return null;
}

// Track connection status
export let isMongoDBConnected = false;
export let lastConnectionError = null;

// MongoDB Connection Options
const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000, // Increased for periodic connection spikes
    connectTimeoutMS: 10000,         // Faster failover if shards are unreachable
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority'
};

// Connect to MongoDB
export async function connectDB() {
    // 🔵 READ AT RUNTIME - not at module load time
    const MONGODB_URI = getMongoDUriFromAnySource();

    console.log('\n' + '='.repeat(80));
    console.log('🔗 MONGODB CONNECTION ATTEMPT');
    console.log('='.repeat(80));

    // If no URI is set, strictly fail in production or warn in dev
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in the environment. Database connection is required.');
    }

    try {
        console.log('\n✅ MongoDB URI found in Hostinger environment!');
        console.log(`   Connecting to: ${MONGODB_URI.substring(0, 50)}...`);
        console.log('\n🔗 Connecting to MongoDB Atlas...\n');

        await mongoose.connect(MONGODB_URI, options);

        console.log('\n' + '='.repeat(80));
        console.log('🟢 SUCCESS! MONGODB CONNECTED');
        console.log('='.repeat(80));
        console.log(`📊 Database: ${mongoose.connection.name}`);
        console.log(`🔗 Host: ${mongoose.connection.host}`);
        console.log(`🔄 Status: Connected and ready\n`);

        isMongoDBConnected = true;
        lastConnectionError = null;
        return true;

    } catch (error) {
        console.error('\n' + '='.repeat(80));
        console.error('❌ MONGODB CONNECTION FAILED');
        console.error('='.repeat(80));
        console.error(`Error Message: ${error.message}\n`);

        // 🔴 DETAILED ERROR LOGGING FOR DEBUGGING
        if (error.message.includes('getaddrinfo ENOTFOUND')) {
            console.error('🔴 Diagnosis: DNS/Network Error');
            console.error('   MongoDB Atlas cluster not reachable from Hostinger');
            console.error('\n😨 Possible Solutions:');
            console.error('   1. Go to MongoDB Atlas > Network Access > IP Whitelist');
            console.error('   2. Add Hostinger IP or 0.0.0.0/0 to whitelist');
            console.error('   3. Verify internet connectivity on Hostinger');
        } else if (error.message.includes('authentication failed')) {
            console.error('🔴 Diagnosis: Authentication Error');
            console.error('   Username or password in MONGODB_URI is incorrect');
            console.error('\n😨 Solution:');
            console.error('   1. Go to MongoDB Atlas > Database Access');
            console.error('   2. Verify username matches MONGODB_URI');
            console.error('   3. Reset password if forgotten');
            console.error('   4. Update MONGODB_URI in Hostinger environment');
        } else if (error.message.includes('timeout')) {
            console.error('🔴 Diagnosis: Connection Timeout');
            console.error('   MongoDB server not responding');
            console.error('\n😨 Solution: Wait a few minutes, MongoDB Atlas may be restarting');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.error('🔴 Diagnosis: Connection Refused');
            console.error('   Invalid connection string format');
            console.error('\n😨 Solution: Verify MONGODB_URI starts with: mongodb+srv://');
        }

        console.warn('\n🔗 App will run with LIMITED FUNCTIONALITY');
        console.warn('   (Some features requiring database will not work)\n');

        isMongoDBConnected = false;
        lastConnectionError = error.message;
        return false;
    }
}

// Handle connection events
mongoose.connection.on('connected', () => {
    console.log('🟢 MongoDB connection established');
    isMongoDBConnected = true;
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
    isMongoDBConnected = false;
});

mongoose.connection.on('disconnected', () => {
    console.log('🔴 MongoDB disconnected');
    isMongoDBConnected = false;
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('👋 MongoDB connection closed through app termination');
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Error closing MongoDB connection:', err);
        process.exit(1);
    }
});

export default mongoose;