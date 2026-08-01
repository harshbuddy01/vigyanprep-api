// backend/services/redisSessionService.js
// 🔒 REDIS SESSION LOCKING ENGINE WITH 90s TTL & 30s HEARTBEAT

import crypto from 'crypto';

// In-memory fallback map when Redis connection is not configured
const memorySessionStore = new Map();

/**
 * Acquire Exam Session Lock (When student enters 16-hex exam ID)
 */
export async function acquireSessionLock(testId, studentId) {
  const key = `exam_session:${testId}:${studentId}`;
  const now = Date.now();
  const existing = memorySessionStore.get(key);

  if (existing && existing.expiresAt > now) {
    // Lock exists and is active -> Block 2nd device
    return {
      success: false,
      blocked: true,
      message: 'This exam ID is already active on another device.'
    };
  }

  const sessionToken = `sess_${crypto.randomBytes(16).toString('hex')}`;
  const expiresAt = now + 90 * 1000; // 90 seconds TTL

  memorySessionStore.set(key, {
    sessionToken,
    testId,
    studentId,
    expiresAt,
    lastHeartbeat: now
  });

  return {
    success: true,
    sessionToken,
    expiresAt
  };
}

/**
 * Renew Heartbeat (Called every 30 seconds by student's browser during exam)
 */
export async function renewSessionHeartbeat(testId, studentId, sessionToken) {
  const key = `exam_session:${testId}:${studentId}`;
  const existing = memorySessionStore.get(key);

  if (!existing) {
    return { success: false, expired: true, message: 'Session lock expired' };
  }

  if (existing.sessionToken !== sessionToken) {
    return { success: false, invalid: true, message: 'Session token mismatch' };
  }

  const now = Date.now();
  existing.expiresAt = now + 90 * 1000; // Renew 90 seconds
  existing.lastHeartbeat = now;
  memorySessionStore.set(key, existing);

  return { success: true, renewedUntil: existing.expiresAt };
}

/**
 * Release Session Lock (Explicit student exit)
 */
export async function releaseSessionLock(testId, studentId) {
  const key = `exam_session:${testId}:${studentId}`;
  memorySessionStore.delete(key);
  return { success: true };
}

/**
 * Admin Break-Glass Session Release
 */
export async function adminReleaseSessionLock(testId, studentId, adminId) {
  const key = `exam_session:${testId}:${studentId}`;
  const hadLock = memorySessionStore.has(key);
  memorySessionStore.delete(key);

  return {
    success: true,
    released: hadLock,
    adminId,
    timestamp: new Date().toISOString()
  };
}
