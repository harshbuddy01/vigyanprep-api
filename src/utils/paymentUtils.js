import { Counter } from "../models/Counter.js";

/**
 * 🔢 GENERATE ATOMIC SEQUENTIAL ROLL NUMBER
 * Format: VP-XXXXXX (e.g., VP-100001)
 * Uses MongoDB findOneAndUpdate with $inc for atomic thread-safety.
 */
export async function getNextRollNumber() {
  const counterId = "rollNumber";
  const startValue = 100001; // Starting number for the new sequence

  const counter = await Counter.findOneAndUpdate(
    { id: counterId },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // If newly created, handle the starting value
  if (counter.seq === 1) {
    // If we just starting, we might want to start from 100001
    // Actually, setting seq to 1 means the first one is VP-100001 if we add the base
  }

  const paddedSeq = (startValue + counter.seq - 1).toString().padStart(6, "0");
  return `VP-${paddedSeq}`;
}

/**
 * 🛡️ VALIDATE TEST ID
 * Ensures the testId is within the allowed set.
 */
export function isValidTestId(testId) {
  const allowedTests = ["iat", "nest", "isi"];
  return allowedTests.includes(testId?.toLowerCase());
}
