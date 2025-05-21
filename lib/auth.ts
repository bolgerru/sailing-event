import { currentUser } from "@clerk/nextjs/server";

export async function isUserAdmin() {
  const user = await currentUser();
  if (!user) return false;
  return user.publicMetadata?.isAdmin === true;
}