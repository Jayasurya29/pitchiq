import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function AppLayout() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[color:var(--color-bg)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={18} className="animate-spin text-stone-400" />
          </div>
        ) : (
          <div className="mx-auto max-w-6xl px-8 py-8">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}