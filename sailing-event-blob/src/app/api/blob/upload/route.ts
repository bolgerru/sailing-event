import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { BlobServiceClient } from '@azure/storage-blob';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

export async function POST(request: Request) {
  try {
    const { fileName, fileContent } = await request.json();

    if (!fileName || !fileContent) {
      return NextResponse.json({ error: 'File name and content are required.' }, { status: 400 });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient('your-container-name');
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    await blockBlobClient.upload(fileContent, Buffer.byteLength(fileContent));

    return NextResponse.json({ message: 'File uploaded successfully.' });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
  }
}