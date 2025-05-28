import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { BlobServiceClient } from '@azure/storage-blob';

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);

export async function POST(request: Request) {
  try {
    const { raceDetails } = await request.json();

    // Validate raceDetails here if necessary

    const containerName = 'race-schedules';
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Ensure the container exists
    await containerClient.createIfNotExists();

    const blobName = `schedule-${Date.now()}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload the race schedule as a JSON file
    await blockBlobClient.upload(JSON.stringify(raceDetails), Buffer.byteLength(JSON.stringify(raceDetails)));

    return NextResponse.json({ message: 'Race schedule generated successfully', blobName }, { status: 201 });
  } catch (error) {
    console.error('Error generating race schedule:', error);
    return NextResponse.json({ error: 'Failed to generate race schedule' }, { status: 500 });
  }
}