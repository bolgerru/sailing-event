import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { BlobServiceClient } from '@azure/storage-blob';

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerName = 'your-container-name'; // Replace with your container name

export async function GET() {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobs = containerClient.listBlobsFlat();
    const blobList = [];

    for await (const blob of blobs) {
      blobList.push(blob.name);
    }

    return NextResponse.json(blobList);
  } catch (error) {
    console.error('Error fetching blob list:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { schedule } = await request.json();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const blobName = `schedule-${Date.now()}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.upload(JSON.stringify(schedule), Buffer.byteLength(JSON.stringify(schedule)));

    return NextResponse.json({ message: 'Schedule uploaded successfully', blobName });
  } catch (error) {
    console.error('Error uploading schedule:', error);
    return NextResponse.json({ error: 'Failed to upload schedule' }, { status: 500 });
  }
}