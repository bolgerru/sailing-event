'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Race {
  raceNumber: number;
  teamA: string;
  teamB: string;
  boats: {
    teamA: string;
    teamB: string;
  };
  status?: 'not_started' | 'in_progress' | 'finished';
  startTime?: string;
}

export default function HomePage() {
  const [currentRace, setCurrentRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/schedule');
        const racesData = await response.json();

        // Find current race
        const inProgressRace = racesData.find((r: Race) => r.status === 'in_progress');
        setCurrentRace(inProgressRace || null);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
          IUSA Event 1
        </h1>
        <p className="text-gray-600">Live Results and Schedule</p>
      </div>

      {/* Current Race Status */}
      {currentRace ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-blue-800 mb-2">
            Race In Progress
          </h2>
          <div className="text-lg">
            {currentRace.teamA} vs {currentRace.teamB}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Race {currentRace.raceNumber} • {currentRace.boats.teamA} vs {currentRace.boats.teamB}
          </div>
          {currentRace.startTime && (
            <div className="text-sm text-gray-600 mt-2">
              Started: {new Date(currentRace.startTime).toLocaleTimeString()}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">No race currently in progress</p>
        </div>
      )}

      {/* Quick Links */}
      <div className="flex justify-center gap-4">
        <Link 
          href="/schedule" 
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Full Schedule
        </Link>
        <Link 
          href="/leaderboard" 
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Leaderboard
        </Link>
      </div>
    </div>
  );
}