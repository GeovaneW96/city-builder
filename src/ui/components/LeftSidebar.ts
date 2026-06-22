import { icon, type IconName } from "./icons";

export interface SidebarItem {
  id: string;
  icon: IconName;
  label: string;
  category: "build" | "service" | "utility" | "decoration" | "action";
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "zones", icon: "zones", label: "Zones", category: "build" },
  { id: "roads", icon: "roads", label: "Roads", category: "build" },
  { id: "services", icon: "services", label: "Services", category: "service" },
  { id: "utilities", icon: "utilities", label: "Utilities", category: "utility" },
  {
    id: "decorations",
    icon: "decorations",
    label: "Decorations",
    category: "decoration",
  },
  { id: "demolish", icon: "demolish", label: "Demolish", category: "action" },
];

export interface SidebarElements {
  root: HTMLElement;
  buttons: Map<string, HTMLElement>;
}

export function createLeftSidebar(): SidebarElements {
  const root = document.createElement("nav");
  root.className = "sidebar";

  const buttons = new Map<string, HTMLElement>();

  SIDEBAR_ITEMS.forEach((item, index) => {
    if (index > 0) {
      const prev = SIDEBAR_ITEMS[index - 1];
      if (prev && item.category !== prev.category) {
        const sep = document.createElement("div");
        sep.className = "sidebar-separator";
        root.appendChild(sep);
      }
    }

    const btn = document.createElement("button");
    btn.className = "sidebar-btn";
    btn.dataset.action = item.id;
    btn.innerHTML = `${icon(item.icon, 20)}<span class="sidebar-btn-label">${item.label}</span><span class="sidebar-tooltip">${item.label}</span>`;
    root.appendChild(btn);
    buttons.set(item.id, btn);
  });

  return { root, buttons };
}

export function updateLeftSidebar(
  els: SidebarElements,
  activeMode: string | null,
  activeCatalog: string,
): void {
  const activeId = getActiveSidebarId(activeMode, activeCatalog);
  els.buttons.forEach((btn, id) => {
    btn.classList.toggle("active", id === activeId);
  });
}

function getActiveSidebarId(
  activeMode: string | null,
  activeCatalog: string,
): string | null {
  if (activeMode === "road") return "roads";
  if (activeMode === "zone") return "zones";
  if (activeMode === "demolish") return "demolish";
  if (activeMode !== "building") return null;
  return getCatalogSidebarId(activeCatalog);
}

function getCatalogSidebarId(activeCatalog: string): string | null {
  if (activeCatalog === "utilities") return "utilities";
  if (activeCatalog === "decorations") return "decorations";
  if (activeCatalog === "buildings") return "services";
  return null;
}
