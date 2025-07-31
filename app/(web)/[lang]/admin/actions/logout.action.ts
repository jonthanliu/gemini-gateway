"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const AUTH_COOKIE_NAME = "auth_token";

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);

  // Invalidate the cache for the admin section to ensure fresh data on next login.
  revalidatePath("/admin");

  // Redirecting to the admin page will trigger a re-evaluation of the layout's
  // authentication logic, which will then correctly display the login form.
  // This effectively serves as the "page refresh".
  redirect("/admin");
}
