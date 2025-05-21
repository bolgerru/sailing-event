import { redirect } from 'next/navigation';
import { auth, clerkClient as getClerkClient } from '@clerk/nextjs/server';
import { getRaces } from '@/lib/data';
import AdminResultsForm from './AdminResultsForm';

export default async function AdminPage() {
  const { userId } = await auth();

  if (!userId) {
    // Not signed in, redirect to sign in
    redirect('/sign-in?redirect_url=/admin');
  }

  const clerkClient = await getClerkClient();
  const user = await clerkClient.users.getUser(userId);

  const isAdmin = user.publicMetadata?.isAdmin === true;

  if (!isAdmin) {
    // Not admin, redirect somewhere safe or show 404 page
    redirect('/unauthorized'); // or redirect to home '/', or throw notFound()
  }

  const races = await getRaces();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin: Enter Race Results</h1>
      <AdminResultsForm races={races} />
    </div>
  );
}
