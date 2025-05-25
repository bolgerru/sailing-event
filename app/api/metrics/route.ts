import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Race {
  raceNumber: number;
  startTime: string;
  endTime: string;
  teamA: string;
  teamB: string;
  status: string;
  result?: number[];
}

export async function GET() {
  try {
    // Read and parse both metrics and races data
    const metricsPath = path.join(process.cwd(), 'data', 'metrics.json');
    const racesPath = path.join(process.cwd(), 'data', 'races.json');
    
    const [metricsFile, racesFile] = await Promise.all([
      fs.readFile(metricsPath, 'utf-8'),
      fs.readFile(racesPath, 'utf-8')
    ]);

    const races = JSON.parse(racesFile) as Race[];
    const metrics = JSON.parse(metricsFile);

    // Get completed races with both start and end times
    const completedRaces = races
      .filter((race: Race) => race.startTime && race.endTime)
      .sort((a: Race, b: Race) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())
      .slice(0, 5); // Take only the last 5 races

    if (completedRaces.length > 1) {
      // Calculate time between races for the last 5 races
      const timeBetweenRaces = completedRaces.reduce((total: number, race: Race, index: number) => {
        if (index === completedRaces.length - 1) return total;
        const currentEnd = new Date(race.endTime).getTime();
        const nextStart = new Date(completedRaces[index + 1].startTime).getTime();
        return total + (nextStart - currentEnd);
      }, 0);

      const averageTimeBetweenRaces = Math.floor(timeBetweenRaces / (completedRaces.length - 1));
      
      // Update metrics
      metrics.timeBetweenRacesMs = averageTimeBetweenRaces;
      metrics.timeBetweenRaces = `${Math.floor(averageTimeBetweenRaces / 60000)}m ${Math.floor((averageTimeBetweenRaces % 60000) / 1000)}s`;
      metrics.lastUpdated = new Date().toISOString();

      // Save updated metrics
      await fs.writeFile(metricsPath, JSON.stringify(metrics, null, 2));
    }

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error reading or calculating metrics:', error);
    return NextResponse.json({
      averageRaceLength: '0m 0s',
      timeBetweenRaces: '0m 0s',
      timeBetweenRacesMs: 180000, // 3 minutes default
      lastUpdated: new Date().toISOString()
    });
  }
}