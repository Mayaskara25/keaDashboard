import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentSidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <StudentSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header userName={session.user.name} />
        <main className="flex-1 overflow-y-auto bg-[var(--bg-subtle)] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
