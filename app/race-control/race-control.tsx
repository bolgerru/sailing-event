'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  status?: 'not_started' | 'in_progress' | 'finished';
  startTime?: string;
  boats?: {
    teamA: string;
    teamB: string;
  };
  league?: string;
};

export default function RaceControlPage() {
  const [races, setRaces] = useState<Race[]>([]);

  useEffect(() => {
    fetchRaces();
  }, []);

  const fetchRaces = async () => {
    try {
      const response = await fetch('/api/schedule');
      if (response.ok) {
        const data = await response.json();
        setRaces(data);
      }
    } catch (error) {
      console.error('Error fetching races:', error);
    }
  };

  const handleStartRace = async (raceNumber: number) => {
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          raceNumber,
          status: 'in_progress',
          startTime: new Date().toISOString()
        }),
      });

      if (!res.ok) throw new Error('Failed to start race');
      await fetchRaces();
    } catch (error) {
      alert('Error starting race: ' + (error as Error).message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Race Control</h1>
        <Link 
          href="/admin/results" 
          className="text-blue-600 hover:text-blue-800"
        >
          Go to Results Entry
        </Link>
      </div>

      <div className="grid gap-4">
        {races.map((race) => (
          <div 
            key={race.raceNumber}
            className="bg-white shadow-lg rounded-lg p-4 flex justify-between items-center"
          >
            <div className="flex-1">
              <div className="text-lg font-semibold mb-2">
                Race {race.raceNumber}
              </div>
              <div className="text-sm text-gray-600">
                {race.teamA} vs {race.teamB}
              </div>
              <div className="text-xs text-gray-500">
                Boats: {race.boats?.teamA} vs {race.boats?.teamB}
              </div>
              {race.league && (
                <div className="mt-1">
                  <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${race.league === 'main' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}
                  `}>
                    {race.league === 'main' ? 'Overall' : `${race.league} League`}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                {race.status === 'finished' ? (
                  <span className="text-green-600 font-medium">Completed</span>
                ) : race.status === 'in_progress' ? (
                  <span className="text-yellow-600 font-medium">In Progress</span>
                ) : (
                  <span className="text-gray-600">Not Started</span>
                )}
              </div>
              {(!race.status || race.status === 'not_started') && (
                <button
                  onClick={() => handleStartRace(race.raceNumber)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Start Race
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}