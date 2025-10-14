import Link from "next/link";

export default function RestaurantsUserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-purple-600">
          🍔 Voice Ordering System
        </Link>

        {/* Menü */}
        <div className="space-x-6">
          <Link href="/restaurants" className="text-gray-700 hover:text-purple-600 font-medium">
            Restaurants
          </Link>
          <Link href="/orders" className="text-gray-700 hover:text-purple-600 font-medium">
            Orders
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 container mx-auto p-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t text-center py-4 text-sm text-gray-500">
        © {new Date().getFullYear()} Voice Ordering System
      </footer>
    </div>
  );
}
