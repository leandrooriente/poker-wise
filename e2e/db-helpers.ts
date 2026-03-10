import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Reset the database (drop tables, recreate, bootstrap admin).
 * Assumes PostgreSQL is running and .env is configured.
 */
export async function resetDatabase() {
  console.log('Resetting database...');
  try {
    const { stdout, stderr } = await execAsync('npm run db:reset');
    if (stderr && !stderr.includes('[dotenv]')) {
      console.warn('db:reset stderr:', stderr);
    }
    console.log('Database reset successful');
  } catch (error) {
    console.error('Failed to reset database:', error);
    throw error;
  }
}

/**
 * Seed a specific scenario into the database.
 * @param scenario One of: empty, basic-group, live-match, history, full-demo
 */
export async function seedScenario(scenario: string) {
  console.log(`Seeding scenario: ${scenario}`);
  try {
    const { stdout, stderr } = await execAsync(`npm run db:seed -- ${scenario}`);
    if (stderr && !stderr.includes('[dotenv]')) {
      console.warn('db:seed stderr:', stderr);
    }
    console.log(`Scenario ${scenario} seeded successfully`);
  } catch (error) {
    console.error(`Failed to seed scenario ${scenario}:`, error);
    throw error;
  }
}

/**
 * Reset database and seed a scenario.
 */
export async function resetAndSeed(scenario: string) {
  await resetDatabase();
  await seedScenario(scenario);
}

/**
 * Check if PostgreSQL is reachable (optional).
 * Uses pg_isready if available.
 */
export async function isDatabaseReady(): Promise<boolean> {
  try {
    await execAsync('pg_isready -h localhost -p 5432');
    return true;
  } catch {
    return false;
  }
}