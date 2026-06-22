import type { CityState, TimeState, UIState } from "../../shared/types";
import { icon } from "./icons";

export interface TopBarElements {
  root: HTMLElement;
  cityName: HTMLElement;
  level: HTMLElement;
  money: HTMLElement;
  moneySub: HTMLElement;
  population: HTMLElement;
  populationSub: HTMLElement;
  happiness: HTMLElement;
  happinessSub: HTMLElement;
  power: HTMLElement;
  powerSub: HTMLElement;
  date: HTMLElement;
  soundBtn: HTMLElement;
  settingsBtn: HTMLElement;
  demandBars: HTMLElement;
  speedControls: HTMLElement;
}

let lastRenderedSpeed: number | null = null;
let lastRenderedDate = "";

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function findEl(root: HTMLElement, key: string): HTMLElement {
  return root.querySelector(`[data-ui='${key}']`) ?? document.createElement("div");
}

export function createTopBar(): TopBarElements {
  const root = document.createElement("div");
  root.className = "topbar";

  root.innerHTML = `
    <div class="topbar-city">
      <div class="topbar-level" data-ui="level">1</div>
      <div class="topbar-city-details">
        <div class="topbar-city-name" data-ui="city-name">NOVAVISTA</div>
        <div class="topbar-city-progress"><span></span></div>
      </div>
    </div>
    <div class="topbar-stats">
      <div class="topbar-stat">
        <div class="topbar-stat-main">
          <span class="topbar-stat-icon positive">$</span>
          <span data-ui="money">0</span>
        </div>
        <div class="topbar-stat-sub positive" data-ui="money-sub">+$0 /h</div>
      </div>
      <div class="topbar-stat">
        <div class="topbar-stat-main">
          <span class="topbar-stat-icon population">\u{1F464}</span>
          <span data-ui="population">0</span>
        </div>
        <div class="topbar-stat-sub positive" data-ui="population-sub">+0 /h</div>
      </div>
      <div class="topbar-stat">
        <div class="topbar-stat-main">
          <span class="topbar-stat-icon gold">\u{1F60A}</span>
          <span data-ui="happiness">0%</span>
        </div>
        <div class="topbar-stat-sub" data-ui="happiness-sub">HAPPY</div>
      </div>
      <div class="topbar-stat">
        <div class="topbar-stat-main">
          <span class="topbar-stat-icon gold">\u26A1</span>
          <span data-ui="power">0 MW</span>
        </div>
        <div class="topbar-stat-sub positive" data-ui="power-sub">+0 /h</div>
      </div>
    </div>
    <div class="topbar-time">
      <span class="topbar-date" data-ui="date">January 1, Year 1 · 08:00</span>
      <div class="speed-controls" data-ui="speed-controls"></div>
    </div>
    <div class="topbar-right">
      <button class="icon-btn" data-action="sound" data-ui="sound-btn" aria-pressed="true" title="Toggle sound"></button>
      <button class="icon-btn" data-action="stats" data-ui="settings-btn" title="Statistics"></button>
    </div>
  `;

  return {
    root,
    cityName: findEl(root, "city-name"),
    level: findEl(root, "level"),
    money: findEl(root, "money"),
    moneySub: findEl(root, "money-sub"),
    population: findEl(root, "population"),
    populationSub: findEl(root, "population-sub"),
    happiness: findEl(root, "happiness"),
    happinessSub: findEl(root, "happiness-sub"),
    power: findEl(root, "power"),
    powerSub: findEl(root, "power-sub"),
    date: findEl(root, "date"),
    soundBtn: findEl(root, "sound-btn"),
    settingsBtn: findEl(root, "settings-btn"),
    demandBars: findEl(root, "demand-mini"),
    speedControls: findEl(root, "speed-controls"),
  };
}

function updateMoneyDisplay(els: TopBarElements, state: CityState): void {
  els.money.textContent = formatMoney(state.economy.money);
  const cashFlow = state.economy.monthlyIncome - state.economy.monthlyExpenses;
  const sign = cashFlow >= 0 ? "+" : "";
  els.moneySub.textContent = `${sign}${formatMoney(cashFlow)} /mo`;
  const cls = cashFlow >= 0 ? "positive" : "negative";
  els.moneySub.className = `topbar-stat-sub ${cls}`;
}

function updatePopDisplay(els: TopBarElements, state: CityState): void {
  els.population.textContent = state.population.total.toLocaleString("en-US");
  const growth = state.population.growthRate;
  const sign = growth >= 0 ? "+" : "";
  els.populationSub.textContent = `${sign}${Math.round(growth)} /mo`;
  els.populationSub.className = `topbar-stat-sub ${growth >= 0 ? "positive" : "negative"}`;
}

function updateHappyDisplay(els: TopBarElements, state: CityState): void {
  els.happiness.textContent = `${state.happiness.value}%`;
  const h = state.happiness.value;
  els.happinessSub.textContent = h >= 70 ? "HAPPY" : h >= 40 ? "NEUTRAL" : "UNHAPPY";
  const cls = h >= 70 ? "positive" : h < 40 ? "negative" : "";
  els.happinessSub.className = `topbar-stat-sub ${cls}`;
}

function updatePowerDisplay(els: TopBarElements, state: CityState): void {
  const net = state.services.powerCapacity - state.services.powerDemand;
  els.power.textContent = `${state.services.powerCapacity} MW`;
  const sign = net >= 0 ? "+" : "";
  els.powerSub.textContent = `${sign}${net} MW`;
  els.powerSub.className = `topbar-stat-sub ${net >= 0 ? "positive" : "negative"}`;
}

export function updateTopBar(
  els: TopBarElements,
  state: CityState,
  uiState: UIState,
): void {
  updateMoneyDisplay(els, state);
  updatePopDisplay(els, state);
  updateHappyDisplay(els, state);
  updatePowerDisplay(els, state);

  updateCalendarClock(els, state.time);
  els.level.textContent = String(state.progression.currentMilestone + 1);

  updateDemandMini(els.demandBars, state);
  updateSpeedControls(els.speedControls, state.time.speed);

  els.soundBtn.innerHTML = uiState.settings.soundEnabled
    ? icon("sound", 16)
    : icon("soundOff", 16);
  els.soundBtn.classList.toggle("active", uiState.settings.soundEnabled);
  els.settingsBtn.innerHTML = icon("stats", 18);
}

export function updateCalendarClock(els: TopBarElements, time: TimeState): void {
  const formatted = formatCalendarDate({ time });
  if (formatted === lastRenderedDate) return;
  lastRenderedDate = formatted;
  els.date.textContent = formatted;
}

function formatCalendarDate(state: { time: TimeState }): string {
  const date = new Date(Date.UTC(state.time.year, state.time.month - 1, state.time.day));
  const month = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(date);
  const hour = String(state.time.hour).padStart(2, "0");
  return `${month} ${state.time.day}, Year ${state.time.year} · ${hour}:00`;
}

function updateDemandMini(container: HTMLElement, state: CityState): void {
  const demand = state.demand;
  container.innerHTML = `
    <div class="demand-bar" style="height:24px" title="Residential: ${demand.residential}%">
      <div class="demand-bar-fill residential" style="height:${demand.residential}%"></div>
    </div>
    <div class="demand-bar" style="height:24px" title="Commercial: ${demand.commercial}%">
      <div class="demand-bar-fill commercial" style="height:${demand.commercial}%"></div>
    </div>
    <div class="demand-bar" style="height:24px" title="Industrial: ${demand.industrial}%">
      <div class="demand-bar-fill industrial" style="height:${demand.industrial}%"></div>
    </div>
  `;
}

function updateSpeedControls(container: HTMLElement, speed: number): void {
  if (speed === lastRenderedSpeed) return;
  lastRenderedSpeed = speed;
  const speeds = [
    { label: "\u23F8", speed: 0, title: "Pause" },
    { label: "\u25B6", speed: 1, title: "1x speed" },
    { label: "\u23E9", speed: 2, title: "2x speed" },
    { label: "\u23ED", speed: 3, title: "3x speed" },
  ];

  container.innerHTML = speeds
    .map(
      (s) =>
        `<button class="speed-btn ${speed === s.speed ? "active" : ""}" data-action="speed" data-speed="${s.speed}" title="${s.title}" aria-label="${s.title}" aria-pressed="${speed === s.speed}">${s.label}</button>`,
    )
    .join("");
}
