import { Race, EstimatedStartTimeProps } from '../types';

export function EstimatedStartTime({ 
  race, 
  lastStartedRace, 
  timeBetweenRaces 
}: EstimatedStartTimeProps) {
  const estimatedStart = new Date(lastStartedRace.startTime!).getTime() + timeBetweenRaces;
  const now = new Date().getTime();
  const minutesUntilStart = Math.max(0, Math.round((estimatedStart - now) / 60000));

  return (
    <div className="text-sm text-gray-600">
      {minutesUntilStart > 0 ? (
        `Estimated start in ~${minutesUntilStart} minutes`
      ) : (
        'Starting soon'
      )}
    </div>
  );
}