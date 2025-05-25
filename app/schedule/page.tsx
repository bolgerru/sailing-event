"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';

// First update the Race type to include status and times
type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  league?: string;
  result: number[] | null;
  boats: {
    teamA: string;
    teamB: string;
  };
  status?: 'not_started' | 'in_progress' | 'finished';
  startTime?: string;
  endTime?: string;
};

function isValidResult(result: number[] | null): boolean {
  return (
    Array.isArray(result) &&
    result.length === 6 &&
    result.every((pos) => typeof pos === 'number' && pos > 0)
  );
}

function getWinner(result: number[] | null, teamA: string, teamB: string): string | null {
  if (!isValidResult(result)) return null;

  const teamAPoints = result!.slice(0, 3).reduce((a, b) => a + b, 0);
  const teamBPoints = result!.slice(3).reduce((a, b) => a + b, 0);

  if (teamAPoints < teamBPoints) return teamA;
  if (teamBPoints < teamAPoints) return teamB;

  return result!.indexOf(1) < 3 ? teamB : teamA;
}

function getLeagueTagColors(league: string): string {
  switch (league.toLowerCase()) {
    case 'gold':
      return 'bg-yellow-100 text-yellow-800';
    case 'silver':
      return 'bg-gray-100 text-gray-800';
    case 'bronze':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

// Add a new component for the status tag
function StatusTag({ status }: { status?: string }) {
  if (!status || status === 'not_started') return null;
  
  return status === 'in_progress' ? (
    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
      In Progress
    </span>
  ) : (
    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
      Finished
    </span>
  );
}

// Add a new component for the live duration
function LiveDuration({ startTime }: { startTime: string }) {
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    function updateDuration() {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diff = now - start;
      
      const minutes = Math.floor(Math.abs(diff) / 60000);
      const seconds = Math.floor((Math.abs(diff) % 60000) / 1000);
      
      setDuration(`${minutes}m ${seconds}s`);
    }

    // Initial update
    updateDuration();

    // Update every second
    const interval = setInterval(updateDuration, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [startTime]);

  return <span>{duration}</span>;
}

export default function SchedulePage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  // Add state for expanded race details
  const [expandedRace, setExpandedRace] = useState<number | null>(null);
  // Add these new states near your other state declarations
  const [showBackToTop, setShowBackToTop] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Fetch races data
  useEffect(() => {
    const fetchRaces = async () => {
      try {
        const res = await fetch('/api/schedule', {
          cache: 'no-store',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!res.ok) throw new Error('Failed to fetch races');
        const data = await res.json();
        setRaces(data);
      } catch (error) {
        console.error('Error fetching races:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRaces();
  }, []);

  // Get unique filter options combining leagues and teams
  const filterOptions = useMemo(() => {
    const options = new Set<string>();
    options.add('all');
    
    // Add leagues
    races.forEach((race: Race) => {
      if (race.league) {
        options.add(`league:${race.league}`);
      }
    });

    // Add teams
    races.forEach((race: Race) => {
      options.add(`team:${race.teamA}`);
      options.add(`team:${race.teamB}`);
    });

    return Array.from(options);
  }, [races]);

  // Filter races based on selection
  const filteredRaces = useMemo(() => {
    if (filter === 'all') return races;

    const [type, value] = filter.split(':');
    
    return races.filter((race: Race) => {
      if (type === 'league') {
        return race.league === value;
      }
      if (type === 'team') {
        return race.teamA === value || race.teamB === value;
      }
      return true;
    });
  }, [races, filter]);

  // Separate filtered races into upcoming and completed
  const completedRaces = filteredRaces.filter(race => isValidResult(race.result));
  const upcomingRaces = filteredRaces.filter(race => !isValidResult(race.result));

  // Add scroll handler to show/hide back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Helper function to format duration
  function formatDuration(time: number | string | Date): string {
    let duration: number;
    
    if (typeof time === 'number') {
      // For completed races (passed duration in milliseconds)
      duration = time;
    } else {
      // For ongoing races (passed start time)
      const startTime = new Date(time).getTime();
      duration = Date.now() - startTime;
    }

    const minutes = Math.floor(Math.abs(duration) / 60000);
    const seconds = Math.floor((Math.abs(duration) % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }

  // Add these helper functions
  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse text-gray-500">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 text-gray-800">
        Schedule & Results
      </h1>

      {/* Single Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
          Filter Matches
        </label>
        <select
          id="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="all">All Races</option>
          
          {filterOptions
            .filter(opt => opt.startsWith('league:'))
            .map(opt => {
              const league = opt.split(':')[1];
              return (
                <option key={opt} value={opt}>
                  {league === 'main' ? 'Overall League' : `${league} League`}
                </option>
              );
            })}
          
          {filterOptions
            .filter(opt => opt.startsWith('team:'))
            .map(opt => {
              const team = opt.split(':')[1];
              return (
                <option key={opt} value={opt}>
                  {team} (Team)
                </option>
              );
            })}
        </select>
      </div>

      {filteredRaces.length === 0 && (
        <p className="text-center text-gray-500">No matches found for the selected filters.</p>
      )}

      {/* Upcoming Races Section */}
      {upcomingRaces.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Next Races</h2>
          <div className="grid gap-4">
            {upcomingRaces.map((race) => (
              <div 
                key={race.raceNumber}
                className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setExpandedRace(expandedRace === race.raceNumber ? null : race.raceNumber)}
              >
                <div className="flex items-center border-b border-gray-100">
                  <div className="w-16 md:w-24 h-16 md:h-24 flex items-center justify-center bg-blue-500 text-white">
                    <span className="text-2xl md:text-4xl font-bold">
                      {race.raceNumber}
                    </span>
                  </div>
                  
                  <div className="flex-1 p-3">
                    <div className="flex justify-between items-start">
                      <div className="text-base md:text-lg font-semibold text-center flex-1">
                        <span className="text-blue-600">{race.teamA}</span>
                        <span className="mx-1 md:mx-2 text-gray-400">vs</span>
                        <span className="text-blue-600">{race.teamB}</span>
                      </div>
                      <StatusTag status={race.status} />
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 text-center mt-1">
                      ({race.boats.teamA}) vs ({race.boats.teamB})
                    </div>
                    {race.league && (
                      <div className="mt-2 flex justify-center">
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${getLeagueTagColors(race.league)}
                        `}>
                          {race.league === 'main' ? 'Overall' : `${race.league} League`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded race details */}
                {expandedRace === race.raceNumber && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <div className="space-y-2 text-sm">
                      {race.startTime && (
                        <p className="text-gray-600">
                          Started: {new Date(race.startTime).toLocaleString()}
                        </p>
                      )}
                      {race.endTime && (
                        <p className="text-gray-600">
                          Finished: {new Date(race.endTime).toLocaleString()}
                        </p>
                      )}
                      {race.status === 'in_progress' && race.startTime && (
                        <p className="text-yellow-600">
                          Duration: <LiveDuration startTime={race.startTime} />
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50">
                  {isValidResult(race.result) ? (
                    <div className="text-center space-y-2">
                      <div className="flex justify-center items-center gap-2 md:gap-8">
                        <div className={`flex-1 ${getWinner(race.result, race.teamA, race.teamB) === race.teamA ? 'text-green-600' : 'text-red-600'}`}>
                          <p className="font-semibold mb-1 text-sm md:text-base">{race.teamA}</p>
                          <div className="flex justify-center gap-1 md:gap-3">
                            {race.result!.slice(0, 3).map((pos, i) => (
                              <span key={i} className="bg-gray-100 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-sm">
                                {pos}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-gray-400 font-bold px-1 md:px-2">VS</div>
                        <div className={`flex-1 ${getWinner(race.result, race.teamA, race.teamB) === race.teamB ? 'text-green-600' : 'text-red-600'}`}>
                          <p className="font-semibold mb-1 text-sm md:text-base">{race.teamB}</p>
                          <div className="flex justify-center gap-1 md:gap-3">
                            {race.result!.slice(3).map((pos, i) => (
                              <span key={i} className="bg-gray-100 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-sm">
                                {pos}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 italic text-sm">
                      No result yet
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Races Section */}
      {completedRaces.length > 0 && (
        <div 
          ref={resultsRef}
          className="space-y-4 mt-8 pt-8 border-t border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-700">Race Results</h2>
          <div className="grid gap-4">
            {completedRaces.map((race) => (
              <div 
                key={race.raceNumber}
                className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setExpandedRace(expandedRace === race.raceNumber ? null : race.raceNumber)}
              >
                <div className="flex items-center border-b border-gray-100">
                  <div className="w-16 md:w-24 h-16 md:h-24 flex items-center justify-center bg-blue-500 text-white">
                    <span className="text-2xl md:text-4xl font-bold">
                      {race.raceNumber}
                    </span>
                  </div>
                  
                  <div className="flex-1 p-3">
                    <div className="text-base md:text-lg font-semibold text-center">
                      <span className="text-blue-600">{race.teamA}</span>
                      <span className="mx-1 md:mx-2 text-gray-400">vs</span>
                      <span className="text-blue-600">{race.teamB}</span>
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 text-center mt-1">
                      ({race.boats.teamA}) vs ({race.boats.teamB})
                    </div>
                    {race.league && (
                      <div className="mt-2 flex justify-center">
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${getLeagueTagColors(race.league)}
                        `}>
                          {race.league === 'main' ? 'Overall' : `${race.league} League`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add expanded race details */}
                {expandedRace === race.raceNumber && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <div className="space-y-2 text-sm">
                      {race.startTime && (
                        <p className="text-gray-600">
                          Started: {new Date(race.startTime).toLocaleString()}
                        </p>
                      )}
                      {race.endTime && (
                        <p className="text-gray-600">
                          Finished: {new Date(race.endTime).toLocaleString()}
                        </p>
                      )}
                      {race.status === 'finished' && race.startTime && race.endTime && (
                        <p className="text-gray-600">
                          Duration: {formatDuration(
                            new Date(race.endTime).getTime() - new Date(race.startTime).getTime()
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50">
                  {isValidResult(race.result) ? (
                    <div className="text-center space-y-2">
                      <div className="flex justify-center items-center gap-2 md:gap-8">
                        <div className={`flex-1 ${getWinner(race.result, race.teamA, race.teamB) === race.teamA ? 'text-green-600' : 'text-red-600'}`}>
                          <p className="font-semibold mb-1 text-sm md:text-base">{race.teamA}</p>
                          <div className="flex justify-center gap-1 md:gap-3">
                            {race.result!.slice(0, 3).map((pos, i) => (
                              <span key={i} className="bg-gray-100 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-sm">
                                {pos}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-gray-400 font-bold px-1 md:px-2">VS</div>
                        <div className={`flex-1 ${getWinner(race.result, race.teamA, race.teamB) === race.teamB ? 'text-green-600' : 'text-red-600'}`}>
                          <p className="font-semibold mb-1 text-sm md:text-base">{race.teamB}</p>
                          <div className="flex justify-center gap-1 md:gap-3">
                            {race.result!.slice(3).map((pos, i) => (
                              <span key={i} className="bg-gray-100 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-sm">
                                {pos}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 italic text-sm">
                      No result yet
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jump to Results button */}
      {completedRaces.length > 0 && (
        <button
          onClick={scrollToResults}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2 group z-10"
        >
          <span>View Race Results</span>
          <svg 
            className="w-4 h-4 transition-transform group-hover:translate-y-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 14l-7 7m0 0l-7-7m7 7V3" 
            />
          </svg>
        </button>
      )}

      {/* Add Back to Top button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed right-4 bottom-4 bg-gray-600 text-white w-12 h-12 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-10 flex items-center justify-center"
          aria-label="Back to top"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 10l7-7m0 0l7 7m-7-7v18" 
            />
          </svg>
        </button>
      )}
    </div>
  );
}

