"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export function useAdmin() {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      setIsAdmin(user.publicMetadata?.isAdmin === true);
    }
  }, [user]);

  return isAdmin;
}