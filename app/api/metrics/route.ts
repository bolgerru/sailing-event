import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

async function getBlobData(fileName: string) {
  try {
    const blobUrl = `https://${process.env.BLOB_READ_WRITE_TOKEN?.split('vercel_blob_rw_')[1]?.split('_')[0]}.public.blob.vercel-storage.com/${fileName}`;
    const response = await fetch(blobUrl);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.log(`${fileName} not found in blob`);
    return null;
  }
}

export async function GET() {
  try {
    const metrics = await getBlobData('metrics.json');

    if (!metrics) {
      return NextResponse.json({
        averageRaceLength: '0m 0s',
        timeBetweenRaces: '3m 0s',
        timeBetweenRacesMs: 180000,
        lastUpdated: new Date().toISOString()
      });
    }

    // Ensure backward compatibility
    if (!metrics.timeBetweenRacesMs) {
      const [min, sec] = metrics.timeBetweenRaces
        .replace('m', '')
        .replace('s', '')
        .split(' ')
        .map(Number);
      
      metrics.timeBetweenRacesMs = (min * 60 + sec) * 1000;
    }

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error reading metrics from Blob:', error);
    return NextResponse.json({
      averageRaceLength: '0m 0s',
      timeBetweenRaces: '3m 0s',
      timeBetweenRacesMs: 180000,
      lastUpdated: new Date().toISOString()
    });
  }
}