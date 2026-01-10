import { prisma } from '../lib/prisma';

export interface UserStats {
  averageMoodScore: number | null;
  topSymptoms: Array<{
    symptomId: string;
    symptomName: string;
    count: number;
  }>;
  currentStreak: number;
  totalLogs: {
    symptoms: number;
    moods: number;
    medications: number;
    habits: number;
  };
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Run all queries in parallel for better performance
  const [
    moodLogs,
    symptomLogs,
    allSymptomLogs,
    allMoodLogs,
    allMedicationLogs,
    allHabitLogs,
  ] = await Promise.all([
    // Mood logs from last 30 days for average calculation
    prisma.moodLog.findMany({
      where: {
        userId,
        loggedAt: { gte: thirtyDaysAgo },
      },
      select: { moodScore: true },
    }),

    // Symptom logs from last 30 days for top symptoms
    prisma.symptomLog.findMany({
      where: {
        userId,
        loggedAt: { gte: thirtyDaysAgo },
      },
      select: {
        symptomId: true,
        symptom: { select: { name: true } },
      },
    }),

    // Total counts for all time
    prisma.symptomLog.count({ where: { userId } }),
    prisma.moodLog.count({ where: { userId } }),
    prisma.medicationLog.count({ where: { userId } }),
    prisma.habitLog.count({ where: { userId } }),
  ]);

  // Calculate average mood score
  const averageMoodScore =
    moodLogs.length > 0
      ? Math.round(
          (moodLogs.reduce((sum, log) => sum + log.moodScore, 0) /
            moodLogs.length) *
            10
        ) / 10
      : null;

  // Calculate top symptoms (most frequently logged)
  const symptomCounts = new Map<string, { name: string; count: number }>();
  for (const log of symptomLogs) {
    const existing = symptomCounts.get(log.symptomId);
    if (existing) {
      existing.count++;
    } else {
      symptomCounts.set(log.symptomId, {
        name: log.symptom.name,
        count: 1,
      });
    }
  }

  const topSymptoms = Array.from(symptomCounts.entries())
    .map(([symptomId, data]) => ({
      symptomId,
      symptomName: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate current logging streak
  const currentStreak = await calculateLoggingStreak(userId);

  return {
    averageMoodScore,
    topSymptoms,
    currentStreak,
    totalLogs: {
      symptoms: allSymptomLogs,
      moods: allMoodLogs,
      medications: allMedicationLogs,
      habits: allHabitLogs,
    },
  };
}

async function calculateLoggingStreak(userId: string): Promise<number> {
  // Get all unique dates with logs, starting from today going backwards
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Get logs from the last 365 days to find streak
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setHours(0, 0, 0, 0);

  const [symptomLogs, moodLogs, medicationLogs, habitLogs] = await Promise.all([
    prisma.symptomLog.findMany({
      where: { userId, loggedAt: { gte: oneYearAgo, lte: today } },
      select: { loggedAt: true },
    }),
    prisma.moodLog.findMany({
      where: { userId, loggedAt: { gte: oneYearAgo, lte: today } },
      select: { loggedAt: true },
    }),
    prisma.medicationLog.findMany({
      where: { userId, createdAt: { gte: oneYearAgo, lte: today } },
      select: { createdAt: true },
    }),
    prisma.habitLog.findMany({
      where: { userId, loggedAt: { gte: oneYearAgo, lte: today } },
      select: { loggedAt: true },
    }),
  ]);

  // Collect all unique dates (as YYYY-MM-DD strings)
  const loggedDates = new Set<string>();

  const addDate = (date: Date) => {
    loggedDates.add(date.toISOString().split('T')[0]);
  };

  symptomLogs.forEach((log) => addDate(log.loggedAt));
  moodLogs.forEach((log) => addDate(log.loggedAt));
  medicationLogs.forEach((log) => addDate(log.createdAt));
  habitLogs.forEach((log) => addDate(log.loggedAt));

  // Calculate streak starting from today
  let streak = 0;
  const currentDate = new Date();
  currentDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];

    if (loggedDates.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      // If today has no logs, that's okay - check if yesterday starts a streak
      if (streak === 0) {
        currentDate.setDate(currentDate.getDate() - 1);
        const yesterdayStr = currentDate.toISOString().split('T')[0];
        if (loggedDates.has(yesterdayStr)) {
          // Start counting from yesterday
          continue;
        }
      }
      break;
    }

    // Safety limit to prevent infinite loops
    if (streak > 365) break;
  }

  return streak;
}
