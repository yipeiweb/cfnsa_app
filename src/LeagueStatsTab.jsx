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

  // 拆分进球榜与助攻榜 (默认进球榜 'goals', 可选 'assists'，仅在赛季总榜生效)
  const [rankType, setRankType] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    return params.get('rankType') || 'goals';
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

  // 出生年份区间筛选状态 (From -> To)
  const [birthFrom, setBirthFrom] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    return params.get('birthFrom') || 'all';
  });

  const [birthTo, setBirthTo] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    return params.get('birthTo') || 'all';
  });

  const shareAreaRef = useRef(null);

  // 🚨 熔断硬锁：如果当前选中的是中女超，必须无条件强行锁死在进球榜上，不准看助攻榜
  useEffect(() => {
    if (searchLeague === '中女超' && rankType !== 'goals') {
      setRankType('goals');
    }
  }, [searchLeague, rankType]);

  // 📡 2. 监听浏览器后退或外部 URL 输入，确保多参数完美同步
  useEffect(() => {
    const handleHashChange = () => {
      const params = new URLSearchParams(window.location.hash.split('?')[1]);
      const urlTab = params.get('statsTab') || 'total';
      const urlRankType = params.get('rankType') || 'goals';
      const urlPlayer = params.get('player') || '';
      const urlLeague = params.get('league') || 'all';
      const urlSeason = params.get('season') || '2026';
      const urlRound = params.get('round') || '1';
      const urlBirthFrom = params.get('birthFrom') || 'all';
      const urlBirthTo = params.get('birthTo') || 'all';

      if (urlTab !== subTab) setSubTab(urlTab);
      if (urlRankType !== rankType) setRankType(urlRankType);
      if (urlPlayer !== searchPlayer) setSearchPlayer(urlPlayer);
      if (urlLeague !== searchLeague) setSearchLeague(urlLeague);
      if (urlSeason !== searchSeason) setSearchSeason(urlSeason);
      if (urlRound !== searchRound) setSearchRound(urlRound);
      if (urlBirthFrom !== birthFrom) setBirthFrom(urlBirthFrom);
      if (urlBirthTo !== birthTo) setBirthTo(urlBirthTo);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [subTab, rankType, searchPlayer, searchLeague, searchSeason, searchRound, birthFrom, birthTo]);

  // 📝 3. 动态全同步至 URL，且在换 Tab 时动态清洗不合规参数
  useEffect(() => {
    const currentHash = window.location.hash.split('?')[0] || '#/league-stats';
    const params = new URLSearchParams();
    
    params.set('statsTab', subTab);
    params.set('season', searchSeason);
    if (searchPlayer) params.set('player', searchPlayer);
    if (searchLeague !== 'all') params.set('league', searchLeague);
    if (birthFrom !== 'all') params.set('birthFrom', birthFrom);
    if (birthTo !== 'all') params.set('birthTo', birthTo);
    
    if (subTab === 'total') {
      params.set('rankType', rankType);
    }
    if (subTab === 'round') {
      params.set('round', searchRound);
    }

    const newHash = `${currentHash}?${params.toString()}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }, [subTab, searchPlayer, searchLeague, searchSeason, searchRound, birthFrom, birthTo, rankType]);

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

  const availableBirthYears = useMemo(() => {
    const years = statsData.map(item => item.players?.birth_year).filter(Boolean);
    return [...new Set(years)].sort((a, b) => a - b);
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

  // 🎨 4. 同色系深浅整行交替算法
  const getRowBgColor = (index, leagueName) => {
    const isEven = index % 2 === 0;
    switch (leagueName) {
      case '中超': return isEven ? '#dbeafe' : '#eff6ff'; 
      case '中甲': return isEven ? '#ffedd5' : '#fff7ed'; 
      case '中乙': return isEven ? '#dcfce7' : '#f0fdf4'; 
      case '中女超': return isEven ? '#fce7f3' : '#fdf2f8'; 
      default: return isEven ? '#f1f5f9' : '#f8fafc';
    }
  };

  // ⚙️ 核心数据基础条件过滤器
  const isPlayerMatchConditions = (item) => {
    const playerName = item.players?.name || '';
    const birthYear = item.players?.birth_year;

    const matchPlayer = playerName.toLowerCase().includes(searchPlayer.toLowerCase());
    const matchSeason = searchSeason === 'all' || item.season?.toString() === searchSeason;
    
    // 🛡️ 智能核心：基于当前正在筛选查看的赛季年度（如2026），动态演算中乙U19起跑线
    const targetSeasonYear = parseInt(searchSeason, 10) || 2026;
    const u19Line = targetSeasonYear - 19; // 2026赛季对应2007年，2025赛季对应2006年

    let matchLeague = false;
    if (searchLeague === 'all') {
      if (item.league === '中乙') {
        matchLeague = birthYear && birthYear >= u19Line; 
      } else {
        matchLeague = true; 
      }
    } else if (searchLeague === '中乙') {
      matchLeague = item.league === '中乙' && birthYear && birthYear >= u19Line;
    } else {
      matchLeague = item.league === searchLeague;
    }

    const matchBirthFrom = birthFrom === 'all' || (birthYear && birthYear >= parseInt(birthFrom, 10));
    const matchBirthTo = birthTo === 'all' || (birthYear && birthYear <= parseInt(birthTo, 10));

    return matchPlayer && matchLeague && matchSeason && matchBirthFrom && matchBirthTo;
  };

  // 1. 🟢 赛季榜数据处理
  const aggregatedTotalData = useMemo(() => {
    const filtered = statsData.filter(isPlayerMatchConditions);

    const playerMap = {};
    filtered.forEach(item => {
      const pid = item.player_id;
      if (!playerMap[pid]) {
        playerMap[pid] = {
          id: pid,
          name: item.players?.name || '未知',
          birth_year: item.players?.birth_year || 0,
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

    const allPlayersArray = Object.values(playerMap);
    const finalFilteredArray = allPlayersArray.filter(player => {
      if (rankType === 'goals') return player.goals > 0; 
      return player.assists > 0; 
    });

    return finalFilteredArray.sort((a, b) => {
      if (rankType === 'goals') {
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.assists !== a.assists) return b.assists - a.assists;
        return b.birth_year - a.birth_year;
      } else {
        if (b.assists !== a.assists) return b.assists - a.assists;
        if (b.goals !== a.goals) return b.goals - a.goals;
        return b.birth_year - a.birth_year;
      }
    });
  }, [statsData, searchPlayer, searchLeague, searchSeason, birthFrom, birthTo, rankType]);

  // 2. 🟢 每轮榜数据处理
  const roundData = useMemo(() => {
    return statsData.filter(item => {
      const matchRound = item.round?.toString() === searchRound;
      const hasOutput = (item.goals > 0 || item.assists > 0);
      return matchRound && hasOutput && isPlayerMatchConditions(item);
    }).sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      const bBirth = b.players?.birth_year || 0;
      const aBirth = a.players?.birth_year || 0;
      return bBirth - aBirth;
    });
  }, [statsData, searchPlayer, searchLeague, searchSeason, searchRound, birthFrom, birthTo]);

  const currentPlayerCount = useMemo(() => {
    return subTab === 'total' ? aggregatedTotalData.length : roundData.length;
  }, [subTab, aggregatedTotalData, roundData]);

  // 📸 长图高清导出
  const exportStatsImageAndCopy = async () => {
    if (!shareAreaRef.current) return;
    try {
      const container = shareAreaRef.current;
      
      const targetBtn = container.querySelector('.screenshot-hide-btn');
      if (targetBtn) targetBtn.style.display = 'none';

      const originalWidth = container.style.width;
      container.style.width = '1100px';

      const dataUrl = await domToPng(container, { quality: 1, scale: 2, backgroundColor: '#ffffff' });
      
      container.style.width = originalWidth;
      if (targetBtn) targetBtn.style.display = ''; 

      const link = document.createElement('a');
      const typeText = subTab === 'total' ? (rankType === 'goals' ? '进球榜' : '助攻榜') : '进球助攻榜';
      const prefix = subTab === 'total' ? `赛季${typeText}` : `第${searchRound}轮${typeText}`;
      link.download = `CFNSA_${prefix}_${new Date().toISOString().slice(0,10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  const dynamicLeagueTitleText = useMemo(() => {
    if (searchLeague === 'all') return '三级职业联赛（中超u23/中甲u21/中乙u19/中女超u23）';
    if (searchLeague === '中超') return '中超（u23）';
    if (searchLeague === '中甲') return '中甲（u21）';
    if (searchLeague === '中乙') return '中乙（u19）';
    if (searchLeague === '中女超') return '中女超（u23）'; 
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

      {/* 📊 条件检索面板 */}
      <div className="bg-black/40 border border-gray-800/80 p-4 rounded-xl shadow-xl space-y-4">
        {/* 第一行：4列检索 */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
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
              <option value="中乙">中乙（u19）</option> 
              <option value="中女超">中女超（u23）</option> 
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
        </div>

        {/* 第二行：出生年 From、出生年 To、留白占位、📸 导出图片按钮 */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 pt-2 border-t border-gray-800/40">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-green-400 uppercase tracking-wider">👶 起始出生年 (From)</label>
            <select value={birthFrom} onChange={(e) => setBirthFrom(e.target.value)} className="bg-black/80 border border-gray-800 rounded-lg px-3 text-xs text-slate-200 h-9 cursor-pointer focus:outline-none focus:border-green-500">
              <option value="all">不限年份</option>
              {availableBirthYears.map(y => <option key={y} value={y}>{y} 年</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-green-400 uppercase tracking-wider">👦 截止出生年 (To)</label>
            <select value={birthTo} onChange={(e) => setBirthTo(e.target.value)} className="bg-black/80 border border-gray-800 rounded-lg px-3 text-xs text-slate-200 h-9 cursor-pointer focus:outline-none focus:border-green-500">
              <option value="all">不限年份</option>
              {availableBirthYears.map(y => <option key={y} value={y}>{y} 年</option>)}
            </select>
          </div>
          <div className="hidden md:block pointer-events-none opacity-0 h-9"></div>
          <div className="flex items-end justify-end">
            <button 
              onClick={exportStatsImageAndCopy} 
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-xs h-9 rounded-lg shadow-md transition-all focus:outline-none ring-1 ring-green-400/20"
            >
              📸 导出图片
            </button>
          </div>
        </div>
      </div>

      {/* 数据分享画布区 */}
      <div ref={shareAreaRef} className="p-6 rounded-2xl border border-gray-200 space-y-4" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-base font-black text-slate-900 tracking-wide">
            {subTab === 'total' 
              ? `${searchSeason}赛季 ${dynamicLeagueTitleText}`
              : `${searchSeason}赛季 ${dynamicLeagueTitleText}第 ${searchRound} 轮`
            }
            {subTab === 'total' && (
              <span className="text-emerald-600 font-extrabold ml-1">
                {rankType === 'goals' ? '青年新星进球榜' : '青年新星助攻榜'}
              </span>
            )}
            {subTab === 'round' && <span className="text-blue-600 font-extrabold ml-1">青年新星进球助攻榜</span>}
          </h2>
          
          {subTab === 'total' && searchLeague !== '中女超' && (
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 screenshot-hide-btn">
              <button 
                onClick={() => setRankType('goals')} 
                className={`px-3 py-1 text-[11px] font-black rounded-md transition-all ${rankType === 'goals' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                ⚽ 进球榜
              </button>
              <button 
                onClick={() => setRankType('assists')} 
                className={`px-3 py-1 text-[11px] font-black rounded-md transition-all ${rankType === 'assists' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                👟 助攻榜
              </button>
            </div>
          )}
        </div>

        {/* 🔢 纯净统计面板 */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
          <div className="text-slate-500 font-medium whitespace-nowrap flex items-center flex-wrap gap-1.5">
            <span>当前榜单青年新星总数：</span>
            <span className="font-mono font-black text-emerald-600 text-sm bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{currentPlayerCount}</span> 
            <span className="font-medium text-slate-500">人</span>
            
            {(birthFrom !== 'all' || birthTo !== 'all') && (
              <span className="ml-1 text-[11px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded whitespace-nowrap inline-block">
                ⏳ 年龄筛选：{birthFrom === 'all' ? '最早' : `${birthFrom}年`} 至 {birthTo === 'all' ? '最晚' : `${birthTo}年`}
              </span>
            )}
          </div>
        </div>

        <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-white border border-gray-200 rounded-xl shadow-sm">
          <table className="min-w-[800px] w-full text-left border-collapse table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold">
              <tr>
                <th className="py-4 pl-6 w-16 text-center">排名</th>
                <th className="w-36">球员姓名</th>
                <th className="w-20 text-center">出生年</th>
                <th className="w-24 text-center">联赛级别</th>
                <th className="pl-4 w-44">所属俱乐部</th>
                {subTab === 'total' && <th className="w-24 text-center">产出轮次</th>}
                <th className="w-20 text-center text-xs font-bold">⚽ 进球数</th>
                <th className="w-20 text-center text-xs font-bold">👟 助攻数</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={subTab === 'total' ? "8" : "7"} className="text-center py-16 text-slate-400 text-xs animate-pulse">⚡ 正在处理实时数据库...</td></tr>
              ) : (subTab === 'total' ? aggregatedTotalData : roundData).map((item, index) => {
                const lName = item.league;
                const pName = subTab === 'total' ? item.name : (item.players?.name || '未知');
                const pBirth = subTab === 'total' ? item.birth_year : (item.players?.birth_year || '--');
                const cName = subTab === 'total' ? item.club_name : (item.clubs?.name || '自由身');
                return (
                  <tr key={item.id} className="text-xs text-slate-700 border-b border-slate-100 transition-colors" style={{ backgroundColor: getRowBgColor(index, lName) }}>
                    <td className="text-center py-3.5 font-mono font-black text-slate-400/80 text-[13px]">{index + 1}</td>
                    <td className="font-black text-slate-900 text-[14px] tracking-wider truncate">{pName}</td>
                    <td className="text-center font-mono font-bold text-slate-500">{pBirth}</td>
                    <td className="text-center font-semibold text-slate-500">{lName}</td>
                    <td className="pl-4 font-black text-emerald-800 truncate">{cName}</td>
                    {subTab === 'total' && <td className="text-center font-mono font-bold text-slate-500">{item.appearances} 轮</td>}
                    <td className="text-center font-mono font-black text-[14px] text-green-700">{item.goals}</td>
                    <td className="text-center font-mono font-black text-[14px] text-blue-700">
                      {lName === '中女超' ? (
                        <span className="text-slate-300 font-bold font-sans">--</span>
                      ) : (
                        item.assists
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}