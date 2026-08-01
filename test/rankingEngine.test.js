import { describe, it, expect } from 'vitest';

function calculateRanksMock(attempts, questionCount = 45) {
  // Exclude absent students & practice attempts from live merit list
  const liveAttempts = attempts.filter(a => a.status === 'submitted' && a.attempt_type === 'live' && !a.is_absent);
  
  // Sort descending
  liveAttempts.sort((a, b) => b.raw_score - a.raw_score);
  
  const denominator = liveAttempts.length;
  
  return liveAttempts.map((item, idx) => {
    const rank = idx + 1;
    const percentile = denominator > 1 ? Number(((denominator - rank) / (denominator - 1) * 100).toFixed(2)) : 100;
    return {
      student_id: item.student_id,
      raw_score: item.raw_score,
      rank,
      percentile,
      denominator
    };
  });
}

describe('Two-Tier Ranking & Absent Denominator Exclusion', () => {
  const attempts = [
    { student_id: 's1', raw_score: 160, status: 'submitted', attempt_type: 'live', is_absent: false },
    { student_id: 's2', raw_score: 140, status: 'submitted', attempt_type: 'live', is_absent: false },
    { student_id: 's3', raw_score: 0, status: 'not_started', attempt_type: 'live', is_absent: true }, // ABSENT
    { student_id: 's4', raw_score: 150, status: 'submitted', attempt_type: 'practice', is_absent: false }, // PRACTICE
    { student_id: 's5', raw_score: 100, status: 'submitted', attempt_type: 'live', is_absent: false }
  ];

  it('should exclude absent students and practice attempts from live merit list denominator', () => {
    const ranked = calculateRanksMock(attempts);
    
    // Total live submitted takers = 3 (s1, s2, s5). s3 (absent) & s4 (practice) are excluded.
    expect(ranked.length).toBe(3);
    expect(ranked[0].denominator).toBe(3);
    expect(ranked[0].student_id).toBe('s1');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].percentile).toBe(100);

    expect(ranked[1].student_id).toBe('s2');
    expect(ranked[1].rank).toBe(2);
    expect(ranked[1].percentile).toBe(50);

    expect(ranked[2].student_id).toBe('s5');
    expect(ranked[2].rank).toBe(3);
    expect(ranked[2].percentile).toBe(0);
  });
});
