import { NextResponse } from 'next/server';
import { BlobClient } from '../../../lib/blob-client';

export async function DELETE(request: Request) {
  try {
    const { blobName } = await request.json();

    if (!blobName) {
      return NextResponse.json({ error: 'Blob name is required' }, { status: 400 });
    }

    const blobClient = new BlobClient();
    await blobClient.deleteBlob(blobName);

    return NextResponse.json({ message: 'Blob deleted successfully' });
  } catch (error) {
    console.error('Error deleting blob:', error);
    return NextResponse.json({ error: 'Failed to delete blob' }, { status: 500 });
  }
}