'use client';

import { useState, useEffect } from 'react';

type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  result: number[] | null;
  boats: {
    teamA: string;
    teamB: string;
  };
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

export default function HomePage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/schedule')
      .then(res => res.json())
      .then((data: Race[]) => {
        setRaces(data);
        // Extract unique teams
        const uniqueTeams = Array.from(
          new Set(data.flatMap(race => [race.teamA, race.teamB]))
        ).sort();
        setTeams(uniqueTeams);
        setLoading(false);
      });
  }, []);

  const filteredRaces = selectedTeam
    ? races.filter(race => race.teamA === selectedTeam || race.teamB === selectedTeam)
    : races;

  const completedRaces = filteredRaces.filter(race => isValidResult(race.result));
  const upcomingRaces = filteredRaces.filter(race => !isValidResult(race.result));

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 text-gray-800">
        Team Schedule & Results
      </h1>

      {/* Team selector */}
      <div className="flex justify-center mb-8">
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="w-full max-w-xs px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Teams</option>
          {teams.map(team => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>
      </div>

      {filteredRaces.length === 0 && (
        <p className="text-center text-gray-500">
          {selectedTeam ? `No races found for ${selectedTeam}.` : 'No races scheduled yet.'}
        </p>
      )}

      {/* Upcoming Races Section */}
      {upcomingRaces.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">
            {selectedTeam ? `${selectedTeam}'s Upcoming Races` : 'Next Races'}
          </h2>
          <div className="grid gap-4">
            {upcomingRaces.map((race) => (
              <div 
                key={race.raceNumber}
                className="bg-white rounded-lg border p-4 shadow-sm"
              >
                <div className="text-sm text-gray-500 mb-2">Race {race.raceNumber}</div>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium">{race.teamA}</div>
                    <div className="text-sm text-gray-500">{race.boats?.teamA}</div>
                  </div>
                  <div className="mx-4 text-gray-400">vs</div>
                  <div className="flex-1 text-right">
                    <div className="font-medium">{race.teamB}</div>
                    <div className="text-sm text-gray-500">{race.boats?.teamB}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Races Section */}
      {completedRaces.length > 0 && (
        <div className="space-y-4 mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700">
            {selectedTeam ? `${selectedTeam}'s Results` : 'Race Results'}
          </h2>
          <div className="grid gap-4">
            {completedRaces.map((race) => (
              <div 
                key={race.raceNumber}
                className="bg-white rounded-lg border p-4 shadow-sm"
              >
                <div className="text-sm text-gray-500 mb-2">Race {race.raceNumber}</div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex-1">
                    <div className="font-medium">{race.teamA}</div>
                    <div className="text-sm text-gray-500">{race.boats?.teamA}</div>
                  </div>
                  <div className="mx-4 text-gray-400">vs</div>
                  <div className="flex-1 text-right">
                    <div className="font-medium">{race.teamB}</div>
                    <div className="text-sm text-gray-500">{race.boats?.teamB}</div>
                  </div>
                </div>
                {race.result && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Points</div>
                        <div className="font-medium">
                          {race.result.slice(0, 3).reduce((a, b) => a + b, 0)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Points</div>
                        <div className="font-medium">
                          {race.result.slice(3).reduce((a, b) => a + b, 0)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-center text-sm font-medium text-green-600">
                      Winner: {getWinner(race.result, race.teamA, race.teamB)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
