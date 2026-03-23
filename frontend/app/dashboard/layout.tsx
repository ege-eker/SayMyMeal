"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?returnUrl=/dashboard");
    } else if (!loading && user && user.role !== "OWNER") {
      router.push("/");
    }
  }, [loading, user, router]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!user || user.role !== "OWNER") return null;

  const sidebarContent = (
    <>
      <div className="px-6 py-4 font-bold text-xl border-b border-stone-700">
        Dashboard
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        <Link
          href="/dashboard"
          onClick={() => setSidebarOpen(false)}
          className={`block px-4 py-2 rounded-lg ${
            pathname === "/dashboard" ? "bg-amber-600" : "hover:bg-stone-700"
          }`}
        >
          My Restaurants
        </Link>
        <Link
          href="/"
          onClick={() => setSidebarOpen(false)}
          className="block px-4 py-2 rounded-lg hover:bg-stone-700"
        >
          Home
        </Link>
      </nav>
      <div className="px-4 py-4 border-t border-stone-700">
        <p className="text-sm text-gray-400 mb-2">{user.name}</p>
        <button
          onClick={() => { logout(); router.push("/"); }}
          className="text-sm text-red-400 hover:text-red-300"
        >
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-stone-800 text-white flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full bg-stone-800 text-white flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-lg">Restaurant Dashboard</h1>
          </div>
          <span className="text-gray-600 text-sm truncate ml-2">{user.email}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
