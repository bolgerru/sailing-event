import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'leaderboard.json');
    const fileContents = await fs.readFile(filePath, 'utf-8');
    const leaderboard = JSON.parse(fileContents);

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error reading leaderboard:', error);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const filePath = path.join(process.cwd(), 'data', 'leaderboard.json');
    const fileContents = await fs.readFile(filePath, 'utf-8');
    const leaderboard = JSON.parse(fileContents);

    // Update leaderboard with new data
    leaderboard.push(body);

    await fs.writeFile(filePath, JSON.stringify(leaderboard, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 500 });
  }
}