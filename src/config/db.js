import mongoose from "mongoose";
import { config } from "dotenv";

// Load environment variables (so it can find MONGO_URI)
config(); 

const connectDB = async () => {
  try {
    // Priority: Render URI > Local URI
    const dbURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/razorpay";
    
    const { connection } = await mongoose.connect(dbURI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Connected: ${connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    // Exit process with failure so Render knows to restart
    process.exit(1);
  }
};

export default connectDB;