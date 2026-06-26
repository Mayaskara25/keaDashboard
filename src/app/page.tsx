import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "STUDENT") redirect("/dashboard");
  redirect("/admin/class");
}
