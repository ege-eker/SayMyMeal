import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function RestaurantsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Sol Menü */}
      <Sidebar />

      {/* Ana Alan */}
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 bg-gray-100 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}