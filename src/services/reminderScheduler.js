// ⏰ Pre-Test Reminder Scheduler — Sends emails 2 hours before tests
import cron from 'node-cron';
import { supabase } from '../db/supabase.js';
import { sendEmail } from './emailService.js';
import { reminderEmail } from './emailTemplates.js';

/**
 * Start the reminder scheduler
 * Runs every 15 minutes to check for tests starting within 2 hours
 */
export function startReminderScheduler() {
  console.log('⏰ Starting pre-test reminder scheduler (every 15 min)...');

  // Run every 15 minutes: "*/15 * * * *"
  cron.schedule('*/15 * * * *', async () => {
    try {
      await checkAndSendReminders();
    } catch (err) {
      console.error('❌ Reminder scheduler error:', err.message);
    }
  });

  // Also run once on startup (after 30 sec delay to let server boot)
  setTimeout(() => {
    checkAndSendReminders().catch(err =>
      console.error('❌ Initial reminder check error:', err.message)
    );
  }, 30000);
}

async function checkAndSendReminders() {
  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 15 * 60 * 1000); // 15 min window to avoid duplicates

  // 1. Find tests starting within the next 2 hours (±15 min window)
  const { data: upcomingTests, error: testError } = await supabase
    .from('tests')
    .select('*')
    .eq('content_type', 'test_series')
    .in('status', ['frozen', 'live', 'scheduled'])
    .gte('window_start', now.toISOString())
    .lte('window_start', twoHoursFromNow.toISOString());

  if (testError || !upcomingTests || upcomingTests.length === 0) {
    return; // No tests starting soon, skip silently
  }

  console.log(`⏰ Found ${upcomingTests.length} test(s) starting within 2 hours`);

  for (const test of upcomingTests) {
    // 2. Find hall tickets issued for this test (these are the enrolled students)
    const { data: tickets } = await supabase
      .from('hall_tickets')
      .select('*, users:student_id(id, email, full_name)')
      .eq('test_id', test.id);

    if (!tickets || tickets.length === 0) {
      // Fallback: if no hall tickets, find students with active subscriptions matching exam type
      const examType = test.exam_type || test.test_type || 'IAT';
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('student_email, student_name, student_id')
        .eq('status', 'active')
        .gte('expires_at', now.toISOString());

      if (!subscriptions || subscriptions.length === 0) continue;

      // Send reminder to subscribed students
      for (const sub of subscriptions) {
        if (!sub.student_email) continue;
        await sendReminderForTest(test, sub.student_email, sub.student_name, 'N/A');
      }
    } else {
      // Send reminder to students with hall tickets
      for (const ticket of tickets) {
        const email = ticket.users?.email || ticket.student_email;
        const name = ticket.users?.full_name || ticket.student_name || 'Student';
        if (!email) continue;
        await sendReminderForTest(test, email, name, ticket.unique_exam_id);
      }
    }
  }
}

async function sendReminderForTest(test, studentEmail, studentName, examId) {
  const windowStart = new Date(test.window_start);
  const examDate = windowStart.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const examTime = windowStart.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const html = reminderEmail({
    studentName: studentName || 'Student',
    testTitle: test.title || test.name || 'Test',
    examType: test.exam_type || test.test_type || 'Exam',
    examDate,
    examTime,
    examId: examId || 'N/A',
    examLink: `https://test.vigyanprep.com/dashboard`
  });

  await sendEmail(
    studentEmail,
    `⏰ Reminder: ${test.title || 'Your Test'} starts in 2 hours!`,
    html
  );
}

export default { startReminderScheduler };
