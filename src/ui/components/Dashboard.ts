import type { CityState } from "../../shared/types";

export interface DashboardElements {
  root: HTMLElement;
  content: HTMLElement;
  tabs: HTMLElement;
}

type DashboardTab =
  | "overview"
  | "finances"
  | "population"
  | "transport"
  | "environment"
  | "energy";

const TABS: { id: DashboardTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "finances", label: "Finances" },
  { id: "population", label: "Population" },
  { id: "transport", label: "Transport" },
  { id: "environment", label: "Environment" },
  { id: "energy", label: "Energy" },
];

function findEl(root: HTMLElement, key: string): HTMLElement {
  return root.querySelector(`[data-ui='${key}']`) ?? document.createElement("div");
}

export function createDashboard(): DashboardElements {
  const root = document.createElement("div");
  root.className = "bottom-panel";
  root.style.display = "none";

  root.innerHTML = `
    <div class="bottom-tabs" data-ui="dash-tabs"></div>
    <div class="dashboard-grid" data-ui="dash-content"></div>
  `;

  return {
    root,
    tabs: findEl(root, "dash-tabs"),
    content: findEl(root, "dash-content"),
  };
}

let activeTab: DashboardTab = "overview";
let lastState: CityState | null = null;

export function initDashboard(
  els: DashboardElements,
  _onTabChange: (show: boolean) => void,
): void {
  els.tabs.innerHTML = TABS.map(
    (t) =>
      `<button class="bottom-tab ${t.id === activeTab ? "active" : ""}" data-dash-tab="${t.id}">${t.label}</button>`,
  ).join("");

  els.tabs.querySelectorAll<HTMLButtonElement>("[data-dash-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = (btn.dataset.dashTab as DashboardTab) ?? "overview";
      els.tabs
        .querySelectorAll(".bottom-tab")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (lastState) renderActiveTab(els.content, lastState);
    });
  });
}

export function showDashboard(els: DashboardElements): void {
  els.root.style.display = "";
}

export function hideDashboard(els: DashboardElements): void {
  els.root.style.display = "none";
}

export function updateDashboard(els: DashboardElements, state: CityState): void {
  lastState = state;
  renderActiveTab(els.content, state);
}

function renderActiveTab(container: HTMLElement, state: CityState): void {
  switch (activeTab) {
    case "overview":
      renderOverviewTab(container, state);
      break;
    case "finances":
      renderFinancesTab(container, state);
      break;
    case "population":
      renderPopulationTab(container, state);
      break;
    case "transport":
      renderTransportTab(container, state);
      break;
    case "environment":
      renderEnvironmentTab(container, state);
      break;
    case "energy":
      renderEnergyTab(container, state);
      break;
  }
}

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function formatQuantity(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function sparkline(data: number[], color: string, width = 120, height = 36): string {
  if (data.length < 2) return "";
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <polygon points="${areaPoints}" fill="${color}" opacity="0.15"/>
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>
  `;
}

function donut(segments: { value: number; color: string }[], size = 60): string {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let cumulative = 0;
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  const paths = segments.map((seg) => {
    const startAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    cumulative += seg.value;
    const endAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    const largeArc = seg.value / total > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${seg.color}"/>`;
  });

  return `<svg viewBox="0 0 ${size} ${size}" class="donut-chart">${paths.join("")}<circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="var(--bg-card)"/></svg>`;
}

function renderOverviewTab(container: HTMLElement, state: CityState): void {
  const budgetHistory = generateMockHistory(state.economy.money, 12);
  const popHistory = generateMockHistory(state.population.total, 12);

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Budget</span>
      </div>
      <div class="stat-card-value">${formatMoney(state.economy.money)}</div>
      <div class="stat-card-sub ${state.economy.monthlyIncome >= 0 ? "positive" : "negative"}">
        ${state.economy.monthlyIncome >= 0 ? "+" : ""}${formatMoney(state.economy.monthlyIncome)} /mo
      </div>
      <div class="stat-card-chart">${sparkline(budgetHistory, "var(--positive)")}</div>
      <div class="stat-card-detail"><span>Income</span><span>${formatMoney(state.economy.monthlyIncome)}/mo</span></div>
      <div class="stat-card-detail"><span>Expenses</span><span>${formatMoney(state.economy.monthlyExpenses)}/mo</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Population</span>
      </div>
      <div class="stat-card-value">${state.population.total.toLocaleString()}</div>
      <div class="stat-card-sub positive">+${Math.round(state.population.growthRate)} /mo</div>
      <div class="stat-card-chart">${sparkline(popHistory, "#60a5fa")}</div>
      <div class="stat-card-detail"><span>Jobs</span><span>${state.population.employedWorkers.toLocaleString()}</span></div>
      <div class="stat-card-detail"><span>Unemployment</span><span>${state.population.total > 0 ? Math.round((state.population.unemployedWorkers / state.population.total) * 100) : 0}%</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Transport</span>
      </div>
      <div class="stat-card-value">${Math.round((1 - state.traffic.cityCongestion) * 100)}%</div>
      <div class="stat-card-sub">Efficiency</div>
      ${donut([
        { value: 62, color: "#60a5fa" },
        { value: 24, color: "#4ade80" },
        { value: 14, color: "#fbbf24" },
      ])}
      <div class="donut-legend">
        <div class="donut-legend-item"><div class="donut-legend-dot" style="background:#60a5fa"></div>Cars 62%</div>
        <div class="donut-legend-item"><div class="donut-legend-dot" style="background:#4ade80"></div>Bus 24%</div>
        <div class="donut-legend-item"><div class="donut-legend-dot" style="background:#fbbf24"></div>Train 14%</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Pollution</span>
      </div>
      <div class="stat-card-value">${Math.round(getAveragePollution(state))}%</div>
      <div class="stat-card-sub">${getAveragePollution(state) > 50 ? "High" : getAveragePollution(state) > 25 ? "Moderate" : "Low"}</div>
      <div class="stat-card-chart">${sparkline(generateMockHistory(getAveragePollution(state), 12), "#fb923c")}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Energy</span>
      </div>
      <div class="stat-card-value">${state.services.powerCapacity} MW</div>
      <div class="stat-card-sub">Consumption</div>
      <div class="stat-card-chart">${sparkline(generateMockHistory(state.services.powerDemand, 12), "#fbbf24")}</div>
      <div class="stat-card-detail"><span>Production</span><span>${state.services.powerCapacity} MW</span></div>
      <div class="stat-card-detail"><span>Demand</span><span>${state.services.powerDemand} MW</span></div>
    </div>
  `;
}

function renderFinancesTab(container: HTMLElement, state: CityState): void {
  const incomeHistory = generateMockHistory(state.economy.monthlyIncome, 12);
  const expenseHistory = generateMockHistory(state.economy.monthlyExpenses, 12);

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Treasury</span>
      </div>
      <div class="stat-card-value">${formatMoney(state.economy.money)}</div>
      <div class="stat-card-chart">${sparkline(incomeHistory, "var(--positive)")}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Monthly Income</span>
      </div>
      <div class="stat-card-value positive">${formatMoney(state.economy.monthlyIncome)}</div>
      <div class="stat-card-detail"><span>Tax (Res)</span><span>${formatMoney(state.economy.monthlyIncome * 0.4)}</span></div>
      <div class="stat-card-detail"><span>Tax (Com)</span><span>${formatMoney(state.economy.monthlyIncome * 0.35)}</span></div>
      <div class="stat-card-detail"><span>Tax (Ind)</span><span>${formatMoney(state.economy.monthlyIncome * 0.25)}</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Monthly Expenses</span>
      </div>
      <div class="stat-card-value negative">${formatMoney(state.economy.monthlyExpenses)}</div>
      <div class="stat-card-chart">${sparkline(expenseHistory, "var(--negative)")}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Tax Rates</span>
      </div>
      <div class="stat-card-detail"><span>Residential</span><span>${state.economy.taxRates.residential}%</span></div>
      <div class="stat-card-detail"><span>Commercial</span><span>${state.economy.taxRates.commercial}%</span></div>
      <div class="stat-card-detail"><span>Industrial</span><span>${state.economy.taxRates.industrial}%</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Loans</span>
      </div>
      <div class="stat-card-value">${state.economy.loans.length}</div>
      <div class="stat-card-sub">Active loans</div>
      ${state.economy.loans
        .map(
          (l) => `
        <div class="stat-card-detail"><span>${l.type}</span><span>${l.remainingMonths}mo left</span></div>
      `,
        )
        .join("")}
    </div>
  `;
}

function renderPopulationTab(container: HTMLElement, state: CityState): void {
  const popHistory = generateMockHistory(state.population.total, 12);

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Total Population</span>
      </div>
      <div class="stat-card-value">${state.population.total.toLocaleString()}</div>
      <div class="stat-card-sub positive">+${Math.round(state.population.growthRate)} /mo</div>
      <div class="stat-card-chart">${sparkline(popHistory, "#60a5fa")}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Employment</span>
      </div>
      <div class="stat-card-value">${state.population.employedWorkers.toLocaleString()}</div>
      <div class="stat-card-sub">Employed workers</div>
      <div class="stat-card-detail"><span>Unemployed</span><span>${state.population.unemployedWorkers.toLocaleString()}</span></div>
      <div class="stat-card-detail"><span>Rate</span><span>${state.population.total > 0 ? Math.round((state.population.unemployedWorkers / state.population.total) * 100) : 0}%</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Housing</span>
      </div>
      <div class="stat-card-value">${state.population.residentialCapacity.toLocaleString()}</div>
      <div class="stat-card-sub">Residential capacity</div>
      <div class="stat-card-detail"><span>Occupancy</span><span>${state.population.residentialCapacity > 0 ? Math.round((state.population.total / state.population.residentialCapacity) * 100) : 0}%</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Happiness</span>
      </div>
      <div class="stat-card-value">${state.happiness.value}%</div>
      <div class="stat-card-sub">${state.happiness.value >= 70 ? "Happy" : state.happiness.value >= 40 ? "Neutral" : "Unhappy"}</div>
    </div>
  `;
}

function renderTransportTab(container: HTMLElement, state: CityState): void {
  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Traffic Efficiency</span>
      </div>
      <div class="stat-card-value">${Math.round((1 - state.traffic.cityCongestion) * 100)}%</div>
      <div class="stat-card-sub">${state.traffic.cityCongestion > 0.5 ? "Congested" : "Flowing"}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Total Trips</span>
      </div>
      <div class="stat-card-value">${state.traffic.totalTrips.toLocaleString()}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Active Routes</span>
      </div>
      <div class="stat-card-value">${state.publicTransport.activeRouteCount}</div>
      <div class="stat-card-detail"><span>Ridership</span><span>${state.publicTransport.ridership.toLocaleString()}</span></div>
    </div>
  `;
}

function renderEnvironmentTab(container: HTMLElement, state: CityState): void {
  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Pollution</span>
      </div>
      <div class="stat-card-value">${Math.round(getAveragePollution(state))}%</div>
      <div class="stat-card-sub">${getAveragePollution(state) > 50 ? "High" : getAveragePollution(state) > 25 ? "Moderate" : "Low"}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Garbage</span>
      </div>
      <div class="stat-card-value">${formatQuantity(state.extendedServices.totalUncollectedGarbage)}</div>
      <div class="stat-card-sub">Uncollected</div>
      <div class="stat-card-detail"><span>Produced</span><span>${formatQuantity(state.extendedServices.monthlyGarbageProduction)}/mo</span></div>
      <div class="stat-card-detail"><span>Collected</span><span>${formatQuantity(state.extendedServices.monthlyGarbageCollected)}/mo</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Crime Rate</span>
      </div>
      <div class="stat-card-value">${Math.round(state.extendedServices.crimeRate)}%</div>
      <div class="stat-card-detail"><span>Police</span><span>${Math.round(state.extendedServices.policeCoverage)}%</span></div>
      <div class="stat-card-detail"><span>Fire</span><span>${Math.round(state.extendedServices.fireCoverage)}%</span></div>
    </div>
  `;
}

function renderEnergyTab(container: HTMLElement, state: CityState): void {
  const prodHistory = generateMockHistory(state.services.powerCapacity, 12);
  const demHistory = generateMockHistory(state.services.powerDemand, 12);

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Power Production</span>
      </div>
      <div class="stat-card-value">${state.services.powerCapacity} MW</div>
      <div class="stat-card-chart">${sparkline(prodHistory, "var(--positive)")}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Power Demand</span>
      </div>
      <div class="stat-card-value">${state.services.powerDemand} MW</div>
      <div class="stat-card-chart">${sparkline(demHistory, "var(--accent-gold)")}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">Water</span>
      </div>
      <div class="stat-card-value">${state.services.waterCapacity} units</div>
      <div class="stat-card-detail"><span>Demand</span><span>${state.services.waterDemand} units</span></div>
    </div>
  `;
}

function getAveragePollution(state: CityState): number {
  let total = 0;
  let count = 0;
  for (const row of state.map) {
    for (const tile of row) {
      total += tile.pollution;
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}

function generateMockHistory(currentValue: number, points: number): number[] {
  const history: number[] = [];
  const variance = Math.abs(currentValue) * 0.15 || 10;
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const trend = currentValue * 0.7 + currentValue * 0.3 * t;
    const noise = (Math.sin(i * 2.1) * 0.3 + Math.cos(i * 0.7) * 0.2) * variance;
    history.push(Math.max(0, trend + noise));
  }
  return history;
}
