import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, TrackingType } from '../src/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const defaultSymptoms = [
  { name: 'Headache', category: 'pain' },
  { name: 'Fatigue', category: 'general' },
  { name: 'Joint Pain', category: 'pain' },
  { name: 'Muscle Pain', category: 'pain' },
  { name: 'Nausea', category: 'digestive' },
  { name: 'Brain Fog', category: 'neurological' },
  { name: 'Dizziness', category: 'neurological' },
  { name: 'Insomnia', category: 'sleep' },
  { name: 'Anxiety', category: 'mental' },
  { name: 'Stomach Pain', category: 'digestive' },
  { name: 'Back Pain', category: 'pain' },
];

const defaultHabits = [
  { name: 'Sleep Duration', trackingType: TrackingType.duration, unit: 'hours' },
  { name: 'Water Intake', trackingType: TrackingType.numeric, unit: 'glasses' },
  { name: 'Exercise', trackingType: TrackingType.boolean, unit: null },
  { name: 'Alcohol', trackingType: TrackingType.boolean, unit: null },
  { name: 'Caffeine', trackingType: TrackingType.numeric, unit: 'cups' },
];

async function main() {
  console.log('Seeding database...');

  // Seed default symptoms (userId = null for system defaults)
  for (const symptom of defaultSymptoms) {
    const existing = await prisma.symptom.findFirst({
      where: {
        name: symptom.name,
        userId: null,
      },
    });

    if (!existing) {
      await prisma.symptom.create({
        data: {
          name: symptom.name,
          category: symptom.category,
          userId: null,
          isActive: true,
        },
      });
      console.log(`Created symptom: ${symptom.name}`);
    } else {
      console.log(`Symptom already exists: ${symptom.name}`);
    }
  }

  // Seed default habits (userId = null for system defaults)
  for (const habit of defaultHabits) {
    const existing = await prisma.habit.findFirst({
      where: {
        name: habit.name,
        userId: null,
      },
    });

    if (!existing) {
      await prisma.habit.create({
        data: {
          name: habit.name,
          trackingType: habit.trackingType,
          unit: habit.unit,
          userId: null,
          isActive: true,
        },
      });
      console.log(`Created habit: ${habit.name}`);
    } else {
      console.log(`Habit already exists: ${habit.name}`);
    }
  }

  console.log('Seeding complete!');
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
