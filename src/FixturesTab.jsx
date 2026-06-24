import { useState, useMemo, useEffect, useRef } from "react";
import { domToPng } from "modern-screenshot";
import { jsPDF } from "jspdf";
import { supabase } from "./supabase";

export default function FixturesTab() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  // 捕获本地当前的真实年、月
  const now = new Date();
  const currentYearStr = now.getFullYear().toString();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, "0");

  // 从 URL Query 恢复搜索历史
  const [searchTeam, setSearchTeam] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    return params.get("team") || "";
  });

  const [searchYear, setSearchYear] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    return params.get("year") || currentYearStr;
  });

  const [searchMonth, setSearchMonth] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    return params.get("month") || "all";
  });

  const [searchStatus, setSearchStatus] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    return params.get("status");
  });

  const [searchResult, setSearchResult] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    return params.get("result") || "all";
  });

  const shareAreaRef = useRef(null);

  // 捞取数据
  useEffect(() => {
    async function fetchFixtures() {
      try {
        const { data } = await supabase
          .from("fixtures")
          .select(
            `
            *,
            national_teams ( name )
          `,
          )
          .order("match_date", { ascending: true })
          .order("match_time", { ascending: true });

        if (data) setFixtures(data);
      } catch (err) {
        console.error("赛程战绩数据加载失败:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFixtures();
  }, []);

  // 实时同步参数到 URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTeam) params.set("team", searchTeam);
    if (searchYear !== "all") params.set("year", searchYear);
    if (searchMonth !== "all") params.set("month", searchMonth);
    if (searchStatus !== "all") params.set("status", searchStatus);
    if (searchResult !== "all") params.set("result", searchResult);

    const queryString = params.toString();
    window.location.hash = queryString
      ? `#/fixtures?${queryString}`
      : "#/fixtures";
  }, [searchTeam, searchYear, searchMonth, searchStatus, searchResult]);

  // 动态提取年份
  const availableYears = useMemo(() => {
    if (!fixtures) return [];
    const years = fixtures
      .map((item) => (item.match_date ? item.match_date.split("-")[0] : null))
      .filter((year, index, self) => year && self.indexOf(year) === index);
    return years.sort((a, b) => b - a);
  }, [fixtures]);

  // 核心过滤
  const filteredFixtures = useMemo(() => {
    if (!fixtures) return [];
    return fixtures.filter((item) => {
      const teamName = item.national_teams?.name || "";
      const matchTeam = teamName
        .toLowerCase()
        .includes(searchTeam.toLowerCase());

      let matchYear = "";
      let matchMonth = "";
      if (item.match_date) {
        const dateParts = item.match_date.split("-");
        if (dateParts.length >= 2) {
          matchYear = dateParts[0];
          matchMonth = dateParts[1];
        }
      }

      const matchYearCond = searchYear === "all" || matchYear === searchYear;
      const matchMonthCond =
        searchMonth === "all" || matchMonth === searchMonth;

      let matchStatusCond = true;
      if (searchStatus === "finished") {
        matchStatusCond = item.status === "finished";
      } else if (searchStatus === "scheduled") {
        matchStatusCond = item.status === "scheduled" || !item.status;
      }

      const matchResultCond =
        searchResult === "all" || item.result === searchResult;

      return (
        matchTeam &&
        matchYearCond &&
        matchMonthCond &&
        matchStatusCond &&
        matchResultCond
      );
    });
  }, [
    fixtures,
    searchTeam,
    searchYear,
    searchMonth,
    searchStatus,
    searchResult,
  ]);

  // 战绩快照智适应实时计算卡片
  const stats = useMemo(() => {
    let win = 0,
      draw = 0,
      loss = 0;
    filteredFixtures.forEach((item) => {
      if (item.status === "finished") {
        if (item.result === "胜") win++;
        if (item.result === "平") draw++;
        if (item.result === "负") loss++;
      }
    });
    return { win, draw, loss, total: win + draw + loss };
  }, [filteredFixtures]);

  // 智适应标题
  const dynamicTitleText = useMemo(() => {
    const yearPart = searchYear !== "all" ? `${searchYear}年` : "";
    const monthPart =
      searchMonth !== "all" ? `${parseInt(searchMonth)}月份 ` : "全年";

    const uniqueTeams = [];
    filteredFixtures.forEach((fix) => {
      const name = fix.national_teams?.name;
      if (name && !uniqueTeams.includes(name)) {
        uniqueTeams.push(name);
      }
    });

    const teamPart = uniqueTeams.length === 1 ? uniqueTeams[0] : "各级国字号";

    if (searchStatus === "scheduled") {
      return `${yearPart}${monthPart}${teamPart}赛程（共 ${filteredFixtures.length} 场）`;
    } else if (searchStatus === "finished") {
      return `${yearPart}${monthPart}${teamPart}战绩（共 ${filteredFixtures.length} 场）`;
    } else {
      return `${yearPart}${monthPart}${teamPart}赛程与战绩（共 ${filteredFixtures.length} 场）`;
    }
  }, [filteredFixtures, searchYear, searchMonth, searchStatus]);

  const exportToImage = async () => {
    if (!shareAreaRef.current) return;
    try {
      const container = shareAreaRef.current;
      // 🎯 核心绝杀：截图前强制给最外层画布垫上固定大宽度，防止被手机屏幕边缘误伤裁剪
      const originalWidth = container.style.width;
      container.style.width = "1100px";

      const dataUrl = await domToPng(container, {
        quality: 1,
        scale: 2,
        backgroundColor: "#ffffff",
      });

      // 🔄 截图完瞬间复原原始网页宽度自适应
      container.style.width = originalWidth;

      const link = document.createElement("a");
      link.download = `CFNSA_国字号赛程大盘_${searchYear}年_${searchMonth}月.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("长图生成故障:", err);
    }
  };

  const exportToPDF = async () => {
    if (!shareAreaRef.current) return;
    try {
      const container = shareAreaRef.current;
      const rows = container.querySelectorAll("tbody tr");
      const hiddenRows = [];
      const linkPositions = [];

      // 1. 隐形裁剪没集锦的行
      rows.forEach((row) => {
        const hasHighlight = row.querySelector('a[href*="http"]');
        if (!hasHighlight) {
          row.style.display = "none";
          hiddenRows.push(row);
        }
      });

      // 2. 隐藏多余的面板
      const statPanels = container.querySelectorAll(
        ".bg-black\\/40, .grid, .flex",
      );
      const hiddenPanels = [];
      statPanels.forEach((panel) => {
        if (!container.querySelector("table").contains(panel)) {
          if (
            panel.textContent.includes("胜") ||
            panel.textContent.includes("平") ||
            panel.textContent.includes("负") ||
            panel.textContent.includes("总数")
          ) {
            panel.style.display = "none";
            hiddenPanels.push(panel);
          }
        }
      });

      // 3. 动态 Title
      const titleEl = container.querySelector("h2");
      let originalTitleText = "";
      if (titleEl) {
        originalTitleText = titleEl.textContent;
        titleEl.textContent = originalTitleText.replace(
          /赛程与战绩|全量赛程战绩大盘|战绩历史|赛事预告/g,
          "比赛集锦",
        );
      }

      // 🎯 核心绝杀：截图前强制给最外层画布定死 1100px 大宽度，防止测量坐标和截图被手机宽度卡死
      const originalWidth = container.style.width;
      container.style.width = "1100px";

      // 4. 测量链接绝对坐标 (此时在大宽度下测量，位置绝对100%精准)
      const containerRect = container.getBoundingClientRect();
      const activeButtons = container.querySelectorAll(
        'tbody tr a[href*="http"]',
      );
      activeButtons.forEach((btn) => {
        const btnRect = btn.getBoundingClientRect();
        linkPositions.push({
          url: btn.getAttribute("href"),
          left: btnRect.left - containerRect.left,
          top: btnRect.top - containerRect.top,
          width: btnRect.width,
          height: btnRect.height,
        });
      });

      // 5. 拍照合影
      const dataUrl = await domToPng(container, {
        quality: 1,
        scale: 2,
        backgroundColor: "#ffffff",
      });

      // 🔄 瞬间复原所有元素和原始网页宽度
      container.style.width = originalWidth;
      hiddenRows.forEach((row) => {
        row.style.display = "";
      });
      hiddenPanels.forEach((panel) => {
        panel.style.display = "";
      });
      if (titleEl && originalTitleText) {
        titleEl.textContent = originalTitleText;
      }

      // 6. 生成并派发带有超链接热区的完美 PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);

      const pxToMmScale = pdfWidth / containerRect.width;
      linkPositions.forEach((pos) => {
        const pdfX = pos.left * pxToMmScale;
        const pdfY = pos.top * pxToMmScale;
        const pdfW = pos.width * pxToMmScale;
        const pdfH = pos.height * pxToMmScale;
        pdf.link(pdfX, pdfY, pdfW, pdfH, { url: pos.url });
      });

      pdf.save(
        `${searchTeam ? searchTeam : "各级国字号"}比赛集锦_${searchYear}_${searchMonth}.pdf`,
      );
    } catch (err) {
      console.error("PDF报告导出失败:", err);
    }
  };

  const formatMatchDate = (dateStr) => {
    if (!dateStr) return "--";
    const parts = dateStr.split("-");
    if (parts.length >= 3) {
      return `${parts[1]}/${parts[2]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-5">
      {/* 📊 检索面板：手机端1列(或2列)垂直平铺，大屏(md)恢复原本6列工整嵌合 */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-6 bg-gray-900 bg-opacity-60 border border-gray-800 p-4 rounded-xl">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-400">🛡️ 队伍序列</label>
          <input
            placeholder="如: U19男足"
            value={searchTeam}
            onChange={(e) => setSearchTeam(e.target.value)}
            className="bg-black border border-gray-800 rounded-lg px-3 text-xs h-9 text-gray-200 focus:outline-none focus:border-green-500 w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-400">
            📅 按年度检索
          </label>
          <select
            value={searchYear}
            onChange={(e) => setSearchYear(e.target.value)}
            className="bg-black border border-gray-800 rounded-lg px-3 text-xs text-gray-200 h-9 cursor-pointer focus:outline-none focus:border-green-500 w-full"
          >
            <option value="all">全部年份</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}年 赛季
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] md:text-xs font-bold text-gray-400">
            📆 按指定月份
          </label>
          <select
            value={searchMonth}
            onChange={(e) => setSearchMonth(e.target.value)}
            className="bg-black border border-gray-800 rounded-lg px-3 text-xs text-gray-200 h-9 cursor-pointer focus:outline-none focus:border-green-500 w-full"
          >
            <option value="all">全年所有月份</option>
            {[
              "01",
              "02",
              "03",
              "04",
              "05",
              "06",
              "07",
              "08",
              "09",
              "10",
              "11",
              "12",
            ].map((m) => (
              <option key={m} value={m}>
                {parseInt(m)}月份
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-400">⚡ 状态过滤</label>
          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="bg-black border border-gray-800 rounded-lg px-3 text-xs text-gray-200 h-9 cursor-pointer focus:outline-none focus:border-green-500 w-full"
          >
            <option value="all">全部比赛</option>
            <option value="scheduled">未开赛（看赛程）</option>
            <option value="finished">已完赛（看战绩）</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-400">🏁 战绩过滤</label>
          <select
            value={searchResult}
            onChange={(e) => setSearchResult(e.target.value)}
            className="bg-black border border-gray-800 rounded-lg px-3 text-xs text-slate-200 h-9 cursor-pointer focus:outline-none focus:border-green-500 w-full"
          >
            <option value="all">全部胜平负</option>
            <option value="胜">🟢 胜</option>
            <option value="平">🟠 平</option>
            <option value="负">🔴 负</option>
          </select>
        </div>

        {/* 📱 手机端：全宽撑满排布；PC端(md:)：完美的最后一列底部对齐 */}
        <div className="flex items-end gap-2 justify-end col-span-1 sm:col-span-2 md:col-span-1 mt-2 md:mt-0">
          <button
            onClick={exportToImage}
            className="flex-1 md:flex-initial bg-green-600 hover:bg-green-500 text-white font-bold text-xs px-3 h-9 rounded-lg shadow-md focus:outline-none transition-colors shrink-0"
          >
            📸 图片
          </button>
          <button
            onClick={exportToPDF}
            className="flex-1 md:flex-initial bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 h-9 rounded-lg shadow-md focus:outline-none transition-colors shrink-0"
          >
            📄 PDF
          </button>
        </div>
      </div>

      {/* 📊 画布区 */}
      <div
        ref={shareAreaRef}
        className="p-5 rounded-xl border border-gray-200 space-y-4"
        style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
      >
        {/* 标题 */}
        <div className="text-center py-1 border-b border-gray-200">
          <h2 className="text-base font-black text-gray-900 tracking-wide">
            {dynamicTitleText}
          </h2>
        </div>

        {/* 战绩快照 */}
        <div
          className="grid grid-cols-4 gap-2 p-3 rounded-lg border border-gray-200 text-center"
          style={{ backgroundColor: "#f9fafb" }}
        >
          <div className="border-r border-gray-200">
            <div className="text-xs text-gray-500 font-medium">总完赛场次</div>
            <div className="text-base font-black text-gray-800 mt-0.5">
              {stats.total}
            </div>
          </div>
          <div className="border-r border-gray-200">
            <div className="text-xs text-green-600 font-medium">🟢 胜场</div>
            <div className="text-base font-black text-green-600 mt-0.5">
              {stats.win}
            </div>
          </div>
          <div className="border-r border-gray-200">
            <div className="text-xs text-amber-600 font-medium">🟠 平局</div>
            <div className="text-base font-black text-amber-600 mt-0.5">
              {stats.draw}
            </div>
          </div>
          <div>
            <div className="text-xs text-red-600 font-medium">🔴 负场</div>
            <div className="text-base font-black text-red-600 mt-0.5">
              {stats.loss}
            </div>
          </div>
        </div>

        {/* 表格主体 */}
        <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-white border border-gray-200 rounded-xl shadow-sm">
          <table className="min-w-[800px] w-full text-left border-collapse table-fixed">
            <thead className="bg-gray-100 border-b border-gray-300 text-gray-600 text-xs font-bold">
              <tr>
                <th className="py-3.5 pl-4 w-20">比赛日期</th>
                <th className="w-16">时间</th>
                {/* 🟢 核心修改点：将赛事名称列宽从 w-36 升级放宽为 w-52，确保多字大赛全名体面伸展不截断 */}
                <th className="pl-4 w-52">赛事名称</th>
                <th className="w-28">国字号队伍</th>
                <th className="w-20 text-center">状态/比分</th>
                <th className="pl-4 w-28">对手</th>
                <th className="pl-4">
                  <span>备注信息</span>
                  <span className="screenshot-hide-text"> / 视频回放</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFixtures && filteredFixtures.length > 0 ? (
                filteredFixtures.map((fix) => {
                  let rowBgColor = "#ffffff";
                  let rowTextColor = "#1e293b";
                  let badgeBgColor = "#f1f5f9";
                  let badgeTextColor = "#475569";
                  const isFinished = fix.status === "finished";

                  if (fix.result === "胜") {
                    rowBgColor = "#dcfce7";
                    rowTextColor = "#052e16";
                    badgeBgColor = "#16a34a";
                    badgeTextColor = "#ffffff";
                  } else if (fix.result === "负") {
                    rowBgColor = "#fee2e2";
                    rowTextColor = "#450a0a";
                    badgeBgColor = "#dc2626";
                    badgeTextColor = "#ffffff";
                  } else if (fix.result === "平") {
                    rowBgColor = "#fef3c7";
                    rowTextColor = "#451a03";
                    badgeBgColor = "#f59e0b";
                    badgeTextColor = "#ffffff";
                  } else {
                    rowBgColor = "#f8fafc";
                    rowTextColor = "#64748b";
                    badgeBgColor = "#ffffff";
                    badgeTextColor = "#64748b";
                  }

                  return (
                    <tr
                      key={fix.id}
                      className="border-b border-gray-200 text-xs transition-colors"
                      style={{
                        backgroundColor: rowBgColor,
                        color: rowTextColor,
                      }}
                    >
                      <td className="pl-6 py-3 font-mono font-bold">
                        {formatMatchDate(fix.match_date)}
                      </td>
                      <td className="font-mono opacity-80">
                        {fix.match_time ? fix.match_time.substring(0, 5) : "--"}
                      </td>

                      {/* 🟢 赛事名称单元格：配合 w-52，去除截断隐患 */}
                      <td className="pl-4 font-semibold truncate text-gray-700">
                        {fix.tournament_name}
                      </td>

                      <td className="font-black truncate">
                        {fix.national_teams?.name || "未知序列"}
                      </td>

                      <td className="text-center py-3">
                        <div className="flex items-center justify-center w-full">
                          <span
                            className="rounded text-[11px] font-bold border shadow-sm flex items-center justify-center font-mono"
                            style={{
                              width: "56px",
                              height: "20px",
                              backgroundColor: badgeBgColor,
                              color: badgeTextColor,
                              borderColor: "transparent",
                            }}
                          >
                            {isFinished
                              ? `${fix.our_score}-${fix.opponent_score}`
                              : "VS"}
                          </span>
                        </div>
                      </td>

                      <td className="pl-4 font-black truncate">
                        {fix.opponent}
                      </td>

                      <td className="pl-4 py-3 whitespace-nowrap overflow-hidden">
                        <div className="flex items-center gap-2 max-w-full overflow-hidden">
                          {fix.notes && (
                            <span
                              className="text-[11px] bg-white text-gray-700 px-1.5 py-0.5 rounded border border-gray-200 shadow-sm inline-block truncate max-w-[220px]"
                              title={fix.notes}
                            >
                              ℹ️ {fix.notes}
                            </span>
                          )}

                          {fix.highlight_url && (
                            <a
                              href={fix.highlight_url}
                              target="_blank"
                              rel="noreferrer"
                              className="screenshot-hide-btn text-[11px] font-bold px-1.5 py-0.5 rounded transition-colors inline-block shadow-sm flex-shrink-0"
                              style={{
                                backgroundColor: "#eff6ff",
                                color: "#2563eb",
                                border: "1px solid #bfdbfe",
                              }}
                            >
                              📺 视频集锦
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center py-16 text-gray-400 text-xs"
                  >
                    当前检索条件下，暂无对应的国字号赛事数据安排。
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
