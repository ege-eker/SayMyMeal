"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/restaurants", label: "Restaurants" },
    { href: "/", label: "Main Page" }
  ];

  return (
    <aside className="w-64 h-screen bg-gray-800 text-white flex flex-col">
      <div className="px-6 py-4 font-bold text-xl border-b border-gray-700">
        Admin Panel
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`block px-4 py-2 rounded-lg ${
              pathname.startsWith(link.href)
                ? "bg-purple-600"
                : "hover:bg-gray-700"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}