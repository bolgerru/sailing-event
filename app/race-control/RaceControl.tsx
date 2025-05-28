'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  status?: 'not_started' | 'in_progress' | 'finished';
  startTime?: string;
  endTime?: string;
  boats?: {
    teamA: string;
    teamB: string;
  };
  league?: string;
  isKnockout?: boolean;
  stage?: string;
  matchNumber?: number;
  racingFormat?: string;
  result?: number[] | null;
  isLaunching?: boolean;
  goToChangeover?: boolean;
};

const getKnockoutStageDisplayName = (stage?: string): string => {
  switch (stage?.toLowerCase()) {
    case 'quarter': return 'Quarter Final';
    case 'semi': return 'Semi Final';
    case 'final': return 'Final';
    default: return 'Knockout';
  }
};

const getLeagueTagColors = (league?: string): string => {
  if (!league) return 'bg-gray-100 text-gray-800';
  
  switch (league.toLowerCase()) {
    case 'gold': return 'bg-yellow-100 text-yellow-800';
    case 'silver': return 'bg-gray-100 text-gray-700';
    case 'bronze': return 'bg-orange-100 text-orange-800';
    case 'main': return 'bg-blue-100 text-blue-800';
    default: return 'bg-purple-100 text-purple-800';
  }
};

const getKnockoutStageTagColors = (stage?: string): string => {
  switch (stage?.toLowerCase()) {
    case 'quarter': return 'bg-red-100 text-red-800';
    case 'semi': return 'bg-orange-100 text-orange-800';
    case 'final': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formatDuration = (startTime: string, endTime?: string): string => {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  const diff = end - start;
  
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  return `${minutes}m ${seconds}s`;
};

const scrollToElement = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

export function RaceControl({ races: initialRaces }: { races: Race[] }) {
  const [races, setRaces] = useState<Race[]>(initialRaces);
  const [nextUnfinishedRace, setNextUnfinishedRace] = useState<Race | null>(null);

  useEffect(() => {
    fetchRaces();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRaces, 30000);
    return () => clearInterval(interval);
  }, []);

  // Find next unfinished race
  useEffect(() => {
    const unfinishedKnockouts = races.filter(r => r.isKnockout && !r.result);
    if (unfinishedKnockouts.length > 0) {
      const stagePriority = { 'final': 3, 'semi': 2, 'quarter': 1 } as const;
      unfinishedKnockouts.sort((a, b) => {
        const priorityA = stagePriority[a.stage as keyof typeof stagePriority] || 0;
        const priorityB = stagePriority[b.stage as keyof typeof stagePriority] || 0;
        if (priorityA !== priorityB) return priorityB - priorityA;
        return (a.matchNumber || 0) - (b.matchNumber || 0) || a.raceNumber - b.raceNumber;
      });
      setNextUnfinishedRace(unfinishedKnockouts[0]);
    } else {
      const unfinishedRegular = races.find(r => !r.isKnockout && !r.result);
      setNextUnfinishedRace(unfinishedRegular || null);
    }
  }, [races]);

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
    <div className="max-w-6xl mx-auto p-2 sm:p-4 pb-20">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:justify-between sm:items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Race Control</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Link 
            href="/admin/results" 
            className="bg-blue-600 text-white px-3 py-2 rounded text-center hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            Results Entry
          </Link>
          <button
            onClick={fetchRaces}
            className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors text-sm sm:text-base"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Jump to Next Unfinished Race Button - Mobile Optimized */}
      {nextUnfinishedRace && (
        <button
          onClick={() => scrollToElement(`race-${nextUnfinishedRace.raceNumber}`)}
          className="fixed bottom-4 right-2 sm:right-4 bg-blue-600 text-white px-2 sm:px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-1 sm:gap-2 z-50 text-xs sm:text-sm"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="hidden sm:inline">
            {nextUnfinishedRace.isKnockout 
              ? `Next ${getKnockoutStageDisplayName(nextUnfinishedRace.stage)}` 
              : 'Next Unfinished Race'
            }
          </span>
          <span className="sm:hidden">
            {nextUnfinishedRace.isKnockout 
              ? getKnockoutStageDisplayName(nextUnfinishedRace.stage).split(' ')[0]
              : 'Race'
            }
          </span>
          <span className="font-bold">#{nextUnfinishedRace.raceNumber}</span>
        </button>
      )}

      <div className="grid gap-3 sm:gap-4">
        {races.map((race) => (
          <div 
            key={race.raceNumber}
            id={`race-${race.raceNumber}`}
            className={`bg-white shadow-lg rounded-lg p-3 sm:p-4 border-l-4 ${
              race.isKnockout ? 'border-purple-500' : 'border-blue-500'
            }`}
          >
            {/* Race Header - Mobile Stacked Layout */}
            <div className="space-y-3 sm:space-y-0 sm:flex sm:justify-between sm:items-start mb-3 sm:mb-4">
              {/* Race Number and Tags */}
              <div className="flex flex-wrap items-center gap-2">
                <div className={`px-2 sm:px-3 py-1 rounded-full text-white font-bold text-sm sm:text-base ${
                  race.isKnockout ? 'bg-purple-600' : 'bg-blue-600'
                }`}>
                  #{race.raceNumber}
                </div>
                
                {/* Racing Format */}
                {race.racingFormat && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {race.racingFormat}
                  </span>
                )}

                {/* League Tag */}
                {race.league && (
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize
                    ${getLeagueTagColors(race.league)}
                  `}>
                    {race.league === 'main' ? 'Overall' : race.league}
                  </span>
                )}

                {/* Knockout Stage Tag */}
                {race.isKnockout && race.stage && (
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${getKnockoutStageTagColors(race.stage)}
                  `}>
                    {getKnockoutStageDisplayName(race.stage).replace(' ', ' ')}
                    {race.matchNumber && ` #${race.matchNumber}`}
                  </span>
                )}
              </div>

              {/* Status and Action - Mobile Stacked */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="text-xs sm:text-sm">
                  {race.status === 'finished' ? (
                    <div className="text-green-600">
                      <span className="font-medium block">✅ Completed</span>
                      {race.startTime && race.endTime && (
                        <span className="text-gray-500 text-xs">
                          {formatDuration(race.startTime, race.endTime)}
                        </span>
                      )}
                    </div>
                  ) : race.status === 'in_progress' ? (
                    <div className="text-yellow-600">
                      <span className="font-medium block">🏁 In Progress</span>
                      {race.startTime && (
                        <span className="text-gray-500 text-xs">
                          {formatDuration(race.startTime)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-600">
                      <span className="block">⏳ Not Started</span>
                      {/* Show launching/changeover status */}
                      {race.isLaunching && (
                        <span className="text-purple-600 text-xs font-medium">🚀 Launching</span>
                      )}
                      {race.goToChangeover && !race.isLaunching && (
                        <span className="text-orange-600 text-xs font-medium">⛵ Changeover</span>
                      )}
                    </div>
                  )}
                </div>
                
                {(!race.status || race.status === 'not_started') && (
                  <button
                    onClick={() => handleStartRace(race.raceNumber)}
                    className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-xs sm:text-sm whitespace-nowrap w-full sm:w-auto"
                  >
                    Start Race
                  </button>
                )}
              </div>
            </div>

            {/* Teams vs Teams - Mobile Optimized */}
            <div className="mb-3 sm:mb-4">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="text-center flex-1 w-full">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">{race.teamA}</h3>
                  <span className="text-xs sm:text-sm text-gray-600">({race.boats?.teamA || 'N/A'})</span>
                </div>
                
                <div className="px-2 sm:px-4">
                  <span className="text-gray-400 font-bold text-sm sm:text-lg">VS</span>
                </div>
                
                <div className="text-center flex-1 w-full">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">{race.teamB}</h3>
                  <span className="text-xs sm:text-sm text-gray-600">({race.boats?.teamB || 'N/A'})</span>
                </div>
              </div>
            </div>

            {/* Timing Information - Mobile Optimized */}
            {(race.startTime || race.endTime) && (
              <div className="bg-gray-50 p-2 sm:p-3 rounded-md mb-2 sm:mb-0">
                <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">⏰ Timing</h4>
                <div className="space-y-1 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2 text-xs sm:text-sm text-gray-600">
                  {race.startTime && (
                    <div>
                      <span className="font-medium">Started:</span> {new Date(race.startTime).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                  {race.endTime && (
                    <div>
                      <span className="font-medium">Finished:</span> {new Date(race.endTime).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Result Summary - Mobile Optimized */}
            {race.result && race.result.length > 0 && (
              <div className="bg-green-50 p-2 sm:p-3 rounded-md">
                <h4 className="text-xs sm:text-sm font-medium text-green-800 mb-1 sm:mb-2">🏆 Result</h4>
                <div className="space-y-1 sm:space-y-0 sm:flex sm:justify-between text-xs sm:text-sm">
                  <div className="break-words">
                    <span className="font-medium">{race.teamA}:</span> {race.result.slice(0, race.result.length / 2).join(', ')}
                  </div>
                  <div className="break-words">
                    <span className="font-medium">{race.teamB}:</span> {race.result.slice(race.result.length / 2).join(', ')}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}