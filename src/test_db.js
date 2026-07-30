import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const testIdString = "69b"; // We'll search for it

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const tests = await mongoose.connection.db.collection('scheduledtests').find({}).toArray();
    console.log("Found tests:", tests.map(t => t._id.toString()));
    mongoose.disconnect();
}
run();
