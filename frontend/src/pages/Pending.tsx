import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Inbox } from "lucide-react";
import PendingList from "@/components/outreach/PendingList";
import OutreachDetail from "@/components/outreach/OutreachDetail";
import type { OutreachRecord } from "@/api/outreach";
import { getPending } from "@/api/outreach";

export default function Pending() {
  const { data: records = [], isLoading, error } = useQuery<OutreachRecord[]>({
    queryKey: ["pending"],
    queryFn: getPending,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Keep a selected record visible across refetches; auto-select first when
  // landing on the page if nothing is selected yet.
  useEffect(() => {
    if (records.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId === null || !records.find((r) => r.id === selectedId)) {
      setSelectedId(records[0].id);
    }
  }, [records, selectedId]);

  const selected = records.find((r) => r.id === selectedId) || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-stone-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading pending outreach...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
        Failed to load pending outreach. Check that the backend is running.
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Inbox className="w-10 h-10 text-stone-200 mb-3" />
        <p className="text-sm text-stone-500">No pending outreach</p>
        <p className="text-xs text-stone-400 mt-1">
          Run a research from the Research page to generate one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-6 border-t border-stone-200 bg-white">
      {/* Left: list of pending records */}
      <aside className="w-80 lg:w-96 flex-shrink-0 border-r border-stone-200 overflow-y-auto bg-stone-50/30">
        <header className="sticky top-0 z-10 px-5 py-3 bg-white/95 backdrop-blur border-b border-stone-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900">Pending Review</h2>
            <span className="text-xs text-stone-500 tabular-nums">
              {records.length}
            </span>
          </div>
        </header>
        <PendingList
          records={records}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </aside>

      {/* Right: detail panel */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {selected ? (
          <OutreachDetail record={selected} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-stone-500">
            Select a contact from the list to see details
          </div>
        )}
      </main>
    </div>
  );
}