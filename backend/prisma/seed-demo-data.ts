import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// User email to seed data for - pass as command line arg or use default
const TARGET_EMAIL = process.argv[2] || 'sarah@welltrack.com';

async function main() {
  console.log(`Seeding demo data for ${TARGET_EMAIL}...`);

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
  });

  if (!user) {
    console.error(`User ${TARGET_EMAIL} not found!`);
    process.exit(1);
  }

  const userId = user.id;
  console.log(`Found user: ${userId}`);

  // Get default symptoms
  const symptoms = await prisma.symptom.findMany({
    where: { userId: null, isActive: true },
  });

  // Get default habits
  const habits = await prisma.habit.findMany({
    where: { userId: null, isActive: true },
  });

  // Create a medication for the user
  let medication = await prisma.medication.findFirst({
    where: { userId, name: 'Vitamin D' },
  });

  if (!medication) {
    medication = await prisma.medication.create({
      data: {
        userId,
        name: 'Vitamin D',
        dosage: '2000 IU',
        frequency: 'daily',
        isActive: true,
      },
    });
    console.log('Created medication: Vitamin D');
  }

  // Generate data for the past 30 days
  const now = new Date();
  const daysToGenerate = 30;

  for (let daysAgo = 0; daysAgo < daysToGenerate; daysAgo++) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(9 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

    // Skip some days randomly (80% chance of logging)
    if (Math.random() > 0.8 && daysAgo > 0) {
      continue;
    }

    // Mood log (vary mood based on "good" and "bad" days pattern)
    const isGoodDay = Math.random() > 0.3;
    const moodScore = isGoodDay ? Math.floor(Math.random() * 2) + 4 : Math.floor(Math.random() * 2) + 2;
    const energyLevel = isGoodDay ? Math.floor(Math.random() * 2) + 3 : Math.floor(Math.random() * 2) + 1;
    const stressLevel = isGoodDay ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 2) + 3;

    await prisma.moodLog.create({
      data: {
        userId,
        moodScore,
        energyLevel,
        stressLevel,
        notes: daysAgo === 0 ? 'Feeling pretty good today!' : null,
        loggedAt: date,
      },
    });

    // Symptom logs (more symptoms on bad days)
    const numSymptoms = isGoodDay ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3) + 1;
    const shuffledSymptoms = symptoms.sort(() => Math.random() - 0.5);

    for (let i = 0; i < numSymptoms && i < shuffledSymptoms.length; i++) {
      const symptom = shuffledSymptoms[i];
      const severity = isGoodDay ? Math.floor(Math.random() * 3) + 2 : Math.floor(Math.random() * 4) + 5;

      await prisma.symptomLog.create({
        data: {
          userId,
          symptomId: symptom.id,
          severity,
          loggedAt: date,
        },
      });
    }

    // Medication log (90% compliance)
    if (Math.random() < 0.9) {
      await prisma.medicationLog.create({
        data: {
          userId,
          medicationId: medication.id,
          taken: true,
          takenAt: date,
        },
      });
    }

    // Habit logs
    for (const habit of habits) {
      // 70% chance of logging each habit
      if (Math.random() > 0.7) continue;

      let valueBoolean: boolean | null = null;
      let valueNumeric: number | null = null;
      let valueDuration: number | null = null;

      if (habit.trackingType === 'boolean') {
        valueBoolean = Math.random() > 0.4; // 60% success rate
      } else if (habit.trackingType === 'numeric') {
        if (habit.name === 'Water Intake') {
          valueNumeric = Math.floor(Math.random() * 6) + 4; // 4-9 glasses
        } else if (habit.name === 'Caffeine') {
          valueNumeric = Math.floor(Math.random() * 3) + 1; // 1-3 cups
        } else {
          valueNumeric = Math.floor(Math.random() * 10) + 1;
        }
      } else if (habit.trackingType === 'duration') {
        // Sleep duration in minutes (6-9 hours)
        valueDuration = Math.floor(Math.random() * 180) + 360;
      }

      await prisma.habitLog.create({
        data: {
          userId,
          habitId: habit.id,
          valueBoolean,
          valueNumeric,
          valueDuration,
          loggedAt: date,
        },
      });
    }
  }

  // Count what we created
  const moodCount = await prisma.moodLog.count({ where: { userId } });
  const symptomCount = await prisma.symptomLog.count({ where: { userId } });
  const medCount = await prisma.medicationLog.count({ where: { userId } });
  const habitCount = await prisma.habitLog.count({ where: { userId } });

  console.log('\nDemo data created:');
  console.log(`  Mood logs: ${moodCount}`);
  console.log(`  Symptom logs: ${symptomCount}`);
  console.log(`  Medication logs: ${medCount}`);
  console.log(`  Habit logs: ${habitCount}`);
  console.log('\nDone!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
