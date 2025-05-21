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
    result.every((pos) => typeof pos === 'number' && pos > 0) &&
    new Set(result).size === 6
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Schedule & Results
      </h1>

      {races.length === 0 && (
        <p className="text-center text-gray-500">No races scheduled yet.</p>
      )}

      <div className="grid gap-6">
        {races.map((race) => (
          <div 
            key={race.raceNumber}
            className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center border-b border-gray-100">
              <div className="w-24 h-24 flex items-center justify-center bg-blue-500 text-white">
                <span className="text-4xl font-bold">
                  {race.raceNumber}
                </span>
              </div>
              
              <div className="flex-1 p-4">
                <div className="text-lg font-semibold text-center">
                  <span className="text-blue-600">{race.teamA}</span>
                  <span className="mx-2 text-gray-400">vs</span>
                  <span className="text-blue-600">{race.teamB}</span>
                </div>
                <div className="text-sm text-gray-500 text-center mt-1">
                  ({race.boats.teamA}) vs ({race.boats.teamB})
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50">
              {isValidResult(race.result) ? (
                <div className="text-center space-y-3">
                  <div className="flex justify-center items-center gap-8">
                    <div className={`flex-1 ${getWinner(race.result, race.teamA, race.teamB) === race.teamA ? 'text-green-600' : 'text-red-600'}`}>
                      <p className="font-semibold mb-2">{race.teamA}</p>
                      <div className="flex justify-center gap-3">
                        {race.result!.slice(0, 3).map((pos, i) => (
                          <span key={i} className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center">
                            {pos}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-gray-400 font-bold">VS</div>
                    <div className={`flex-1 ${getWinner(race.result, race.teamA, race.teamB) === race.teamB ? 'text-green-600' : 'text-red-600'}`}>
                      <p className="font-semibold mb-2">{race.teamB}</p>
                      <div className="flex justify-center gap-3">
                        {race.result!.slice(3).map((pos, i) => (
                          <span key={i} className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center">
                            {pos}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 italic">
                  No result yet
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

