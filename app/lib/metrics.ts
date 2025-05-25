import { promises as fs } from 'fs';
import path from 'path';

// Update RaceMetrics type
type RaceMetrics = {
  averageRaceLength: string;
  timeBetweenRaces: string;
  lastUpdated: string;
  timeBetweenRacesMs: number; // Add this to store raw milliseconds
};

type Race = {
  raceNumber: number;
  startTime?: string;
  endTime?: string;
  status?: 'not_started' | 'in_progress' | 'finished';
};

export async function updateMetrics(races: Race[]): Promise<RaceMetrics> {
  // Get all completed races for average race length
  const completedRaces = races
    .filter(race => 
      race.status === 'finished' &&
      race.startTime &&
      race.endTime
    );

  // Get last 5 finished races for time between races
  const lastFiveRaces = [...completedRaces]
    .sort((a, b) => 
      new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime()
    )
    .slice(0, 5);

  // Calculate average race length from all completed races
  const raceLengths = completedRaces.map(race => 
    new Date(race.endTime!).getTime() - new Date(race.startTime!).getTime()
  );
  
  const averageLength = raceLengths.length > 0
    ? raceLengths.reduce((a, b) => a + b, 0) / raceLengths.length
    : 0;

  // Calculate time between races from last 5 races
  const timeBetween: number[] = [];
  for (let i = 0; i < lastFiveRaces.length - 1; i++) {
    const currentRaceEnd = new Date(lastFiveRaces[i].endTime!).getTime();
    const nextRaceStart = new Date(lastFiveRaces[i + 1].startTime!).getTime();
    timeBetween.push(Math.abs(nextRaceStart - currentRaceEnd));
  }

  const averageTimeBetween = timeBetween.length > 0
    ? timeBetween.reduce((a, b) => a + b, 0) / timeBetween.length
    : 0;

  // Format durations
  const metrics: RaceMetrics = {
    averageRaceLength: formatDuration(averageLength),
    timeBetweenRaces: formatDuration(averageTimeBetween),
    timeBetweenRacesMs: averageTimeBetween || 180000, // Use 3 minutes as default
    lastUpdated: new Date().toISOString()
  };

  // Save metrics to file
  const filePath = path.join(process.cwd(), 'data', 'metrics.json');
  await fs.writeFile(filePath, JSON.stringify(metrics, null, 2));

  return metrics;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}