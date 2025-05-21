// lib/data.ts
import fs from 'fs';
import path from 'path';

export const teams = Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`);

export type RaceResult = number[]; // Six positions
export type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  result?: RaceResult;
};

export const races: Race[] = Array.from({ length: 6 }, (_, i) => ({
  raceNumber: i + 1,
  teamA: teams[i * 2],
  teamB: teams[i * 2 + 1],
}));

const DATA_DIR = path.join(process.cwd(), 'data');
const RESULTS_PATH = path.join(DATA_DIR, 'raceResults.json');

// Helper to ensure the data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }
}

// Load saved results from disk (returns a map raceNumber -> result)
function loadResultsFromDisk(): Record<number, RaceResult> {
  try {
    if (fs.existsSync(RESULTS_PATH)) {
      const data = fs.readFileSync(RESULTS_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load race results:', err);
  }
  return {};
}

// Save results map to disk
function saveResultsToDisk(results: Record<number, RaceResult>) {
  try {
    ensureDataDir();
    fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save race results:', err);
  }
}

// Exported function to get races with results merged in
export async function getRaces() {
    const filePath = path.join(process.cwd(), 'data/schedule.json');
    const data = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      : [];
    return data;
  }

// Exported function to save race results (and persist to disk)
export async function saveRaceResult(raceNumber: number, result: RaceResult) {
  const savedResults = loadResultsFromDisk();
  savedResults[raceNumber] = result;
  saveResultsToDisk(savedResults);
}

