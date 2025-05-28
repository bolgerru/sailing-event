import { NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';
import { getBlobServiceClient } from '../../../lib/blob-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const blobName = searchParams.get('blobName');

    if (!blobName) {
      return NextResponse.json({ error: 'Blob name is required' }, { status: 400 });
    }

    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient('your-container-name');
    const blobClient = containerClient.getBlobClient(blobName);

    const downloadBlockBlobResponse = await blobClient.download(0);
    const downloadedContent = await streamToString(downloadBlockBlobResponse.readableStreamBody);

    return NextResponse.json({ content: downloadedContent });
  } catch (error) {
    console.error('Error downloading blob:', error);
    return NextResponse.json({ error: 'Failed to download blob' }, { status: 500 });
  }
}

async function streamToString(readableStream: ReadableStream | null): Promise<string> {
  if (!readableStream) {
    return '';
  }
  const reader = readableStream.getReader();
  const decoder = new TextDecoder('utf-8');
  let result = '';
  let done, value;

  while ({ done, value } = await reader.read(), !done) {
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode(); // flush the decoder
  return result;
}