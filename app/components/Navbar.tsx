"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { useAdmin } from "@/lib/hooks/useAdmin";

export default function Navbar() {
  const isAdmin = useAdmin();

  return (
    <nav className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
      <div className="text-xl font-bold">
        <Link href="/">Sailing Event</Link>
      </div>

      <div className="flex items-center space-x-6">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <Link href="/schedule" className="hover:underline">
          Schedule
        </Link>
        <Link href="/results" className="hover:underline">
          Results
        </Link>
        <SignedIn>
          {isAdmin && (
            <Link href="/admin" className="hover:underline">
              Admin
            </Link>
          )}
        </SignedIn>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="bg-white text-blue-600 px-3 py-1 rounded hover:bg-gray-100">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </nav>
  );
}
