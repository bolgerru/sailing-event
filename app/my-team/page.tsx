'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function MyTeamPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [selectedTeam, setSelectedTeam] = useState('');
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const userTeam = user.publicMetadata?.team as string | undefined;

    if (userTeam) {
      router.push('/my-team/dashboard'); // Redirect if team already selected
    } else {
      // Fetch list of teams from your API
      fetch('/api/teams')
        .then(res => res.json())
        .then(data => setAvailableTeams(data))
        .catch(console.error);
    }
  }, [isLoaded, user, router]);

  const handleSelectTeam = async () => {
    if (!selectedTeam || !user) return;

    const res = await fetch('/api/update-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, team: selectedTeam }),
    });

    if (res.ok) {
      router.push('/my-team/dashboard');
    } else {
      console.error('Failed to update team');
      // Optionally show an error to the user here
    }
  };

  if (!isLoaded || availableTeams.length === 0) return <p>Loading...</p>;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Select Your Team</h1>
      <select
        value={selectedTeam}
        onChange={(e) => setSelectedTeam(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      >
        <option value="">-- Choose a team --</option>
        {availableTeams.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
      <button
        onClick={handleSelectTeam}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={!selectedTeam}
      >
        Confirm Team
      </button>
    </div>
  );
}
