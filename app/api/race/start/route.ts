import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

async function getBlobData(fileName: string) {
  try {
    const blobUrl = `https://${process.env.BLOB_READ_WRITE_TOKEN?.split('vercel_blob_rw_')[1]?.split('_')[0]}.public.blob.vercel-storage.com/${fileName}`;
    const response = await fetch(blobUrl);
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (error) {
    console.log(`${fileName} not found in blob, returning empty array`);
    return [];
  }
}

async function saveBlobData(fileName: string, data: any) {
  const blob = await put(fileName, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
  return blob;
}

export async function POST(request: Request) {
  try {
    const { raceNumber, startTime } = await request.json();

    // Read the current schedule from Blob
    const races = await getBlobData('schedule.json');

    // Find and update the race
    const raceIndex = races.findIndex((race: any) => race.raceNumber === raceNumber);
    
    if (raceIndex === -1) {
      return NextResponse.json(
        { error: 'Race not found' },
        { status: 404 }
      );
    }

    // Update race status and start time
    races[raceIndex] = {
      ...races[raceIndex],
      status: 'in_progress',
      startTime: startTime
    };

    // Save back to Blob
    await saveBlobData('schedule.json', races);

    return NextResponse.json({ message: 'Race started successfully' });
  } catch (error) {
    console.error('Error starting race:', error);
    return NextResponse.json(
      { error: 'Failed to start race' },
      { status: 500 }
    );
  }
}