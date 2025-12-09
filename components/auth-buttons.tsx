"use client";

import { signIn, signOut } from "next-auth/react";

type ButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "ghost";
};

function ActionButton({ children, onClick, variant = "primary" }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-500"
      : "border border-blue-200 text-blue-700 hover:border-blue-400 hover:text-blue-900";

  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export function SignInButton() {
  return (
    <ActionButton
      onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
    >
      <svg
        viewBox="0 0 48 48"
        className="h-4 w-4"
        aria-hidden
        focusable="false"
      >
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6 1.54 7.38 2.83l5.4-5.26C33.78 3.41 29.47 1.5 24 1.5 14.96 1.5 7.21 6.98 3.92 14.58l6.59 5.12C12.03 13.23 17.43 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.5 24.5c0-1.54-.14-3.02-.39-4.44H24v8.39h12.7c-.55 2.84-2.17 5.24-4.62 6.86l7.12 5.52C43.84 36.89 46.5 31.25 46.5 24.5z"
        />
        <path
          fill="#FBBC05"
          d="M10.51 28.46a14.5 14.5 0 0 1-.76-4.46c0-1.55.27-3.05.76-4.46l-6.59-5.12A23.93 23.93 0 0 0 .5 24a23.93 23.93 0 0 0 3.42 9.58l6.59-5.12z"
        />
        <path
          fill="#34A853"
          d="M24 47.5c6.48 0 11.9-2.13 15.86-5.75l-7.12-5.52c-2 1.35-4.56 2.15-8.74 2.15-6.57 0-11.97-3.72-13.89-9.18l-6.59 5.12C7.21 41.02 14.96 47.5 24 47.5z"
        />
        <path fill="none" d="M0 0h48v48H0z" />
      </svg>
      Sign in with Google
    </ActionButton>
  );
}

export function SignOutButton() {
  return (
    <ActionButton
      onClick={() =>
        signOut({
          callbackUrl: "/auth",
        })
      }
      variant="ghost"
    >
      Sign out
    </ActionButton>
  );
}
