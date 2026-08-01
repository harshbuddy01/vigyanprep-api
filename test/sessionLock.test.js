import { describe, it, expect, beforeEach } from 'vitest';
import {
  acquireSessionLock,
  renewSessionHeartbeat,
  releaseSessionLock,
  adminReleaseSessionLock
} from '../src/services/redisSessionService.js';

describe('Redis Session Lock Engine', () => {
  const testId = 'test_iat_2026_01';
  const studentId = 'student_user_101';

  beforeEach(async () => {
    await releaseSessionLock(testId, studentId);
  });

  it('should acquire a session lock for first device', async () => {
    const res = await acquireSessionLock(testId, studentId);
    expect(res.success).toBe(true);
    expect(res.sessionToken).toBeDefined();
    expect(res.expiresAt).toBeGreaterThan(Date.now());
  });

  it('should block second device attempt while lock is active (Case 1)', async () => {
    await acquireSessionLock(testId, studentId);
    const res2 = await acquireSessionLock(testId, studentId);
    expect(res2.success).toBe(false);
    expect(res2.blocked).toBe(true);
    expect(res2.message).toContain('already active');
  });

  it('should renew heartbeat with valid token', async () => {
    const acquired = await acquireSessionLock(testId, studentId);
    expect(acquired.success).toBe(true);
    const renewed = await renewSessionHeartbeat(testId, studentId, acquired.sessionToken);
    expect(renewed.success).toBe(true);
  });

  it('should allow immediate re-entry after explicit exit (Case 2)', async () => {
    await acquireSessionLock(testId, studentId);
    await releaseSessionLock(testId, studentId);
    const reentered = await acquireSessionLock(testId, studentId);
    expect(reentered.success).toBe(true);
  });

  it('should allow admin break-glass release (Case 4)', async () => {
    await acquireSessionLock(testId, studentId);
    const released = await adminReleaseSessionLock(testId, studentId, 'admin_super_1');
    expect(released.success).toBe(true);
    expect(released.released).toBe(true);
  });
});
