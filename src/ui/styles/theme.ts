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
    .topbar-shell { position: absolute; left: 16px; right: 16px; top: 14px; min-height: 72px; display: flex; align-items: flex-start; gap: 16px; pointer-events: none; }
    .topbar-stats, .topbar-time { pointer-events: auto; background: rgba(7, 20, 25, 0.88); backdrop-filter: blur(18px) saturate(1.2); border: 1px solid rgba(150, 191, 201, 0.32); border-radius: 10px; box-shadow: 0 16px 42px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.05); }
    .topbar-stats { display: flex; min-width: 0; height: 72px; overflow: hidden; }
    .topbar-stat { min-width: 0; width: 162px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 0 20px; gap: 3px; border-right: 1px solid rgba(205, 236, 234, 0.13); }
    .topbar-stat:last-child { border-right: 0; }
    .topbar-stat-main { display: flex; align-items: center; gap: 11px; max-width: 100%; font-weight: 800; font-size: 18px; letter-spacing: 0; white-space: nowrap; color: #edf7f7; }
    .topbar-stat-main span:last-child { overflow: visible; text-overflow: clip; }
    .topbar-stat-icon { width: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; line-height: 1; font-weight: 900; flex-shrink: 0; }
    .topbar-stat-icon.money { color: var(--accent-teal); text-shadow: 0 0 12px rgba(45, 212, 191, 0.45); }
    .topbar-stat-icon.population { color: #55a9ff; font-size: 24px; }
    .topbar-stat-icon.happiness { color: #f6b53c; font-size: 23px; }
    .topbar-stat-icon.power { color: #f6b53c; }
    .topbar-stat-icon.water { color: #45c7f1; }
    .topbar-stat-icon.water .ui-icon { width: 24px; height: 24px; }
    .topbar-stat-sub { padding-left: 39px; font-size: 11px; line-height: 1.05; font-weight: 800; color: var(--text-secondary); white-space: nowrap; }
    .topbar-stat-sub.positive { color: var(--positive); }
    .topbar-stat-sub.negative { color: var(--negative); }
    .topbar-time { margin-left: auto; height: 72px; display: flex; align-items: center; padding: 0 14px 0 20px; gap: 13px; }
    .topbar-date { min-width: 88px; font-size: 12px; line-height: 1.32; color: var(--text-primary); font-weight: 800; letter-spacing: 0; text-align: left; }
    .topbar-weather { color: #f6c34a; font-size: 19px; width: 22px; text-align: center; text-shadow: 0 0 16px rgba(246, 195, 74, 0.45); }
    .topbar-control-divider { width: 1px; align-self: stretch; background: rgba(205, 236, 234, 0.13); margin: 0 2px; }
    .topbar-sound-btn, .topbar-stats-btn { pointer-events: auto; display: flex; align-items: center; justify-content: center; background: transparent; border: 0; color: var(--text-secondary); cursor: pointer; transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease; padding: 0; }
    .topbar-sound-btn { display: none; }
    .topbar-stats-btn { width: 38px; height: 38px; border-radius: 8px; }
    .topbar-stats-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.06); }
    .topbar-speed-label { min-width: 22px; font-size: 13px; font-weight: 700; color: var(--text-primary); text-align: center; }
  `;
}

function getSidebarStyles(): string {
  return `
    .sidebar { 
      pointer-events: auto; position: absolute; left: 16px; top: 282px; width: 78px;
      background: rgba(9, 22, 30, 0.88); backdrop-filter: blur(16px);
      border: 1px solid rgba(150, 191, 201, 0.32); border-radius: 10px; 
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column; 
      align-items: center; padding: 8px 0; gap: 2px; z-index: 10;
    }
    .sidebar-btn { 
      pointer-events: auto; width: 66px; height: 54px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
      background: transparent; border: none; border-radius: 8px; 
      color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; position: relative; 
    }
    .sidebar-btn:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
    .sidebar-btn.active { 
      background: rgba(41, 104, 92, 0.52);
      color: #eafff8;
      box-shadow: inset 0 0 0 1px rgba(84, 225, 188, 0.36);
    }
    .sidebar-btn.active::before {
      display: none;
    }
    .sidebar-btn .ui-icon { width: 23px; height: 23px; }
    .sidebar-btn-label { 
      font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.35px;
      opacity: 0.82;
    }
    .sidebar-btn.active .sidebar-btn-label { opacity: 1; }
    .sidebar-tooltip { display: none; position: absolute; left: 72px; top: 50%; transform: translateY(-50%); background: var(--bg-card); color: var(--text-primary); padding: 6px 12px; border-radius: var(--radius-sm); font-size: 12px; white-space: nowrap; z-index: 100; border: 1px solid var(--border-light); box-shadow: var(--shadow); }
    .sidebar-btn:hover .sidebar-tooltip { display: block; }
    .sidebar-separator { width: 46px; height: 1px; background: var(--border); margin: 3px 0; }
  `;
}

function getBottomPanelStyles(): string {
  return `
    .bottom-panel { 
      pointer-events: auto; position: absolute; left: clamp(300px, 24vw, 430px); right: clamp(300px, 24vw, 430px); bottom: 18px; height: clamp(202px, 26vh, 220px);
      background: rgba(9, 22, 30, 0.91); backdrop-filter: blur(18px) saturate(1.12);
      border: 1px solid rgba(150, 191, 201, 0.32); border-radius: 10px; 
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column; z-index: 10; overflow: hidden; 
    }
    .bottom-tabs { display: flex; border-bottom: 1px solid rgba(205, 236, 234, 0.12); padding: 0 12px; gap: 0; flex-shrink: 0; background: rgba(0,0,0,0.18); overflow-x: auto; scrollbar-width: none; }
    .bottom-tabs::-webkit-scrollbar { display: none; }
    .bottom-tab { 
      pointer-events: auto; flex: 0 0 auto; min-width: 102px; padding: 10px 14px; font-size: 11px; font-weight: 800; 
      text-transform: uppercase; letter-spacing: 0.7px; color: #aebccd; 
      background: none; border: none; border-bottom: 2px solid transparent; 
      cursor: pointer; transition: all 0.2s ease; 
    }
    .bottom-tab:hover { color: var(--text-primary); }
    .bottom-tab.active { 
      color: #eafff8; 
      border-bottom-color: transparent;
      background: rgba(41, 104, 92, 0.7);
      border-radius: 6px 6px 0 0;
    }
    .bottom-content { 
      flex: 1 1 auto; min-height: 0; overflow-x: auto; overflow-y: hidden; display: grid; grid-auto-flow: column; grid-auto-columns: 232px; grid-template-rows: minmax(0, 1fr); justify-content: start; gap: 10px;
      padding: 9px 14px; scrollbar-width: thin; scrollbar-color: var(--bg-card) transparent; 
    }
    .bottom-content::-webkit-scrollbar { width: 4px; height: 4px; }
    .bottom-content::-webkit-scrollbar-track { background: transparent; }
    .bottom-content::-webkit-scrollbar-thumb { background: var(--bg-card); border-radius: 2px; }
    .item-card { 
      pointer-events: auto; width: 100%; height: 100%; min-width: 0;
      background: rgba(255,255,255,0.045); 
      border: 1px solid rgba(205, 236, 234, 0.08); border-radius: 7px; 
      display: grid; grid-template-columns: 62px minmax(0, 1fr); grid-template-rows: min-content minmax(18px, min-content) 1fr; justify-items: start; align-content: start; gap: 4px 10px; 
      color: inherit; font: inherit; cursor: pointer; transition: all 0.2s ease; padding: 8px 10px; position: relative;
      box-shadow: none; overflow: hidden;
    }
    .item-card:hover { 
      background: rgba(255,255,255,0.07); 
      border-color: var(--border-light); 
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }
    .item-card.active { 
      background: rgba(29, 74, 67, 0.58); 
      border-color: rgba(78, 222, 180, 0.75);
      box-shadow: inset 0 0 0 1px rgba(78, 222, 180, 0.35), 0 0 22px rgba(45, 212, 191, 0.14);
    }
    .item-card.active::before {
      display: none;
    }
    .item-card.active .item-card-icon { color: var(--accent-teal); }
    .item-card.active .item-card-thumbnail { border-color: rgba(78, 222, 180, 0.55); }
    .item-card-icon { grid-column: 1; grid-row: 1 / span 2; width: 40px; height: 40px; color: var(--text-secondary); justify-self: center; align-self: center; }
    .item-card-icon .ui-icon { width: 40px; height: 40px; }
    .item-card-thumbnail { grid-column: 1; grid-row: 1 / span 2; width: 62px; height: 44px; border-radius: 6px; overflow: hidden; background: rgba(5, 11, 15, 0.76); border: 1px solid rgba(205, 236, 234, 0.1); display: flex; align-items: center; justify-content: center; justify-self: center; align-self: center; }
    .item-card-thumbnail img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .item-card-label { 
      grid-column: 2; grid-row: 1; min-width: 0;
      font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.45px; 
      color: #d2d9df; text-align: left; line-height: 1.1; overflow-wrap: anywhere; 
    }
    .item-card-requirement { grid-column: 2; grid-row: 2; min-width: 0; font-size: 8px; color: #8d9aa8; text-align: left; line-height: 1.2; min-height: 18px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .item-card-requirement.empty { visibility: hidden; }
    .item-card.active .item-card-label { color: #f2fffb; }
    .item-card-stats { grid-column: 1 / -1; grid-row: 3; width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px 8px; align-self: end; }
    .item-card-road .item-card-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .item-card-stat { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .item-card-stat span { font-size: 7px; line-height: 1.05; color: #7f8b98; text-transform: uppercase; letter-spacing: 0.25px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-card-stat strong { font-size: 9px; line-height: 1.05; color: #cbd6df; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-card-stat.positive strong { color: var(--positive); }
    .item-card-stat.warning strong { color: var(--warning); }
    .item-card-stat.negative strong { color: var(--negative); }
    .item-card-zone .item-card-icon, .item-card-building .item-card-icon { align-self: center; margin-bottom: 0; }
    .item-card.locked { opacity: 0.62; cursor: not-allowed; }
    .item-card.locked::after { content: ""; position: absolute; inset: 0; background: rgba(2, 9, 13, 0.2); pointer-events: none; }
    .road-card-preview { grid-column: 1; grid-row: 1 / span 2; width: 62px; height: 44px; border-radius: 6px; position: relative; overflow: hidden; background: linear-gradient(135deg, #23462c 0%, #476c36 55%, #1c3829 100%); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04); }
    .road-card-preview::before, .road-card-preview::after { content: ""; position: absolute; width: 26px; height: 42px; border-radius: 50% 50% 8px 8px; background: radial-gradient(circle at 50% 18%, #5d8b44 0 24%, #244d2f 25% 100%); bottom: 4px; opacity: 0.9; }
    .road-card-preview::before { left: 10px; transform: rotate(-8deg); }
    .road-card-preview::after { right: 12px; transform: rotate(10deg); }
    .road-card-road { position: absolute; left: -12px; right: -12px; top: 14px; height: 14px; transform: rotate(-28deg); background: #72654a; box-shadow: 0 0 0 2px rgba(255,255,255,0.1), inset 0 2px 0 rgba(255,255,255,0.12); }
    .road-card-preview-paved .road-card-road, .road-card-preview-local .road-card-road, .road-card-preview-collector .road-card-road, .road-card-preview-arterial .road-card-road { background: #3b4650; }
    .road-card-preview-local .road-card-road { height: 17px; }
    .road-card-preview-collector .road-card-road { height: 20px; top: 11px; }
    .road-card-preview-arterial .road-card-road { height: 23px; top: 9px; background: #2f3a42; }
    .road-card-preview-paved .road-card-road::after, .road-card-preview-local .road-card-road::after, .road-card-preview-collector .road-card-road::after, .road-card-preview-arterial .road-card-road::after { content: ""; position: absolute; left: 8px; right: 8px; top: 50%; height: 2px; transform: translateY(-50%); background: repeating-linear-gradient(90deg, rgba(255,255,255,0.7) 0 12px, transparent 12px 22px); }
    .bottom-hint { 
      display: flex; align-items: center; justify-content: center; gap: 18px; 
      padding: 5px 14px; border-top: 1px solid rgba(205, 236, 234, 0.12); 
      font-size: 11px; color: #a9b3bf; flex-shrink: 0;
      background: rgba(0, 0, 0, 0.2);
    }
    .bottom-hint kbd { 
      display: inline-flex; align-items: center; justify-content: center; 
      min-width: 20px; height: 18px; padding: 0 5px; 
      background: var(--bg-card); border: 1px solid var(--border-light); 
      border-radius: 4px; font-family: inherit; font-size: 10px; 
      color: var(--text-secondary); font-weight: 600;
    }
  `;
}

function getRightPanelStyles(): string {
  return `
    .right-panel { pointer-events: none; position: absolute; right: 16px; top: 104px; width: 326px; z-index: 10; }
    .right-panel-section { pointer-events: auto; padding: 14px; margin-bottom: 10px; background: rgba(9, 22, 30, 0.9); backdrop-filter: blur(18px) saturate(1.12); border: 1px solid rgba(150, 191, 201, 0.32); border-radius: 10px; box-shadow: var(--shadow); }
    .right-panel-section[data-ui="inspector"], .right-panel-section[data-ui="projects"], .right-panel-section[data-ui="save-controls"] { display: none; }
    .right-panel.has-selection .right-panel-section[data-ui="inspector"] { display: block; }
    .right-panel.dashboard-active { top: auto; bottom: 28px; }
    .right-panel.dashboard-active .right-panel-section[data-ui="overview"], .right-panel.dashboard-active .right-panel-section[data-ui="inspector"] { display: none; }
    .right-panel.dashboard-active .right-panel-section[data-ui="notifications"], .right-panel.dashboard-active .right-panel-section[data-ui="projects"] { display: block; }
    .right-panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .right-panel-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.1px; color: #aebccd; }
    .right-panel-header-icon { color: #aebccd; display: inline-flex; }
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
    .notification-item { display: flex; align-items: flex-start; gap: 12px; padding: 13px 12px; margin-bottom: 8px; border-radius: 7px; background: rgba(255,255,255,0.045); border: 1px solid rgba(205, 236, 234, 0.06); }
    .notification-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .notification-icon.warning { background: rgba(251, 191, 36, 0.16); color: var(--warning); }
    .notification-icon.commercial { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .notification-icon.positive { background: rgba(52, 211, 153, 0.15); color: var(--positive); }
    .notification-icon .ui-icon { width: 16px; height: 16px; }
    .notification-text { flex: 1; min-width: 0; }
    .notification-title { font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #eef5f5; }
    .notification-desc { font-size: 12px; color: #b9c3cf; line-height: 1.22; }
    .notification-meta { font-size: 11px; color: #7e8a98; margin-top: 2px; }
    .notification-footer { pointer-events: auto; width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 10px 4px 0; background: transparent; border: 0; color: #b9c3cf; font: inherit; font-size: 12px; cursor: pointer; }
    .notification-footer::after { content: ">"; font-size: 18px; line-height: 1; color: #d7e0e5; }
    .notification-footer:hover { color: var(--text-primary); }
  `;
}

function getMinimapStyles(): string {
  return `
    .minimap { pointer-events: auto; position: absolute; left: 16px; bottom: 18px; width: 248px; background: rgba(9, 22, 30, 0.9); backdrop-filter: blur(18px) saturate(1.12); border: 1px solid rgba(150, 191, 201, 0.32); border-radius: 10px; box-shadow: var(--shadow); overflow: hidden; z-index: 10; padding: 10px 10px 12px; }
    .minimap-header { display: flex; align-items: center; justify-content: space-between; padding: 0 0 8px; }
    .minimap-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #aebccd; }
    .minimap-controls { display: flex; gap: 2px; }
    .minimap-btn { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(205, 236, 234, 0.1); border-radius: 4px; color: var(--text-secondary); cursor: pointer; padding: 0; }
    .minimap-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
    .minimap-btn .ui-icon { width: 12px; height: 12px; }
    .minimap canvas { display: block; width: 100%; aspect-ratio: 1; border-radius: 6px; border: 1px solid rgba(205, 236, 234, 0.08); }
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
    .speed-controls { display: flex; align-items: center; gap: 8px; padding-left: 0; }
    .speed-btn { pointer-events: auto; min-width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.045); border: 1px solid rgba(205, 236, 234, 0.12); border-radius: 7px; color: #d5dce3; cursor: pointer; transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease; font-size: 12px; font-weight: 900; letter-spacing: 0; padding: 0; }
    .speed-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.08); }
    .speed-btn.active { color: #eafff8; background: rgba(32, 147, 104, 0.62); border-color: rgba(72, 226, 164, 0.45); }
    .speed-btn .ui-icon { width: 14px; height: 14px; }
    .icon-btn { pointer-events: auto; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: rgba(5, 13, 17, 0.42); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); cursor: pointer; transition: all 0.15s ease; padding: 0; }
    .icon-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
    .icon-btn.active { background: rgba(28, 49, 54, 0.95); color: var(--text-primary); border-color: var(--border-light); }
    .icon-btn .ui-icon { width: 16px; height: 16px; }
    .status-bar { pointer-events: none; position: absolute; bottom: 238px; left: 50%; transform: translateX(-50%); background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px 12px; font-size: 11px; color: var(--text-secondary); z-index: 10; opacity: 0; transition: opacity 0.3s ease; }
    .status-bar.visible { opacity: 1; }
    .objective-panel { pointer-events: auto; position: absolute; left: 16px; top: 104px; width: 252px; max-height: 170px; overflow-y: auto; padding: 16px 18px 14px; background: rgba(9, 22, 30, 0.9); backdrop-filter: blur(18px) saturate(1.12); border: 1px solid rgba(150, 191, 201, 0.32); border-radius: 10px; box-shadow: var(--shadow); z-index: 10; }
    .objective-panel-title { display: flex; align-items: center; gap: 9px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.9px; color: var(--warning); }
    .objective-panel-title::before { content: ""; width: 18px; height: 18px; border: 2px solid #b8c6d4; border-radius: 50%; box-shadow: inset 0 0 0 4px rgba(184,198,212,0.1); }
    .objective-panel-label { margin-top: 10px; font-size: 14px; font-weight: 800; color: #f2f7f7; }
    .objective-panel-progress, .objective-panel-hint, .objective-panel-unlock, .objective-panel-happiness { font-size: 12px; color: #b9c3cf; }
    .objective-panel-hint { margin-top: 5px; }
    .objective-panel-unlock { color: var(--accent-teal); }
    .objective-panel-happiness { margin-top: 4px; color: var(--warning); }
    .demand-mini { display: flex; gap: 3px; align-items: flex-end; height: 24px; }
    .demand-bar { width: 8px; background: var(--bg-card); border-radius: 2px; position: relative; overflow: hidden; }
    .demand-bar-fill { position: absolute; bottom: 0; left: 0; right: 0; border-radius: 2px; transition: height 0.3s ease; }
    .demand-bar-fill.residential { background: #4ade80; }
    .demand-bar-fill.commercial { background: #60a5fa; }
    .demand-bar-fill.industrial { background: #fb923c; }
    @media (max-width: 1100px) {
      .topbar-shell { gap: 10px; }
      .topbar-stat { width: auto; flex: 1 1 0; padding: 0 10px; }
      .topbar-stat:nth-child(5) { display: none; }
      .bottom-panel { left: 246px; right: 22px; }
      .right-panel { display: none; }
      .topbar-time { padding-left: 12px; gap: 8px; }
      .speed-btn { min-width: 34px; height: 34px; }
    }
    @media (max-width: 820px) {
      .topbar-shell { left: 10px; right: 10px; top: 10px; min-height: 58px; }
      .topbar-stats, .topbar-time { height: 58px; }
      .topbar-stats { flex: 0 0 130px; }
      .topbar-stat { width: 130px; padding: 0 10px; }
      .topbar-stat:nth-child(n + 2) { display: none; }
      .topbar-stat-main { gap: 6px; font-size: 12px; }
      .topbar-stat-sub { padding-left: 28px; font-size: 9px; }
      .topbar-time { min-width: 0; flex: 1 1 auto; gap: 6px; padding: 0 8px; justify-content: flex-end; }
      .topbar-date { display: none; }
      .speed-controls { gap: 5px; }
      .speed-btn { min-width: 30px; height: 30px; }
      .topbar-stats-btn { width: 30px; height: 30px; }
      .topbar-weather, .topbar-speed-label { display: none; }
      .sidebar, .minimap { display: none; }
      .bottom-panel { left: 10px; right: 10px; height: 206px; }
      .bottom-tab { min-width: 94px; padding: 10px 12px; }
      .bottom-content { grid-auto-columns: 226px; padding: 8px 12px; }
      .bottom-hint { gap: 12px; justify-content: flex-start; overflow-x: auto; }
      .objective-panel { left: 10px; top: 78px; width: 230px; }
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
