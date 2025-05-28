import React, { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../lib/blob-storage';

const Leaderboard: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const data = await fetchLeaderboard();
        setLeaderboardData(data);
      } catch (err) {
        setError('Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h2>Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th>Wins</th>
            <th>Total Races</th>
            <th>Win Percentage</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {leaderboardData.map((team) => (
            <tr key={team.team}>
              <td>{team.team}</td>
              <td>{team.wins}</td>
              <td>{team.totalRaces}</td>
              <td>{team.winPercentage.toFixed(2)}%</td>
              <td>{team.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;