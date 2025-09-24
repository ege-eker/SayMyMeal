"use client";

export default function Header() {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white border-b shadow-sm">
      <h1 className="font-bold text-lg">🍴 Restoran Yönetim Paneli</h1>
      <div className="flex items-center space-x-4">
        <span className="text-gray-600">Admin</span>
        <img
          src="https://i.pravatar.cc/40"
          alt="profile"
          className="rounded-full w-10 h-10"
        />
      </div>
    </header>
  );
}