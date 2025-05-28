import { NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';
import { getBlobServiceClient } from '../../../lib/blob-storage';

export async function DELETE(request: Request) {
  try {
    const { raceNumber } = await request.json();

    // Get the blob service client
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient('knockouts');

    // Construct the blob name based on the race number
    const blobName = `knockout-${raceNumber}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Check if the blob exists
    const exists = await blockBlobClient.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Knockout match not found' }, { status: 404 });
    }

    // Delete the blob
    await blockBlobClient.delete();

    return NextResponse.json({ message: 'Knockout match removed successfully' });
  } catch (error) {
    console.error('Error removing knockout match:', error);
    return NextResponse.json({ error: 'Failed to remove knockout match' }, { status: 500 });
  }
}