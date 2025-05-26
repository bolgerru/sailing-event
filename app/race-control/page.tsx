import { redirect } from 'next/navigation';
import { auth, clerkClient as getClerkClient } from '@clerk/nextjs/server';
import { getRaces } from '@/lib/data';
import { Suspense } from 'react';
import { RaceControl } from './RaceControl';

export default async function RaceControlPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in?redirect_url=/race-control');
  }

  const clerkClient = await getClerkClient();
  const user = await clerkClient.users.getUser(userId);

  const isAdmin = user.publicMetadata?.isAdmin === true;

  if (!isAdmin) {
    redirect('/unauthorized');
  }

  const races = await getRaces();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Race Control: Start Races</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <RaceControl races={races} />
      </Suspense>
    </div>
  );
}
