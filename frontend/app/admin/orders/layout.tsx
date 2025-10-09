import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function AdminOrdersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sol navigation bar */}
      <Sidebar />

      {/* Sağ içerik alanı */}
      <div className="flex-1 flex flex-col">
        {/* Header (üst bar) */}
        <Header />

        {/* Sayfa içeriği */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}