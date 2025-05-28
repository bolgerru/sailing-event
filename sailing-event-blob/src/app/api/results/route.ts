import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Race } from '../../../types/race'; // Adjust the import path as necessary

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'results.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const results: Race[] = JSON.parse(data);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error loading results:', error);
    return NextResponse.json({ error: 'Failed to load results' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const newResult: Race = await req.json();
    const filePath = path.join(process.cwd(), 'data', 'results.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const results: Race[] = JSON.parse(data);
    
    results.push(newResult);
    await fs.writeFile(filePath, JSON.stringify(results, null, 2));

    return NextResponse.json({ message: 'Result added successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error adding result:', error);
    return NextResponse.json({ error: 'Failed to add result' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { raceNumber } = await req.json();
    const filePath = path.join(process.cwd(), 'data', 'results.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const results: Race[] = JSON.parse(data);
    
    const updatedResults = results.filter(result => result.raceNumber !== raceNumber);
    await fs.writeFile(filePath, JSON.stringify(updatedResults, null, 2));

    return NextResponse.json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.error('Error deleting result:', error);
    return NextResponse.json({ error: 'Failed to delete result' }, { status: 500 });
  }
}