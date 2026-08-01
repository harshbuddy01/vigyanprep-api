import { describe, it, expect } from 'vitest';
import { generateUniqueExamId } from '../src/controllers/hallTicketController.js';

describe('Hall Ticket & Exam ID Generator', () => {
  it('should generate a 16-hex unique exam ID (64 bits entropy)', () => {
    const examId = generateUniqueExamId('IAT');
    expect(examId).toMatch(/^EXAM-IAT-[0-9A-F]{16}$/);
  });

  it('should generate distinct IDs on subsequent calls', () => {
    const id1 = generateUniqueExamId('NEST');
    const id2 = generateUniqueExamId('NEST');
    expect(id1).not.toBe(id2);
  });
});
