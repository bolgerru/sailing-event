import { headers } from 'next/headers';

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

async function getRaces() {
  const headersList = await headers();
  const host = headersList.get('host');
  const protocol = process?.env?.NODE_ENV === 'development' ? 'http' : 'https';
  const res = await fetch(`${protocol}://${host}/api/schedule`, {
    cache: 'no-store'
  });
  if (!res.ok) return [];
  return res.json() as Promise<Race[]>;
}

export default async function SchedulePage() {
  const races = await getRaces();
  
  // Separate races into upcoming and completed
  const completedRaces = races.filter(race => isValidResult(race.result));
  const upcomingRaces = races.filter(race => !isValidResult(race.result));

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 text-gray-800">
        Schedule & Results
      </h1>

      {races.length === 0 && (
        <p className="text-center text-gray-500">No races scheduled yet.</p>
      )}

      {/* Upcoming Races Section */}
      {upcomingRaces.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Next Races</h2>
          <div className="grid gap-4">
            {upcomingRaces.map((race) => (
              <div 
                key={race.raceNumber}
                className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow"
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
                  </div>
                </div>

                <div className="p-3 bg-gray-50">
                  <p className="text-center text-gray-500 italic text-sm">
                    No result yet
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Races Section */}
      {completedRaces.length > 0 && (
        <div className="space-y-4 mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700">Race Results</h2>
          <div className="grid gap-4">
            {completedRaces.map((race) => (
              <div 
                key={race.raceNumber}
                className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow opacity-90"
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
                  </div>
                </div>

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
    </div>
  );
}

