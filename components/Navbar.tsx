"use client";

import Link from "next/link";
import { useState } from "react";
import {
  UserButton,
  SignInButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { useAdmin } from "@/lib/hooks/useAdmin";

export default function Navbar() {
  const isAdmin = useAdmin();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop navigation */}
          <div className="hidden md:flex space-x-4">
            <Link 
              href="/" 
              className="px-4 py-2 text-gray-700 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Teams
            </Link>
            <Link 
              href="/schedule" 
              className="px-4 py-2 text-gray-700 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Schedule
            </Link>
            <Link 
              href="/results" 
              className="px-4 py-2 text-gray-700 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Leaderboard
            </Link>
            
            <SignedIn>
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="px-4 py-2 text-gray-700 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  Admin
                </Link>
              )}
            </SignedIn>
          </div>

          {/* Auth buttons */}
          <div className="flex items-center space-x-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-6 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm hover:shadow">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "rounded-full"
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} py-4`}>
          <div className="flex flex-col space-y-2">
            <Link 
              href="/" 
              className="px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Teams
            </Link>
            <Link 
              href="/schedule" 
              className="px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Schedule
            </Link>
            <Link 
              href="/results" 
              className="px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Leaderboard
            </Link>
            <SignedIn>
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
}