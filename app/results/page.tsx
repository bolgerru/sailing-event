"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TeamStats {
  team: string;
  wins: number;
  totalRaces: number;
  points: number;
  winPercentage: number;
  place: number;
  league: string;
  tiebreakNote?: string;
}

interface LeagueLeaderboards {
  [key: string]: TeamStats[];
}

export default function ResultsPage() {
  const [leaderboards, setLeaderboards] = useState<LeagueLeaderboards>({});
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        const data = await res.json();
        setLeaderboards(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse text-gray-500">Loading leaderboards...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg shadow">
          {error}
        </div>
      </div>
    );
  }

  if (Object.keys(leaderboards).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-xl font-semibold text-gray-600">No Results Yet</div>
        <p className="text-gray-500 text-center max-w-md">
          Leaderboards will appear here once races have been completed and scored.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {Object.entries(leaderboards).map(([leagueName, teams]) => (
        <div key={leagueName} className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h2 className="text-2xl font-bold text-white capitalize">
              {leagueName === 'main' ? 'Overall' : `${leagueName} League`}
            </h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Place
                    </th>
                    <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-4 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wins
                    </th>
                    <th className="px-4 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Races
                    </th>
                    <th className="px-4 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Win %
                    </th>
                    <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teams.map((team, idx) => (
                    <tr 
                      key={team.team}
                      className={`
                        hover:bg-blue-50 transition-colors
                        ${team.place === 1 ? 'bg-yellow-50' : ''}
                        ${team.place === 2 ? 'bg-gray-50' : ''}
                        ${team.place === 3 ? 'bg-orange-50' : ''}
                      `}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`
                          inline-flex items-center justify-center w-8 h-8 rounded-full 
                          ${team.place === 1 ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${team.place === 2 ? 'bg-gray-100 text-gray-800' : ''}
                          ${team.place === 3 ? 'bg-orange-100 text-orange-800' : ''}
                          ${team.place > 3 ? 'bg-blue-50 text-blue-800' : ''}
                        `}>
                          {team.place}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                        {team.team}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {team.wins}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {team.totalRaces}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                        {team.winPercentage.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {team.tiebreakNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}