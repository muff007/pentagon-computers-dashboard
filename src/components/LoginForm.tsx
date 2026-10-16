"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { signIn, type LoginState } from "@/lib/actions/auth";
import { button, field, label } from "@/lib/ui";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signIn,
    {},
  );
  const [visible, setVisible] = useState(false);

  // replace() so Back does not return to a login form that is already spent.
  useEffect(() => {
    if (state.ok) window.location.replace("/products");
  }, [state.ok]);

  const busy = pending || Boolean(state.ok);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="username" className={label}>
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          required
          className={`${field} mt-1.5`}
        />
      </div>

      <div>
        <label htmlFor="password" className={label}>
          Password
        </label>
        <div className="relative mt-1.5">
          <input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${field} pr-10`}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-card text-subtle hover:bg-ink-100 hover:text-ink-900"
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className={`${button("primary", "lg")} w-full`}
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
