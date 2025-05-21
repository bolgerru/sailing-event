"use client";

import Link from "next/link";
import {
  UserButton,
  SignInButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { useAdmin } from "@/lib/hooks/useAdmin";

export default function Navbar() {
  const isAdmin = useAdmin();

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between">
          <div className="flex space-x-4">
            <Link href="/" className="py-4 px-2 hover:text-blue-500">
              Home
            </Link>
            <Link href="/schedule" className="py-4 px-2 hover:text-blue-500">
              Schedule
            </Link>
            <Link href="/results" className="py-4 px-2 hover:text-blue-500">
              Results
            </Link>
            <SignedIn>
              {isAdmin && (
                <Link href="/admin" className="py-4 px-2 hover:text-blue-500">
                  Admin
                </Link>
              )}
            </SignedIn>
          </div>
          <div className="flex items-center space-x-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
}
