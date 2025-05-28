import { NextResponse } from 'next/server';
import { BlobClient } from '../../../lib/blob-client';

export async function POST(request: Request) {
  try {
    const { raceNumber, startTime } = await request.json();

    // Initialize BlobClient
    const blobClient = new BlobClient();

    // Start the race by uploading the race details to blob storage
    const raceDetails = {
      raceNumber,
      startTime,
      status: 'in_progress'
    };

    await blobClient.uploadRaceDetails(raceDetails);

    return NextResponse.json({ message: 'Race started successfully' });
  } catch (error) {
    console.error('Error starting race:', error);
    return NextResponse.json(
      { error: 'Failed to start race' },
      { status: 500 }
    );
  }
}