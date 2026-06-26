"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  FlaskConical,
  FileText,
  Zap,
  AlertCircle,
  BarChart2,
  BookOpen,
  Upload,
  CheckSquare,
  LucideIcon,
} from "lucide-react";

interface NavItemDef {
  href: string;
  icon: LucideIcon;
  label: string;
}

const STUDENT_ITEMS: NavItemDef[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/test/custom", icon: FlaskConical, label: "Custom Test" },
  { href: "/test/pyq", icon: FileText, label: "PYQ Papers" },
  { href: "/test/adaptive", icon: Zap, label: "Adaptive Test" },
  { href: "/mistakes", icon: AlertCircle, label: "Mistakes" },
  { href: "/progress", icon: BarChart2, label: "Progress" },
  { href: "/resources", icon: BookOpen, label: "Resources" },
];

const ADMIN_ITEMS: NavItemDef[] = [
  { href: "/admin/class", icon: BarChart2, label: "Class Analytics" },
  { href: "/admin/upload", icon: Upload, label: "Upload Materials" },
  { href: "/admin/questions", icon: CheckSquare, label: "Review Questions" },
];

function NavItem({ href, icon: Icon, label }: NavItemDef) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 px-3 py-2 rounded-[6px] text-[14px] font-medium transition-colors",
        active
          ? "bg-[var(--accent)] text-white"
          : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]"
      )}
    >
      <Icon size={16} />
      <span>{label}</span>
    </Link>
  );
}

function SidebarShell({ items, logo }: { items: NavItemDef[]; logo: string }) {
  return (
    <aside className="w-56 h-screen sticky top-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg)] shrink-0">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <span className="text-[16px] font-bold text-[var(--text)]">{logo}</span>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {items.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  );
}

export function StudentSidebar() {
  return <SidebarShell items={STUDENT_ITEMS} logo="KEA" />;
}

export function AdminSidebar() {
  return <SidebarShell items={ADMIN_ITEMS} logo="KEA Admin" />;
}
