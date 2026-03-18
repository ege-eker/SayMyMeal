"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { APP_NAME } from "@/lib/config";

export default function LandingPage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 text-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold">{APP_NAME}</span>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-purple-200">Hi, {user.name}</span>
              {user.role === "OWNER" ? (
                <Link
                  href="/dashboard"
                  className="bg-white text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/orders"
                  className="bg-white text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100"
                >
                  My Orders
                </Link>
              )}
              <button
                onClick={logout}
                className="text-sm text-purple-200 hover:text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-purple-200 hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-white text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center text-center px-6 py-24">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Grow Your Restaurant<br />With Online Ordering
        </h1>
        <p className="text-xl text-purple-200 mb-10 max-w-2xl">
          Join our platform to reach more customers. Set up your restaurant menu,
          accept online orders, and manage everything from a simple dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/register?role=OWNER"
            className="bg-white text-purple-700 px-8 py-4 rounded-lg text-lg font-semibold shadow-lg hover:bg-gray-100 transition"
          >
            Add Your Restaurant
          </Link>
          <Link
            href="/register"
            className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition"
          >
            Order as Customer
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
        <div className="bg-white/10 rounded-xl p-6 backdrop-blur">
          <h3 className="text-xl font-bold mb-3">Easy Setup</h3>
          <p className="text-purple-200">
            Create your restaurant profile, add menus and foods in minutes.
            Your custom URL is ready instantly.
          </p>
        </div>
        <div className="bg-white/10 rounded-xl p-6 backdrop-blur">
          <h3 className="text-xl font-bold mb-3">Online Orders</h3>
          <p className="text-purple-200">
            Customers can browse your menu, add items to cart, and checkout
            with delivery address.
          </p>
        </div>
        <div className="bg-white/10 rounded-xl p-6 backdrop-blur">
          <h3 className="text-xl font-bold mb-3">Order Management</h3>
          <p className="text-purple-200">
            Track and manage orders from your dashboard.
            Update status and keep customers informed.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-purple-300 text-sm">
        {APP_NAME} &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
