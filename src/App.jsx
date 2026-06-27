import { useState, useEffect } from "react";
import FixturesTab from "./FixturesTab";
import SquadsTab from "./SquadsTab";
import LeagueStatsTab from "./LeagueStatsTab";

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash || "#/fixtures";
    if (hash.startsWith("#/squads")) return "squads";
    if (hash.startsWith("#/league-stats")) return "league-stats";
    return "fixtures";
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || "#/fixtures";
      if (hash.startsWith("#/squads")) {
        setActiveTab("squads");
      } else if (hash.startsWith("#/league-stats")) {
        setActiveTab("league-stats");
      } else {
        setActiveTab("fixtures");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    const currentHash = window.location.hash;
    const hasQuery = currentHash.includes("?");
    const queryString = hasQuery ? currentHash.split("?")[1] : "";

    if (tabName === "fixtures") {
      window.location.hash = queryString
        ? `#/fixtures?${queryString}`
        : `#/fixtures`;
    } else if (tabName === "squads") {
      window.location.hash = queryString
        ? `#/squads?${queryString}`
        : `#/squads`;
    } else if (tabName === "league-stats") {
      window.location.hash = queryString
        ? `#/league-stats?${queryString}`
        : `#/league-stats`;
    }
  };

  return (
    <div className="min-h-screen bg-[#040814] text-slate-100 font-sans antialiased selection:bg-green-500/30 selection:text-green-200 selection:backdrop-blur-sm">
      {/* 🎯 响应式改良 Header：在手机端将 flex-row 改为 flex-col 垂直有序排布 */}
      <header className="sticky top-0 z-50 bg-[#070d19]/80 border-b border-gray-900 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-auto md:h-20 flex flex-col md:flex-row items-center justify-between py-4 md:py-0 gap-4 md:gap-0">
          {/* 🇨🇳 LOGO 与主标题块 */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20 ring-1 ring-green-400/20">
              <span className="text-white text-base font-black tracking-tighter">
                CF
              </span>
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wider uppercase">
                CFNSA DATA CENTER
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-0.5">
                Chinese Football New Stars Analytics
              </p>
            </div>
          </div>

          {/* 📱 响应式升级交互按钮组 */}
          {/* PC端(md:)保持原本一排右对齐；移动端全宽横向流线排布，不缩水不换行 */}
          <nav className="w-full md:w-auto overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center gap-2 pb-1 md:pb-0 min-w-max px-1">
              <button
                onClick={() => handleTabChange("fixtures")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all duration-300 whitespace-nowrap ${
                  activeTab === "fixtures"
                    ? "bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/5 backdrop-blur-sm font-extrabold"
                    : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                📅 国字号赛程日历
              </button>

              <button
                onClick={() => handleTabChange("squads")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all duration-300 whitespace-nowrap ${
                  activeTab === "squads"
                    ? "bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/5 backdrop-blur-sm font-extrabold"
                    : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                🏆 青少年大赛球员发展
              </button>

              <button
                onClick={() => handleTabChange("league-stats")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all duration-300 whitespace-nowrap ${
                  activeTab === "league-stats"
                    ? "bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/5 backdrop-blur-sm font-extrabold"
                    : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                📊 职业联赛表现
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* 主画布核心区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative">
          <div className="absolute -top-20 left-1/3 w-96 h-96 bg-green-500/5 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative z-10 bg-[#0b1220]/40 border border-gray-800/50 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
            {activeTab === "fixtures" && <FixturesTab />}
            {activeTab === "squads" && <SquadsTab />}
            {activeTab === "league-stats" && <LeagueStatsTab />}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-950 bg-[#04070d] text-center py-8 text-[10px] text-slate-500 font-mono uppercase tracking-widest">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <span>CFNSA DATA CENTER © {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
