function getBaseStyles(): string {
  return `
    :root {
      --bg-primary: #081019;
      --bg-panel: #101b20;
      --bg-card: #162329;
      --bg-card-hover: #213038;
      --bg-surface: #0d1117;
      --accent-gold: #d4a843;
      --accent-gold-bright: #f0c955;
      --accent-gold-dim: rgba(212, 168, 67, 0.12);
      --accent-gold-glow: rgba(212, 168, 67, 0.35);
      --accent-teal: #2dd4bf;
      --accent-teal-dim: rgba(45, 212, 191, 0.1);
      --text-primary: #e8eaed;
      --text-secondary: #7a8ba3;
      --text-muted: #4a5568;
      --positive: #34d399;
      --negative: #f87171;
      --warning: #fbbf24;
      --border: rgba(217, 237, 235, 0.1);
      --border-light: rgba(230, 246, 244, 0.16);
      --border-gold: rgba(212, 168, 67, 0.25);
      --shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      --shadow-lg: 0 12px 48px rgba(0, 0, 0, 0.6);
      --shadow-gold: 0 0 20px rgba(212, 168, 67, 0.25);
      --radius: 10px;
      --radius-sm: 6px;
      --radius-lg: 14px;
      --glass-bg: rgba(12, 25, 30, 0.9);
      --glass-border: rgba(229, 244, 240, 0.14);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: var(--bg-primary); }
    #app { width: 100%; height: 100%; }
    .game-ui {
      position: absolute; inset: 0; pointer-events: none;
      font: 13px/1.4 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: var(--text-primary); user-select: none;
    }
    .ui-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ui-icon svg { width: 100%; height: 100%; }
  `;
}

function getTopBarStyles(): string {
  return `
    .topbar { pointer-events: none; position: absolute; inset: 0; z-index: 10; }
    .topbar-city, .topbar-stats, .topbar-time, .topbar-right { pointer-events: auto; background: var(--glass-bg); backdrop-filter: blur(16px) saturate(1.15); border: 1px solid var(--glass-border); box-shadow: var(--shadow-lg); }
    .topbar-city { position: absolute; left: 12px; top: 12px; width: 238px; height: 64px; display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 11px; }
    .topbar-level { 
      width: 40px; height: 40px; 
      background: #172630;
      color: var(--text-primary);
      border: 2px solid #8bc9e3;
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
      display: flex; align-items: center; justify-content: center; 
      font-weight: 800; font-size: 16px;
      filter: drop-shadow(0 0 8px rgba(83, 184, 231, 0.35));
      position: relative;
    }
    .topbar-level::after {
      content: '';
      position: absolute;
      inset: -3px;
      background: #8bc9e3;
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
      opacity: 0.15;
      z-index: -1;
      filter: blur(4px);
    }
    .topbar-city-details { min-width: 0; flex: 1; }
    .topbar-city-name { font-weight: 800; font-size: 14px; letter-spacing: 0.8px; text-transform: uppercase; }
    .topbar-city-progress { height: 7px; margin-top: 8px; overflow: hidden; background: #3a464b; border-radius: 99px; }
    .topbar-city-progress span { display: block; width: 46%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #e19a26, #f5bf36); box-shadow: 0 0 10px rgba(242, 181, 48, 0.42); }
    .topbar-stats { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); height: 58px; display: flex; align-items: stretch; border-radius: 11px; overflow: hidden; }
    .topbar-stat { min-width: 142px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 0 20px; gap: 1px; border-right: 1px solid var(--border); }
    .topbar-stat:last-child { border-right: 0; }
    .topbar-stat-main { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; letter-spacing: 0.2px; }
    .topbar-stat-icon { font-size: 24px; line-height: 1; font-weight: 900; }
    .topbar-stat-icon.positive { color: var(--positive); }
    .topbar-stat-icon.population { color: #5db8e4; font-size: 20px; }
    .topbar-stat-icon.gold { color: #f3bb2d; }
    .topbar-stat-sub { padding-left: 30px; font-size: 10px; font-weight: 700; color: var(--text-secondary); }
    .topbar-stat-sub.positive { color: var(--positive); }
    .topbar-stat-sub.negative { color: var(--negative); }
    .topbar-time { position: absolute; left: 12px; top: 84px; height: 39px; display: flex; align-items: center; border-radius: 8px; padding: 0 10px; }
    .topbar-date { padding-right: 10px; font-size: 11px; color: var(--text-primary); font-weight: 700; letter-spacing: 0.2px; }
    .topbar-right { position: absolute; right: 12px; top: 12px; display: flex; align-items: center; gap: 7px; padding: 8px; border-radius: 10px; }
  `;
}

function getSidebarStyles(): string {
  return `
    .sidebar { 
      pointer-events: auto; position: absolute; left: 12px; top: 294px; width: 70px;
      background: var(--glass-bg); backdrop-filter: blur(12px);
      border: 1px solid var(--glass-border); border-radius: var(--radius-lg); 
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column; 
      align-items: center; padding: 6px 0; gap: 1px; z-index: 10;
    }
    .sidebar-btn { 
      pointer-events: auto; width: 62px; height: 32px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
      background: transparent; border: none; border-radius: var(--radius-sm); 
      color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; position: relative; 
    }
    .sidebar-btn:hover { background: var(--bg-card); color: var(--text-primary); }
    .sidebar-btn.active { 
      background: linear-gradient(180deg, #f5c43a 0%, #dca624 100%);
      color: #162128;
      box-shadow: 0 3px 12px rgba(238, 177, 37, 0.3);
    }
    .sidebar-btn.active::before {
      display: none;
    }
    .sidebar-btn .ui-icon { width: 17px; height: 17px; }
    .sidebar-btn-label { 
      font-size: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;
      opacity: 0.82;
    }
    .sidebar-btn.active .sidebar-btn-label { opacity: 1; }
    .sidebar-tooltip { display: none; position: absolute; left: 56px; top: 50%; transform: translateY(-50%); background: var(--bg-card); color: var(--text-primary); padding: 6px 12px; border-radius: var(--radius-sm); font-size: 12px; white-space: nowrap; z-index: 100; border: 1px solid var(--border-light); box-shadow: var(--shadow); }
    .sidebar-btn:hover .sidebar-tooltip { display: block; }
    .sidebar-separator { width: 42px; height: 1px; background: var(--border); margin: 2px 0; }
  `;
}

function getBottomPanelStyles(): string {
  return `
    .bottom-panel { 
      pointer-events: auto; position: absolute; left: clamp(276px, 25vw, 340px); right: clamp(280px, 24vw, 360px); bottom: 0; height: clamp(220px, 28vh, 244px);
      background: var(--glass-bg); backdrop-filter: blur(12px);
      border: 1px solid var(--glass-border); border-radius: var(--radius-lg); 
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column; z-index: 10; overflow: hidden; 
    }
    .bottom-tabs { display: flex; border-bottom: 1px solid var(--border); padding: 0 12px; gap: 0; flex-shrink: 0; background: rgba(0,0,0,0.12); overflow-x: auto; scrollbar-width: none; }
    .bottom-tabs::-webkit-scrollbar { display: none; }
    .bottom-tab { 
      pointer-events: auto; flex: 0 0 auto; padding: 10px 20px; font-size: 11px; font-weight: 700; 
      text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); 
      background: none; border: none; border-bottom: 2px solid transparent; 
      cursor: pointer; transition: all 0.2s ease; 
    }
    .bottom-tab:hover { color: var(--text-primary); }
    .bottom-tab.active { 
      color: #172128; 
      border-bottom-color: transparent;
      background: linear-gradient(180deg, #f5c43a, #e3ab28);
      border-radius: 6px 6px 0 0;
    }
    .bottom-content { 
      flex: 1 1 auto; min-height: 0; overflow-x: auto; overflow-y: hidden; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(92px, 1fr); grid-template-rows: minmax(124px, 1fr); gap: 8px;
      padding: 10px 16px 12px; scrollbar-width: thin; scrollbar-color: var(--bg-card) transparent; 
    }
    .bottom-content::-webkit-scrollbar { width: 4px; height: 4px; }
    .bottom-content::-webkit-scrollbar-track { background: transparent; }
    .bottom-content::-webkit-scrollbar-thumb { background: var(--bg-card); border-radius: 2px; }
    .item-card { 
      pointer-events: auto; width: 100%; height: 100%; min-width: 0;
      background: transparent; 
      border: 1px solid transparent; border-radius: 6px; 
      display: grid; grid-template-rows: 36px minmax(24px, auto) minmax(22px, auto) 16px; justify-items: center; align-content: center; gap: 5px; 
      color: inherit; font: inherit; cursor: pointer; transition: all 0.2s ease; padding: 8px 6px; position: relative;
      box-shadow: none;
    }
    .item-card:hover { 
      background: rgba(255,255,255,0.06); 
      border-color: var(--border-light); 
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }
    .item-card.active { 
      background: linear-gradient(180deg, rgba(212, 168, 67, 0.18) 0%, rgba(212, 168, 67, 0.06) 100%); 
      border-color: var(--accent-gold);
      box-shadow: 0 0 16px var(--accent-gold-glow);
    }
    .item-card.active::before {
      display: none;
    }
    .item-card.active .item-card-icon { color: var(--accent-gold); }
    .item-card-icon { width: 36px; height: 36px; color: var(--text-secondary); }
    .item-card-icon .ui-icon { width: 36px; height: 36px; }
    .item-card-label { 
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; 
      color: var(--text-secondary); text-align: center; line-height: 1.15; overflow-wrap: anywhere; 
    }
    .item-card-requirement { font-size: 9px; color: var(--text-muted); text-align: center; line-height: 1.2; }
    .item-card.active .item-card-label { color: var(--accent-gold); }
    .item-card-cost { font-size: 10px; color: var(--text-muted); font-weight: 500; align-self: end; }
    .item-card.locked { opacity: 0.35; cursor: not-allowed; }
    .bottom-hint { 
      display: flex; align-items: center; justify-content: center; gap: 20px; 
      padding: 6px 16px; border-top: 1px solid var(--border); 
      font-size: 11px; color: var(--text-muted); flex-shrink: 0;
      background: rgba(0, 0, 0, 0.2);
    }
    .bottom-hint kbd { 
      display: inline-flex; align-items: center; justify-content: center; 
      min-width: 22px; height: 20px; padding: 0 6px; 
      background: var(--bg-card); border: 1px solid var(--border-light); 
      border-radius: 4px; font-family: inherit; font-size: 10px; 
      color: var(--text-secondary); font-weight: 600;
    }
  `;
}

function getRightPanelStyles(): string {
  return `
    .right-panel { pointer-events: none; position: absolute; right: 12px; top: 128px; width: 252px; z-index: 10; }
    .right-panel-section { pointer-events: auto; padding: 14px; margin-bottom: 10px; background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--glass-border); border-radius: var(--radius); box-shadow: var(--shadow); }
    .right-panel-section[data-ui="inspector"], .right-panel-section[data-ui="projects"], .right-panel-section[data-ui="save-controls"] { display: none; }
    .right-panel.has-selection .right-panel-section[data-ui="inspector"] { display: block; }
    .right-panel.dashboard-active { top: auto; bottom: 28px; }
    .right-panel.dashboard-active .right-panel-section[data-ui="overview"], .right-panel.dashboard-active .right-panel-section[data-ui="inspector"] { display: none; }
    .right-panel.dashboard-active .right-panel-section[data-ui="notifications"], .right-panel.dashboard-active .right-panel-section[data-ui="projects"] { display: block; }
    .right-panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .right-panel-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); }
    .city-overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 12px; }
    .city-overview-stat { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .city-overview-stat span { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .city-overview-stat strong { font-size: 12px; color: var(--text-primary); white-space: nowrap; }
    .city-overview-stat strong.positive { color: var(--positive); }
    .city-overview-stat strong.negative { color: var(--negative); }
    .zone-legend-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .zone-legend-dot { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
    .zone-legend-label { font-size: 12px; font-weight: 600; }
    .zone-legend-desc { font-size: 10px; color: var(--text-muted); }
    .notification-item { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; }
    .notification-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .notification-icon.warning { background: rgba(248, 113, 113, 0.15); color: var(--negative); }
    .notification-icon.commercial { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
    .notification-icon .ui-icon { width: 14px; height: 14px; }
    .notification-text { flex: 1; min-width: 0; }
    .notification-title { font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .notification-desc { font-size: 10px; color: var(--text-muted); }
  `;
}

function getMinimapStyles(): string {
  return `
    .minimap { pointer-events: auto; position: absolute; left: 12px; bottom: 28px; width: 128px; background: var(--glass-bg); backdrop-filter: blur(14px); border: 1px solid var(--glass-border); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; z-index: 10; }
    .minimap-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid var(--border); }
    .minimap-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); }
    .minimap-controls { display: flex; gap: 2px; }
    .minimap-btn { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border: 1px solid var(--border); border-radius: 3px; color: var(--text-secondary); cursor: pointer; padding: 0; }
    .minimap-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
    .minimap-btn .ui-icon { width: 12px; height: 12px; }
    .minimap canvas { display: block; width: 100%; aspect-ratio: 1; }
  `;
}

function getDashboardStyles(): string {
  return `
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; padding: 10px 12px; flex: 1; overflow-y: auto; }
    .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; }
    .stat-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .stat-card-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); }
    .stat-card-value { font-size: 20px; font-weight: 700; }
    .stat-card-sub { font-size: 11px; color: var(--text-secondary); }
    .stat-card-sub.positive { color: var(--positive); }
    .stat-card-sub.negative { color: var(--negative); }
    .stat-card-chart { margin-top: 8px; height: 40px; }
    .stat-card-chart svg { width: 100%; height: 100%; }
    .stat-card-detail { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10px; color: var(--text-muted); }
    .stat-card-detail span:last-child { color: var(--text-secondary); font-weight: 600; }
    .donut-chart { width: 60px; height: 60px; margin: 4px auto; }
    .donut-legend { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; }
    .donut-legend-item { display: flex; align-items: center; gap: 6px; font-size: 10px; }
    .donut-legend-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  `;
}

function getMiscStyles(): string {
  return `
    .speed-controls { display: flex; align-items: center; gap: 3px; padding-left: 10px; border-left: 1px solid var(--border); }
    .speed-btn { pointer-events: auto; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; background: transparent; border: 0; border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease; font-size: 10px; font-weight: 700; }
    .speed-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
    .speed-btn.active { background: var(--accent-gold); color: var(--bg-primary); border-color: var(--accent-gold); }
    .speed-btn .ui-icon { width: 14px; height: 14px; }
    .icon-btn { pointer-events: auto; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: rgba(5, 13, 17, 0.42); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); cursor: pointer; transition: all 0.15s ease; padding: 0; }
    .icon-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
    .icon-btn.active { background: rgba(28, 49, 54, 0.95); color: var(--text-primary); border-color: var(--border-light); }
    .icon-btn .ui-icon { width: 16px; height: 16px; }
    .status-bar { pointer-events: none; position: absolute; bottom: 244px; left: 50%; transform: translateX(-50%); background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px 12px; font-size: 11px; color: var(--text-secondary); z-index: 10; opacity: 0; transition: opacity 0.3s ease; }
    .status-bar.visible { opacity: 1; }
    .objective-panel { pointer-events: auto; position: absolute; left: 12px; top: 133px; width: 238px; max-height: 153px; overflow-y: auto; padding: 8px 12px; background: var(--glass-bg); backdrop-filter: blur(12px); border: 1px solid var(--glass-border); border-radius: var(--radius); box-shadow: var(--shadow); z-index: 10; }
    .objective-panel-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--accent-gold); }
    .objective-panel-label { margin-top: 2px; font-size: 12px; font-weight: 700; }
    .objective-panel-progress, .objective-panel-hint, .objective-panel-unlock, .objective-panel-happiness { font-size: 10px; color: var(--text-secondary); }
    .objective-panel-hint { margin-top: 3px; }
    .objective-panel-unlock { color: var(--accent-teal); }
    .objective-panel-happiness { margin-top: 4px; color: var(--warning); }
    .demand-mini { display: flex; gap: 3px; align-items: flex-end; height: 24px; }
    .demand-bar { width: 8px; background: var(--bg-card); border-radius: 2px; position: relative; overflow: hidden; }
    .demand-bar-fill { position: absolute; bottom: 0; left: 0; right: 0; border-radius: 2px; transition: height 0.3s ease; }
    .demand-bar-fill.residential { background: #4ade80; }
    .demand-bar-fill.commercial { background: #60a5fa; }
    .demand-bar-fill.industrial { background: #fb923c; }
    @media (max-width: 1100px) {
      .topbar-stats { left: 280px; transform: none; }
      .topbar-stat { min-width: 112px; padding: 0 12px; }
      .topbar-stat:nth-child(4) { display: none; }
      .bottom-panel { left: 246px; right: 22px; }
      .right-panel { display: none; }
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--bg-card); border-radius: 2px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--bg-card-hover); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.2s ease; }
  `;
}

export function injectTheme(): void {
  const style = document.createElement("style");
  style.textContent = [
    getBaseStyles(),
    getTopBarStyles(),
    getSidebarStyles(),
    getBottomPanelStyles(),
    getRightPanelStyles(),
    getMinimapStyles(),
    getDashboardStyles(),
    getMiscStyles(),
  ].join("\n");
  document.head.appendChild(style);
}
