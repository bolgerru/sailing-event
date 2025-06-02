'use client';

import { useEffect, useState } from 'react';

export default function Footer() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Simple mobile detection based on user agent
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      setIsMobile(/android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent.toLowerCase()));
    };
    
    checkMobile();
    
    // Recheck on resize in case of orientation change
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const linkedInUrl = isMobile
    ? "https://www.linkedin.com/in/russell-bolger-87343524b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app"
    : "https://www.linkedin.com/in/russell-bolger-87343524b/";

  return (
    <footer className="bg-gray-100 mt-auto py-6 border-t border-gray-200">
      <div className="container mx-auto px-4 text-center">
        <p className="text-gray-600">
          Created by{' '}
          <a 
            href={linkedInUrl}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium underline"
          >
            Russell Bolger
          </a>
        </p>
      </div>
    </footer>
  );
}