import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";
import Research from "@/pages/Research";
import Pending from "@/pages/Pending";
import History from "@/pages/History";
import Analytics from "@/pages/Analytics";
import Sequence from "@/pages/Sequence";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/research" replace />} />
        <Route path="/research" element={<Research />} />
        <Route path="/pending" element={<Pending />} />
        <Route path="/history" element={<History />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/sequence" element={<Sequence />} />
        <Route path="*" element={<div className="p-8">Not found</div>} />
      </Route>
    </Routes>
  );
}