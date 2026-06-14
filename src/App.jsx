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
        : "#/fixtures";
    } else if (tabName === "squads") {
      window.location.hash = queryString
        ? `#/squads?${queryString}`
        : "#/squads";
    } else if (tabName === "league-stats") {
      window.location.hash = queryString
        ? `#/league-stats?${queryString}`
        : "#/league-stats";
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans antialiased selection:bg-green-500 selection:text-black">
      {/* 🇨🇳 顶部导航栏 */}
      <header className="border-b border-gray-800/80 bg-[#0b1324]/90 backdrop-blur-md sticky top-0 z-50 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* 左侧：CFNSA 品牌核心标识 */}
          <div className="flex items-center gap-3">
            <span className="text-2xl drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
              🇨🇳
            </span>
            <div>
              <h1 className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-gray-400">
                CFNSA
              </h1>
              <p className="text-[9px] text-green-500 font-mono font-bold uppercase tracking-widest">
                CHINA FOOTBALL NEW STARS ANALYTICS
              </p>
            </div>
          </div>

          {/* 右侧：三卡并行切换 */}
          <nav className="flex bg-black/60 p-1 rounded-xl border border-gray-800/60 shadow-inner">
            <button
              onClick={() => handleTabChange("fixtures")}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wide transition-all duration-200 focus:outline-none ${
                activeTab === "fixtures"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-900/30 ring-1 ring-green-400/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-gray-900/40"
              }`}
            >
              📅 赛程战绩
            </button>
            <button
              onClick={() => handleTabChange("squads")}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wide transition-all duration-200 focus:outline-none ${
                activeTab === "squads"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-900/30 ring-1 ring-green-400/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-gray-900/40"
              }`}
            >
              📋 大名单现状
            </button>
            <button
              onClick={() => handleTabChange("league-stats")}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wide transition-all duration-200 focus:outline-none ${
                activeTab === "league-stats"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-900/30 ring-1 ring-green-400/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-gray-900/40"
              }`}
            >
              📊 职业联赛表现
            </button>
          </nav>
        </div>
      </header>

      {/* 主画布核心区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative">
          <div className="absolute -top-20 left-1/3 w-96 h-96 bg-green-500/5 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative z-10 bg-[#0b1220]/40 border border-gray-800/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            {activeTab === "fixtures" && <FixturesTab />}
            {activeTab === "squads" && <SquadsTab />}
            {activeTab === "league-stats" && <LeagueStatsTab />}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-950 bg-[#04070d] text-center py-8 text-[10px] text-slate-500 font-mono uppercase tracking-widest">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <span>CFNSA DATA CENTER © {new Date().getFullYear()}</span>
          <span className="hidden sm:inline text-gray-800">|</span>
          <span className="text-gray-600 font-sans font-medium">
            中国足坛青少年球员职业联赛数据跟踪分析系统
          </span>
        </div>
        <div className="text-[9px] text-gray-700 mt-1.5 font-sans font-medium tracking-normal normal-case">
          声明：本平台数据基于公开职业联赛统计清洗提炼，仅用于学术交流及青少年足球星火跟踪分析。
        </div>
      </footer>
    </div>
  );
}
