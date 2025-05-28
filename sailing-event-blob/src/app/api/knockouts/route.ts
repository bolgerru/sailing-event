import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { KnockoutMatch } from '../../../types/blob'; // Adjust the import based on your types

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'knockouts.json');
    const fileContents = await fs.readFile(filePath, 'utf-8');
    const knockouts = JSON.parse(fileContents);

    return NextResponse.json(knockouts);
  } catch (error) {
    console.error('Error reading knockouts:', error);
    return NextResponse.json({ error: 'Failed to load knockouts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const newMatch: KnockoutMatch = await req.json();
    const filePath = path.join(process.cwd(), 'data', 'knockouts.json');
    const fileContents = await fs.readFile(filePath, 'utf-8');
    const knockouts = JSON.parse(fileContents);

    knockouts.push(newMatch);
    await fs.writeFile(filePath, JSON.stringify(knockouts, null, 2));

    return NextResponse.json({ success: true, match: newMatch });
  } catch (error) {
    console.error('Error adding knockout match:', error);
    return NextResponse.json({ error: 'Failed to add knockout match' }, { status: 500 });
  }
}