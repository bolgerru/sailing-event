import { Race } from '../types/race';

// Utility function to calculate average speed based on race results
export function calculateAverageSpeed(race: Race): number {
  if (!race.result || race.result.length === 0) {
    return 0;
  }
  
  const totalDistance = race.result.reduce((acc, curr) => acc + curr, 0);
  const averageSpeed = totalDistance / race.result.length;
  
  return averageSpeed;
}

// Utility function to determine the winner of a race
export function determineWinner(race: Race): string | null {
  if (!race.result || race.result.length === 0) {
    return null;
  }
  
  const maxScore = Math.max(...race.result);
  const winnerIndex = race.result.indexOf(maxScore);
  
  return winnerIndex === 0 ? race.teamA : race.teamB;
}

// Utility function to calculate the total points for a team based on race results
export function calculateTotalPoints(team: string, races: Race[]): number {
  return races.reduce((total, race) => {
    if (race.teamA === team && race.result) {
      return total + (race.result[0] || 0);
    } else if (race.teamB === team && race.result) {
      return total + (race.result[1] || 0);
    }
    return total;
  }, 0);
}