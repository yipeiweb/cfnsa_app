import { useState, useMemo, useEffect, useRef } from "react";
import { domToPng } from "modern-screenshot";
import { supabase } from "./supabase";

export default function SquadsTab() {
  const [rawSquads, setRawSquads] = useState([]);
  const [loading, setLoading] = useState(true);

  // 从 URL 的 Query 参数中读取搜索历史
  const [searchTournament, setSearchTournament] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    return params.get("tournament") || "";
  });

  const [searchYear, setSearchYear] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    return params.get("year") || "all";
  });

  const shareAreaRef = useRef(null);

  // 挂载捞取大名单数据
  useEffect(() => {
    async function fetchSquads() {
      try {
        const { data } = await supabase
          .from("tournament_squads")
          .select("*")
          .order("tournament_year", { ascending: false });

        if (data) setRawSquads(data);
      } catch (err) {
        console.error("大名单数据拉取失败:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSquads();
  }, []);

  // URL Query 同步机制
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTournament) params.set("tournament", searchTournament);
    if (searchYear !== "all") params.set("year", searchYear);
    const queryString = params.toString();
    window.location.hash = queryString ? `#/squads?${queryString}` : "#/squads";
  }, [searchTournament, searchYear]);

  const availableYears = useMemo(() => {
    if (!rawSquads) return [];
    return rawSquads
      .map((item) =>
        item.tournament_year ? item.tournament_year.toString() : null,
      )
      .filter((year, index, self) => year && self.indexOf(year) === index)
      .sort((a, b) => b - a);
  }, [rawSquads]);

  // 标准足球阵型位置权重字典
  const positionWeights = {
    门将: 1,
    GK: 1,
    goalkeeper: 1,
    后卫: 2,
    DF: 2,
    defender: 2,
    边后卫: 2,
    中后卫: 2,
    中场: 3,
    MF: 3,
    midfielder: 3,
    前腰: 3,
    后腰: 3,
    边锋: 3,
    前锋: 4,
    FW: 4,
    forward: 4,
    "前锋/中锋": 4,
    中锋: 4,
  };

  // 联动过滤 + 阵型位置标准排序
  const filteredSquads = useMemo(() => {
    if (!rawSquads) return [];

    // 初始阻断：只要赛事名称为空且年份未选，直接阻断不加载
    if (!searchTournament.trim() && searchYear === "all") {
      return [];
    }

    const filtered = rawSquads.filter((item) => {
      const tournamentName = item.tournament_name || "";
      const matchTournament = tournamentName
        .toLowerCase()
        .includes(searchTournament.toLowerCase());
      const matchYearCond =
        searchYear === "all" ||
        (item.tournament_year ? item.tournament_year.toString() : "") ===
          searchYear;

      return matchTournament && matchYearCond;
    });

    return filtered.sort((a, b) => {
      const weightA = positionWeights[a.position?.trim()] || 99;
      const weightB = positionWeights[b.position?.trim()] || 99;
      if (weightA !== weightB) return weightA - weightB;
      return (a.player_name || "").localeCompare(b.player_name || "", "zh-CN");
    });
  }, [rawSquads, searchTournament, searchYear]);

  // 动态拼装大标题
  const dynamicHeaderTitle = useMemo(() => {
    if (filteredSquads.length === 0) {
      return "大赛大名单国脚现状盘点";
    }
    const sample = filteredSquads[0];
    const prefix = sample.tournament_year ? `${sample.tournament_year}年` : "";
    const normName = sample.tournament_name || "";

    return `${prefix}${normName}大名单国脚现状（共 ${filteredSquads.length} 人）`;
  }, [filteredSquads, searchTournament, searchYear]);

  const exportSquadsImage = async () => {
    if (!shareAreaRef.current) return;
    try {
      const container = shareAreaRef.current;
      // 🎯 核心绝杀：截图前强制给最外层画布垫上固定大宽度，确保名册每一列都能完美平铺展开
      const originalWidth = container.style.width;
      container.style.width = "1100px";

      const dataUrl = await domToPng(container, {
        quality: 1,
        scale: 2,
        backgroundColor: "#ffffff",
      });

      // 🔄 截图完瞬间恢复
      container.style.width = originalWidth;

      const link = document.createElement("a");
      link.download = `CFNSA_国脚名册现状_${searchYear}年_${searchTournament || "全量"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("名册图片生成失败:", err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "--";
    return dateStr.slice(0, 10);
  };

  return (
    <div className="space-y-5">
      {/* 双维控制工具栏 */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-3 bg-gray-900 bg-opacity-60 border border-gray-800 p-4 rounded-xl">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-400">
            🏆 大赛名称检索
          </label>
          <input
            placeholder="如: 亚洲杯 / 世预赛 / 土伦杯"
            value={searchTournament}
            onChange={(e) => setSearchTournament(e.target.value)}
            className="bg-black border border-gray-800 rounded-lg px-3 text-xs h-9 text-gray-200 focus:outline-none focus:border-green-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-400">📅 赛事年份</label>
          <select
            value={searchYear}
            onChange={(e) => setSearchYear(e.target.value)}
            className="bg-black border border-gray-800 rounded-lg px-3 text-xs text-gray-200 h-9 cursor-pointer focus:outline-none focus:border-green-500"
          >
            <option value="all">显示全部年份</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}年 大赛名单
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end justify-end">
          <button
            onClick={exportSquadsImage}
            className="w-full md:w-auto bg-green-600 hover:bg-green-500 text-white font-bold text-xs px-6 h-9 rounded-lg shadow-md transition-colors focus:outline-none"
          >
            📸 导出大名单图片
          </button>
        </div>
      </div>

      {/* 大名单分享画布区 */}
      <div
        ref={shareAreaRef}
        className="p-5 rounded-xl border border-gray-200 space-y-5"
        style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
      >
        <div className="text-center py-2 border-b border-gray-200">
          <h2 className="text-base font-black text-gray-900 tracking-wide">
            {dynamicHeaderTitle}
          </h2>
        </div>

        <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-white border border-gray-200 rounded-xl shadow-sm">
          <table className="min-w-[800px] w-full text-left border-collapse table-fixed">
            <thead className="bg-gray-100 border-b border-gray-300 text-gray-600 text-xs font-bold">
              <tr>
                <th className="py-3.5 pl-6 w-40">球员姓名</th>
                <th className="w-16 text-center">出生年</th>
                <th className="w-20 text-center">场上位置</th>
                <th className="w-20 text-center">球员现状</th>
                <th className="pl-4 w-32">所属联赛</th>
                <th className="pl-4">现所属俱乐部 与 备注细节说明</th>
                <th className="w-32 text-center">现状更新日期</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center py-16 text-gray-400 text-xs animate-pulse"
                  >
                    ⚡ 正在加载最新名单大盘...
                  </td>
                </tr>
              ) : filteredSquads && filteredSquads.length > 0 ? (
                filteredSquads.map((player, index) => {
                  const isEven = index % 2 === 0;
                  const rowBgColor = isEven ? "#ffffff" : "#f0f9ff";
                  const hasNotes = player.notes && player.notes.trim() !== "";

                  // 球员现状核心过滤矩阵
                  let statusBg = "#eff6ff";
                  let statusColor = "#1e40af";
                  const statusText = player.status_desc?.trim() || "现役";

                  if (statusText === "现役") {
                    statusBg = "#dcfce7";
                    statusColor = "#15803d";
                  } else if (statusText === "退役") {
                    statusBg = "#fee2e2";
                    statusColor = "#b91c1c";
                  } else if (statusText === "自由身" || statusText === "待业") {
                    statusBg = "#ffedd5";
                    statusColor = "#c2410c";
                  }

                  // 场上位置四色动态分级矩阵
                  let posBg = "#f1f5f9";
                  let posColor = "#475569";
                  const posText = player.position?.trim() || "--";

                  if (posText.includes("后卫") || posText === "DF") {
                    posBg = "#e0f2fe";
                    posColor = "#0369a1";
                  } else if (posText.includes("中场") || posText === "MF") {
                    posBg = "#e8f5e9";
                    posColor = "#2e7d32";
                  } else if (
                    posText.includes("前锋") ||
                    posText === "中锋" ||
                    posText === "FW"
                  ) {
                    posBg = "#fff3e0";
                    posColor = "#e65100";
                  }

                  return (
                    <tr
                      key={player.id}
                      className="text-xs text-gray-800 border-b border-gray-200 transition-colors"
                      style={{ backgroundColor: rowBgColor }}
                    >
                      <td className="pl-6 py-3.5 font-black text-gray-900 truncate text-[14px] tracking-wider">
                        {player.player_name}
                      </td>
                      <td className="text-center font-mono font-bold text-gray-700">
                        {player.birth_year || "--"}
                      </td>

                      {/* 位置 */}
                      <td className="text-center">
                        <div className="flex items-center justify-center w-full">
                          <span
                            className="rounded text-[11px] font-bold border shadow-sm flex items-center justify-center transition-colors"
                            style={{
                              width: "48px",
                              height: "20px",
                              backgroundColor: posBg,
                              color: posColor,
                              borderColor: "transparent",
                            }}
                          >
                            {posText}
                          </span>
                        </div>
                      </td>

                      {/* 现状 */}
                      <td className="text-center">
                        <div className="flex items-center justify-center w-full">
                          <span
                            className="rounded text-[11px] font-bold border shadow-sm flex items-center justify-center"
                            style={{
                              width: "52px",
                              height: "20px",
                              backgroundColor: statusBg,
                              color: statusColor,
                              borderColor: "transparent",
                            }}
                          >
                            {statusText}
                          </span>
                        </div>
                      </td>

                      {/* 所属联赛 */}
                      <td className="pl-4 truncate font-bold text-gray-600">
                        {player.current_league &&
                        player.current_league.trim() !== ""
                          ? player.current_league
                          : ""}
                      </td>

                      {/* 俱乐部和备注垂直排版合并列 */}
                      <td className="pl-4 py-2 text-left">
                        <div className="flex flex-col gap-1 max-w-full">
                          <span className="font-black text-emerald-700 text-[13px]">
                            {player.current_club &&
                            player.current_club.trim() !== ""
                              ? player.current_club
                              : ""}
                          </span>

                          {/* 备注小吊牌栏（无表情纯净版） */}
                          {hasNotes && (
                            <div className="bg-yellow-500 border border-yellow-600 rounded px-2.5 py-0.5 text-[11px] text-white font-bold mt-1 inline-block max-w-md shadow-sm">
                              <span>{player.notes}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 现状更新日期 */}
                      <td className="text-center font-mono text-gray-400 text-[11px]">
                        {formatDate(player.update_date)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                // 优雅阻断占位符
                <tr>
                  <td
                    colSpan="7"
                    className="text-center py-20 text-gray-400 text-xs tracking-wide"
                  >
                    💡
                    请在上方输入赛事名称或选择年份（如输入：“亚洲杯”），一键检索该届大名单国脚现状。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
