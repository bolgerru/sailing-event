'use client';

import { useEffect, useState } from 'react';

type LeaderboardEntry = {
  place: number;
  team: string;
  wins: number;
  totalRaces: number;
  winPercentage: number;
};

export default function ResultsPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch leaderboard: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: LeaderboardEntry[]) => {
        setLeaderboard(data);
      })
      .catch((err: Error) => {
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <div className="p-4 mx-4 bg-red-50 rounded-lg text-red-600 text-center shadow-sm">
        Error: {error}
      </div>
    );
  }

  if (!leaderboard) {
    return (
      <div className="p-4 text-center text-gray-600 animate-pulse">
        Loading leaderboard...
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-gray-800">
        Leaderboard
      </h1>
      
      {/* Only show one view based on screen size */}
      {typeof window !== 'undefined' && window.innerWidth < 768 ? (
        // Mobile view
        <div className="space-y-4">
          {leaderboard.map(({ place, team, wins, totalRaces, winPercentage }) => (
            <div 
              key={team} 
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="flex-none w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                  {place}
                </span>
                <h2 className="font-semibold text-gray-800">{team}</h2>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Wins</div>
                  <div className="font-semibold text-gray-800">{wins}</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Races</div>
                  <div className="font-semibold text-gray-800">{totalRaces}</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Win %</div>
                  <div className="font-semibold text-gray-800">{winPercentage.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Desktop view
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Place</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Team</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Wins</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Total Races</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Win %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaderboard.map(({ place, team, wins, totalRaces, winPercentage }) => (
                <tr 
                  key={team} 
                  className="bg-white hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 rounded-full font-semibold">
                      {place}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">{team}</td>
                  <td className="px-6 py-4 text-gray-600">{wins}</td>
                  <td className="px-6 py-4 text-gray-600">{totalRaces}</td>
                  <td className="px-6 py-4 text-gray-600">{winPercentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}