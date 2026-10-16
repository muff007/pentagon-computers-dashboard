"use server";

import { redirect } from "next/navigation";
import { credentialsValid, endSession, startSession } from "@/lib/session";

export type LoginState = { error?: string; ok?: boolean };

/** Slows down repeated wrong guesses without needing a store. */
function pause() {
  return new Promise((resolve) => setTimeout(resolve, 400));
}

export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter both the username and the password." };
  }

  if (!credentialsValid(username, password)) {
    await pause();
    // Deliberately does not say which half was wrong.
    return { error: "Those credentials are not right." };
  }

  await startSession();

  // Deliberately not redirect(). A server-side redirect is followed by the
  // router as an RSC fetch, and if /products then fails to render — an
  // unreachable database, say — the navigation is abandoned and the form sits
  // on "Signing in…" forever. The client does a full navigation instead, so a
  // failure lands on the dashboard error page with a retry.
  return { ok: true };
}

export async function signOut(): Promise<never> {
  await endSession();
  redirect("/login");
}
