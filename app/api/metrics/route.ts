import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'metrics.json');
    const fileContents = await fs.readFile(filePath, 'utf-8');
    const metrics = JSON.parse(fileContents);

    // If old format metrics, add the ms value
    if (!metrics.timeBetweenRacesMs) {
      // Parse the string format "Xm Ys" to milliseconds
      const [min, sec] = metrics.timeBetweenRaces
        .replace('m', '')
        .replace('s', '')
        .split(' ')
        .map(Number);
      
      metrics.timeBetweenRacesMs = (min * 60 + sec) * 1000;
    }

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error reading metrics:', error);
    return NextResponse.json({
      averageRaceLength: '0m 0s',
      timeBetweenRaces: '0m 0s',
      timeBetweenRacesMs: 180000, // 3 minutes default
      lastUpdated: new Date().toISOString()
    });
  }
}