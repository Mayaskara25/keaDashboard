"use client";

import { ThemeToggle } from "./theme-toggle";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

interface HeaderProps {
  title?: string;
  userName?: string;
  banner?: React.ReactNode;
}

export function Header({ title, userName, banner }: HeaderProps) {
  return (
    <header className="h-12 flex items-center justify-between px-5 border-b border-[var(--border)] bg-[var(--bg)] sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {banner ?? (
          <span className="text-[14px] font-semibold text-[var(--text)]">
            {title ?? ""}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {userName && (
          <span className="text-[13px] text-[var(--text-muted)]">{userName}</span>
        )}
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--danger)] transition-colors"
          aria-label="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
