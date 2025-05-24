"use client";

import { useEffect, useState } from "react";
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

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

function getPlaceStyles(place: number): { bg: string; text: string } {
  switch (place) {
    case 1:
      return { bg: 'bg-yellow-50', text: 'text-yellow-800' };
    case 2:
      return { bg: 'bg-gray-50', text: 'text-gray-800' };
    case 3:
      return { bg: 'bg-orange-50', text: 'text-orange-800' };
    default:
      return { bg: 'bg-blue-50', text: 'text-blue-600' };
  }
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
      <div className="p-4 text-center text-gray-600 animate-pulse">
        Loading leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 mx-4 bg-red-50 rounded-lg text-red-600 text-center shadow-sm">
        Error: {error}
      </div>
    );
  }

  if (Object.keys(leaderboards).length === 0) {
    return (
      <div className="p-4 text-center text-gray-600">
        No results available yet.
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-8">
      {Object.entries(leaderboards).map(([leagueName, teams]) => (
        <div key={leagueName} className="space-y-4">
          <h2 className="text-2xl font-bold text-center text-gray-800 capitalize">
            {leagueName === 'main' ? 'Overall' : `${leagueName} League`}
          </h2>

          {/* Mobile view */}
          <div className="md:hidden space-y-4">
            {teams.map((team) => (
              <div 
                key={team.team} 
                className={`${getPlaceStyles(team.place).bg} rounded-xl p-4 shadow-sm border border-gray-100`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`flex-none w-8 h-8 ${getPlaceStyles(team.place).bg} ${getPlaceStyles(team.place).text} rounded-full flex items-center justify-center font-semibold`}>
                    {team.place}
                  </span>
                  <h2 className="font-semibold text-gray-800">{team.team}</h2>
                  {team.tiebreakNote && (
                    <button
                      data-tooltip-id={`tooltip-${team.team}-${leagueName}`}
                      className="ml-2 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      Tie Info
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-gray-600">Wins</div>
                    <div className="font-semibold text-gray-800">{team.wins}</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-gray-600">Races</div>
                    <div className="font-semibold text-gray-800">{team.totalRaces}</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-gray-600">Win %</div>
                    <div className="font-semibold text-gray-800">{team.winPercentage.toFixed(1)}%</div>
                  </div>
                </div>
                {team.tiebreakNote && (
                  <Tooltip id={`tooltip-${team.team}-${leagueName}`} place="bottom">
                    {team.tiebreakNote}
                  </Tooltip>
                )}
              </div>
            ))}
          </div>

          {/* Desktop view */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Place</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Team</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Wins</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Total Races</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Win %</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tie Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teams.map((team) => (
                  <tr 
                    key={team.team} 
                    className={`${getPlaceStyles(team.place).bg} hover:bg-opacity-75 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 ${getPlaceStyles(team.place).bg} ${getPlaceStyles(team.place).text} rounded-full font-semibold`}>
                        {team.place}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{team.team}</td>
                    <td className="px-6 py-4 text-gray-600">{team.wins}</td>
                    <td className="px-6 py-4 text-gray-600">{team.totalRaces}</td>
                    <td className="px-6 py-4 text-gray-600">{team.winPercentage.toFixed(1)}%</td>
                    <td className="px-6 py-4">
                      {team.tiebreakNote && (
                        <button
                          data-tooltip-id={`tooltip-${team.team}-${leagueName}`}
                          className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          View
                        </button>
                      )}
                      <Tooltip id={`tooltip-${team.team}-${leagueName}`} place="left">
                        {team.tiebreakNote}
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}