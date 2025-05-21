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
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (!leaderboard) {
    return <div className="p-4">Loading leaderboard...</div>;
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2 text-left">Place</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Team</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Wins</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Total Races</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Win %</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map(({ place, team, wins, totalRaces, winPercentage }) => (
            <tr key={team} className="odd:bg-white even:bg-gray-50">
              <td className="border border-gray-300 px-4 py-2">{place}</td>
              <td className="border border-gray-300 px-4 py-2">{team}</td>
              <td className="border border-gray-300 px-4 py-2">{wins}</td>
              <td className="border border-gray-300 px-4 py-2">{totalRaces}</td>
              <td className="border border-gray-300 px-4 py-2">{winPercentage.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}