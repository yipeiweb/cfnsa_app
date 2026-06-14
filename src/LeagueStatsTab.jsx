import { useState, useMemo, useEffect, useRef } from 'react';
import { domToPng } from 'modern-screenshot';
import { supabase } from './supabase';

export default function LeagueStatsTab() {
  const [statsData, setStatsData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🔗 1. 初始化状态：从 URL 统一解析所有检索参数
  const [subTab, setSubTab] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    return params.get('statsTab') || 'total';
  });

  const [searchPlayer, setSearchPlayer] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    return params.get('player') || '';
  });

  const [searchLeague, setSearchLeague] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    return params.get('league') || 'all';
  });
  
  const [searchSeason, setSearchSeason] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    return params.get('season') || '2026';
  });

  const [searchRound, setSearchRound] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    return params.get('round') || '1';
  });

  const shareAreaRef = useRef(null);

  // 📡 2. 监听浏览器后退或外部 URL 输入，确保多参数完美同步
  useEffect(() => {
    const handleHashChange = () => {
      const params = new URLSearchParams(window.location.hash.split('?')[1]);
      const urlTab = params.get('statsTab') || 'total';
      const urlPlayer = params.get('player') || '';
      const urlLeague = params.get('league') || 'all';
      const urlSeason = params.get('season') || '2026';
      const urlRound = params.get('round') || '1';

      if (urlTab !== subTab) setSubTab(urlTab);
      if (urlPlayer !== searchPlayer) setSearchPlayer(urlPlayer);
      if (urlLeague !== searchLeague) setSearchLeague(urlLeague);
      if (urlSeason !== searchSeason) setSearchSeason(urlSeason);
      if (urlRound !== searchRound) setSearchRound(urlRound);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [subTab, searchPlayer, searchLeague, searchSeason, searchRound]);

  // 📝 3. 动态全同步至 URL，且在换 Tab 时动态清洗不合规参数
  useEffect(() => {
    const currentHash = window.location.hash.split('?')[0] || '#/league-stats';
    const params = new URLSearchParams();
    
    params.set('statsTab', subTab);
    params.set('season', searchSeason);
    if (searchPlayer) params.set('player', searchPlayer);
    if (searchLeague !== 'all') params.set('league', searchLeague);
    
    // 换 Tab 清洗机制：只有在每轮榜单下，才往 URL 里塞入轮次参数
    if (subTab === 'round') {
      params.set('round', searchRound);
    }

    const newHash = `${currentHash}?${params.toString()}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }, [subTab, searchPlayer, searchLeague, searchSeason, searchRound]);

  useEffect(() => {
    async function fetchLeagueStats() {
      try {
        const { data } = await supabase
          .from('match_stats')
          .select(`
            *,
            players ( name, birth_year ),
            clubs ( name )
          `);
        if (data) setStatsData(data);
      } catch (err) {
        console.error("职业联赛表现数据拉取失败:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeagueStats();
  }, []);

  const availableSeasons = useMemo(() => {
    const seasons = statsData.map(item => item.season?.toString()).filter(Boolean);
    return [...new Set(seasons)].sort((a, b) => b - a);
  }, [statsData]);

  const availableRounds = useMemo(() => {
    const filteredRounds = statsData
      .filter(item => {
        const matchSeason = item.season?.toString() === searchSeason;
        const matchLeague = searchLeague === 'all' || item.league === searchLeague;
        return matchSeason && matchLeague;
      })
      .map(item => item.round)
      .filter(Boolean);
    
    const maxRound = filteredRounds.length > 0 ? Math.max(...filteredRounds) : 30;
    return Array.from({ length: maxRound }, (_, i) => (i + 1).toString());
  }, [statsData, searchSeason, searchLeague]);

  // 🎨 4. 极致对齐设计图：整行同色系深浅交替算法（一整行一个色，再无突兀白底）
  const getRowBgColor = (index, leagueName) => {
    const isEven = index % 2 === 0;

    switch (leagueName) {
      case '中超':
        // 中超蓝色系交替：一行略深蓝，一行微润蓝
        return isEven ? '#dbeafe' : '#eff6ff'; 

      case '中甲':
        // 中甲橙色系交替：一行略深橙，一行微润橙
        return isEven ? '#ffedd5' : '#fff7ed'; 

      case '中乙':
        // 中乙绿色系交替：一行明显浅绿，一行极淡润绿
        return isEven ? '#dcfce7' : '#f0fdf4'; 

      default:
        // 如果出现未知，默认使用基础灰色调交替
        return isEven ? '#f1f5f9' : '#f8fafc';
    }
  };

  // 1. 赛季进球助攻榜数据处理
  const aggregatedTotalData = useMemo(() => {
    const filtered = statsData.filter(item => {
      const playerName = item.players?.name || '';
      const matchPlayer = playerName.toLowerCase().includes(searchPlayer.toLowerCase());
      const matchLeague = searchLeague === 'all' || item.league === searchLeague;
      const matchSeason = searchSeason === 'all' || item.season?.toString() === searchSeason;
      return matchPlayer && matchLeague && matchSeason;
    });

    const playerMap = {};
    filtered.forEach(item => {
      const pid = item.player_id;
      if (!playerMap[pid]) {
        playerMap[pid] = {
          id: pid,
          name: item.players?.name || '未知',
          birth_year: item.players?.birth_year || '--',
          club_name: item.clubs?.name || '自由身',
          league: item.league,
          goals: 0,
          assists: 0,
          appearances: 0
        };
      }
      playerMap[pid].goals += (item.goals || 0);
      playerMap[pid].assists += (item.assists || 0);
      playerMap[pid].appearances += 1;
    });

    return Object.values(playerMap).sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      return b.assists - a.assists;
    });
  }, [statsData, searchPlayer, searchLeague, searchSeason]);

  // 2. 每轮进球助攻榜数据处理
  const roundData = useMemo(() => {
    return statsData.filter(item => {
      const playerName = item.players?.name || '';
      const matchPlayer = playerName.toLowerCase().includes(searchPlayer.toLowerCase());
      const matchSeason = item.season?.toString() === searchSeason;
      const matchLeague = searchLeague === 'all' || item.league === searchLeague;
      const matchRound = item.round?.toString() === searchRound;
      return matchPlayer && matchSeason && matchLeague && matchRound;
    }).sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      return b.assists - a.assists;
    });
  }, [statsData, searchPlayer, searchLeague, searchSeason, searchRound]);

  const currentPlayerCount = useMemo(() => {
    return subTab === 'total' ? aggregatedTotalData.length : roundData.length;
  }, [subTab, aggregatedTotalData, roundData]);

  const exportStatsImageAndCopy = async () => {
    if (!shareAreaRef.current) return;
    try {
      const dataUrl = await domToPng(shareAreaRef.current, { quality: 1, scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      const prefix = subTab === 'total' ? '赛季进球助攻榜' : `第${searchRound}轮进球助攻榜`;
      link.download = `CFNSA_${prefix}_${new Date().toISOString().slice(0,10)}.png`;
      link.href = dataUrl;
      link.click();

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  const dynamicLeagueTitleText = useMemo(() => {
    if (searchLeague === 'all') return '三级职业联赛（中超u23/中甲u21/中乙u21）';
    if (searchLeague === '中超') return '中超（u23）';
    if (searchLeague === '中甲') return '中甲（u21）';
    if (searchLeague === '中乙') return '中乙（u21）';
    return searchLeague;
  }, [searchLeague]);

  return (
    <div className="space-y-6">
      
      {/* 子导航 Sub-Tabs */}
      <div className="flex border-b border-gray-800 pb-px gap-2">
        <button
          onClick={() => setSubTab('total')}
          className={`px-4 py-2 text-xs font-black tracking-wide border-b-2 transition-all ${
            subTab === 'total'
              ? 'border-green-500 text-green-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📊 赛季进球助攻榜
        </button>
        <button
          onClick={() => setSubTab('round')}
          className={`px-4 py-2 text-xs font-black tracking-wide border-b-2 transition-all ${
            subTab === 'round'
              ? 'border-green-500 text-green-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          ⚡ 每轮进球助攻榜
        </button>
      </div>

      {/* 条件检索面板 */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-5 bg-black/40 border border-gray-800/80 p-4 rounded-xl shadow-xl">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">🏃 球员姓名</label>
          <input 
            placeholder="姓名过滤..." 
            value={searchPlayer} 
            onChange={(e) => setSearchPlayer(e.target.value)} 
            className="bg-black/80 border border-gray-800 rounded-lg px-3 text-xs h-9 text-slate-200 focus:outline-none focus:border-green-500 transition-colors" 
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">🏆 联赛分级</label>
          <select value={searchLeague} onChange={(e) => setSearchLeague(e.target.value)} className="bg-black/80 border border-gray-800 rounded-lg px-3 text-xs text-slate-200 h-9 cursor-pointer focus:outline-none focus:border-green-500">
            <option value="all">全部职业联赛</option>
            <option value="中超">中超（u23）</option>
            <option value="中甲">中甲（u21）</option>
            <option value="中乙">中乙（u21）</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">📅 赛季年度</label>
          <select value={searchSeason} onChange={(e) => setSearchSeason(e.target.value)} className="bg-black/80 border border-gray-800 rounded-lg px-3 text-xs text-slate-200 h-9 cursor-pointer focus:outline-none focus:border-green-500">
            {availableSeasons.length > 0 ? (
              availableSeasons.map(s => <option key={s} value={s}>{s}赛季</option>)
            ) : (
              <option value="2026">2026赛季</option>
            )}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 transition-all">
          {subTab === 'round' ? (
            <>
              <label className="text-[11px] font-bold text-green-400 uppercase tracking-wider">🔢 选择具体轮次</label>
              <select value={searchRound} onChange={(e) => setSearchRound(e.target.value)} className="bg-black/80 border border-green-900/60 text-green-400 rounded-lg px-3 text-xs h-9 cursor-pointer focus:outline-none focus:border-green-500 font-mono font-bold">
                {availableRounds.map(r => <option key={r} value={r}>第 {r} 轮</option>)}
              </select>
            </>
          ) : (
            <div className="hidden md:block opacity-0 pointer-events-none h-9" />
          )}
        </div>

        <div className="flex items-end justify-end">
          <button 
            onClick={exportStatsImageAndCopy} 
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-xs h-9 rounded-lg shadow-md transition-all focus:outline-none ring-1 ring-green-400/20"
          >
            📸 导出图片
          </button>
        </div>
      </div>

      {/* 数据分享画布区 */}
      <div ref={shareAreaRef} className="p-6 rounded-2xl border border-gray-200 space-y-4" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
        <div className="text-center py-2 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900 tracking-wide">
            {subTab === 'total' 
              ? `${searchSeason}赛季 ${dynamicLeagueTitleText}青少年球员进球助攻榜`
              : `${searchSeason}赛季 ${dynamicLeagueTitleText}第 ${searchRound} 轮进球助攻榜`
            }
          </h2>
        </div>

        {/* 🔢 纯净统计面板 */}
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="text-slate-500 font-medium">
            当前上榜青年新星总数：<span className="font-mono font-black text-emerald-600 text-sm bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{currentPlayerCount}</span> 人
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm w-full">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold">
              <tr>
                <th className="py-4 pl-6 w-16 text-center">排名</th>
                <th className="w-36">球员姓名</th>
                <th className="w-20 text-center">出生年</th>
                <th className="w-24 text-center">联赛级别</th>
                <th className="pl-4 w-44">所属俱乐部</th>
                {subTab === 'total' && <th className="w-24 text-center">产出轮次</th>}
                <th className="w-20 text-center bg-slate-100/50 text-slate-700">⚽ 进球数</th>
                <th className="w-20 text-center bg-slate-100/50 text-slate-700">👟 助攻数</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={subTab === 'total' ? "8" : "7"} className="text-center py-16 text-slate-400 text-xs animate-pulse">⚡ 正在处理实时数据库...</td></tr>
              ) : (subTab === 'total' ? aggregatedTotalData : roundData).length > 0 ? (
                (subTab === 'total' ? aggregatedTotalData : roundData).map((item, index) => {
                  const lName = subTab === 'total' ? item.league : item.league;
                  
                  // 🎨 核心：计算这一行数据专属的斑马底色（一行标准，下一行变淡）
                  const rowColor = getRowBgColor(index, lName);
                  
                  const pName = subTab === 'total' ? item.name : (item.players?.name || '未知');
                  const pBirth = subTab === 'total' ? item.birth_year : (item.players?.birth_year || '--');
                  const cName = subTab === 'total' ? item.club_name : (item.clubs?.name || '自由身');
                  const appearances = item.appearances;

                  return (
                    // 🟢 完美对齐：直接赋予 <tr> 整行相同的底色，全量单元格背景自然融为一体！
                    <tr key={item.id} className="text-xs text-slate-700 border-b border-slate-100 transition-colors" style={{ backgroundColor: rowColor }}>
                      <td className="text-center py-3.5 font-mono font-black text-slate-400/80 text-[13px]">{index + 1}</td>
                      <td className="font-black text-slate-900 text-[14px] tracking-wider truncate">{pName}</td>
                      <td className="text-center font-mono font-bold text-slate-500">{pBirth}</td>
                      <td className="text-center font-semibold text-slate-500">{lName}</td>
                      <td className="pl-4 font-black text-emerald-800 truncate">{cName}</td>
                      {subTab === 'total' && <td className="text-center font-mono font-bold text-slate-500">{appearances} 轮</td>}
                      
                      {/* 数字列统一保持原本清晰的加粗色调，不再带有割裂的独立深色方块 */}
                      <td className="text-center font-mono font-black text-[14px] text-green-700">{item.goals}</td>
                      <td className="text-center font-mono font-black text-[14px] text-blue-700">{item.assists}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={subTab === 'total' ? "8" : "7"} className="text-center py-16 text-slate-400 text-xs tracking-wide">
                    💡 该检索条件下，暂无年轻球员斩获进球或助攻。
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