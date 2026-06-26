import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;

  // Always allow auth API and static assets
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return;
  }

  // Login page: redirect authenticated users to their home
  if (pathname === "/login") {
    if (session) {
      const dest = role === "STUDENT" ? "/dashboard" : "/admin/class";
      return Response.redirect(new URL(dest, req.url));
    }
    return;
  }

  // All other routes require authentication
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // Role guard: admin routes require TEACHER or ADMIN
  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/student/");
  if (isAdminRoute && role === "STUDENT") {
    return Response.redirect(new URL("/dashboard", req.url));
  }

  // Role guard: student routes require STUDENT
  const isStudentRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/test") ||
    pathname.startsWith("/mistakes") ||
    pathname.startsWith("/progress") ||
    pathname.startsWith("/resources");
  if (isStudentRoute && role !== "STUDENT") {
    return Response.redirect(new URL("/admin/class", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
