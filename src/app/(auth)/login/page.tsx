"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-subtle)]">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[360px]">
          <div className="mb-8">
            <h1 className="text-[22px] font-bold text-[var(--text)]">KEA Platform</h1>
            <p className="text-[14px] text-[var(--text-muted)] mt-1">
              Sign in to your account
            </p>
          </div>

          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] p-6 shadow-[var(--shadow)]">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              {error && (
                <p className="text-[13px] text-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 rounded-[6px]">
                  {error}
                </p>
              )}

              <Button type="submit" loading={loading} className="mt-2 w-full">
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
