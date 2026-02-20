"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import UploadTab from "@/components/UploadTab";
import DocumentsTab from "@/components/DocumentsTab";
import SearchTab from "@/components/SearchTab";
import McpConfigTab from "@/components/McpConfigTab";

const TABS = [
  { name: "Upload" as const, icon: "\u2B06" },
  { name: "Documents" as const, icon: "\u2630" },
  { name: "Search" as const, icon: "\u2315" },
  { name: "MCP Config" as const, icon: "\u2699" },
];
type Tab = (typeof TABS)[number]["name"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Upload");
  const [user, setUser] = useState<{
    id: string;
    email: string;
    accessToken: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          accessToken: session.access_token,
        });
      } else {
        router.push("/login");
      }
      setLoading(false);
    }
    getSession();
  }, [router, supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="spinner spinner-purple" style={{ width: 28, height: 28, borderWidth: 2.5 }} />
          <span className="text-gray-400 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0a0a1a]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            RAG <span className="text-[#6c5ce7]">Vault</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`px-4 py-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                  activeTab === tab.name
                    ? "text-[#6c5ce7]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span className="text-xs">{tab.icon}</span>
                {tab.name}
                {activeTab === tab.name && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6c5ce7]" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div key={activeTab} className="animate-fade-in">
          {activeTab === "Upload" && (
            <UploadTab accessToken={user.accessToken} />
          )}
          {activeTab === "Documents" && (
            <DocumentsTab accessToken={user.accessToken} />
          )}
          {activeTab === "Search" && (
            <SearchTab accessToken={user.accessToken} />
          )}
          {activeTab === "MCP Config" && <McpConfigTab userId={user.id} />}
        </div>
      </main>
    </div>
  );
}
