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
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  
  // Get completed races from last 2 hours
  const recentRaces = races
    .filter(race => 
      race.status === 'finished' &&
      race.startTime &&
      race.endTime &&
      new Date(race.endTime) > twoHoursAgo
    )
    .sort((a, b) => 
      new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime()
    )
    .slice(0, 10);

  // Calculate average race length
  const raceLengths = recentRaces.map(race => 
    new Date(race.endTime!).getTime() - new Date(race.startTime!).getTime()
  );
  
  const averageLength = raceLengths.length > 0
    ? raceLengths.reduce((a, b) => a + b, 0) / raceLengths.length
    : 0;

  // Calculate time between races
  const timeBetween: number[] = [];
  for (let i = 0; i < recentRaces.length - 1; i++) {
    const currentRaceEnd = new Date(recentRaces[i].endTime!).getTime();
    const nextRaceEnd = new Date(recentRaces[i + 1].endTime!).getTime();
    timeBetween.push(Math.abs(currentRaceEnd - nextRaceEnd));
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