import type { CityState } from "../shared/types";
import {
  createSaveData,
  deserializeSave,
  serializeSave,
  type CitySaveData,
  type SaveSlotMetadata,
} from "./serialization";

export const AUTOSAVE_SLOT_ID = "autosave";
export const MANUAL_SLOT_IDS = [
  "manual_0",
  "manual_1",
  "manual_2",
  "manual_3",
  "manual_4",
] as const;
export const SAVE_SLOT_IDS = [AUTOSAVE_SLOT_ID, ...MANUAL_SLOT_IDS] as const;
export const AUTOSAVE_INTERVAL_MS = 300_000;

export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveSlotOptions {
  cityName?: string;
  name?: string;
  scenarioId?: string;
}

export interface SaveExportFile {
  meta: {
    exportVersion: 1;
    exportedAt: string;
    sourceSlotId: SaveSlotId;
    gameVersion: string;
  };
  save: CitySaveData;
  achievements: CityState["achievements"];
}

export class SaveSlotManager {
  constructor(
    private readonly storage: SaveStorage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(): SaveSlotMetadata[] {
    return SAVE_SLOT_IDS.flatMap((id) => {
      const metadata = this.getMetadata(id);
      return metadata ? [metadata] : [];
    });
  }

  getMetadata(id: SaveSlotId): SaveSlotMetadata | null {
    const serialized = this.storage.getItem(getMetadataKey(id));
    return serialized ? parseMetadata(serialized) : null;
  }

  load(id: SaveSlotId): CitySaveData | null {
    const serialized = this.storage.getItem(getSaveKey(id));
    return serialized ? deserializeSave(serialized) : null;
  }

  save(id: SaveSlotId, state: CityState, options: SaveSlotOptions = {}): CitySaveData {
    const existing = this.load(id);
    const cityName = options.cityName ?? existing?.cityName ?? "First Settlement";
    const data = createSaveData(state, cityName);
    data.createdAt = existing?.createdAt ?? this.now().toISOString();
    data.updatedAt = this.now().toISOString();
    data.slotMetadata = createMetadata(id, data, options.name, options.scenarioId);
    this.store(id, data);
    return data;
  }

  delete(id: SaveSlotId): boolean {
    if (!this.load(id)) return false;
    this.storage.removeItem(getSaveKey(id));
    this.storage.removeItem(getMetadataKey(id));
    this.updateIndex();
    return true;
  }

  export(id: SaveSlotId, gameVersion = "0.0.1"): string {
    const save = this.load(id);
    if (!save) throw new Error("Save slot is empty");
    const file: SaveExportFile = {
      meta: {
        exportVersion: 1,
        exportedAt: this.now().toISOString(),
        sourceSlotId: id,
        gameVersion,
      },
      save,
      achievements: save.state.achievements,
    };
    return JSON.stringify(file);
  }

  import(id: SaveSlotId, serialized: string): CitySaveData {
    const imported = parseExportFile(serialized);
    imported.slotMetadata = createMetadata(id, imported);
    this.store(id, imported);
    return imported;
  }

  firstAvailableManualSlot(): SaveSlotId {
    return MANUAL_SLOT_IDS.find((id) => !this.load(id)) ?? MANUAL_SLOT_IDS[0];
  }

  private store(id: SaveSlotId, data: CitySaveData): void {
    this.storage.setItem(getSaveKey(id), serializeSave(data));
    this.storage.setItem(getMetadataKey(id), JSON.stringify(data.slotMetadata));
    this.updateIndex();
  }

  private updateIndex(): void {
    const occupied = SAVE_SLOT_IDS.filter((id) => this.load(id));
    this.storage.setItem("save_index", JSON.stringify(occupied));
  }
}

function createMetadata(
  id: SaveSlotId,
  data: CitySaveData,
  name?: string,
  scenarioId?: string,
): SaveSlotMetadata {
  return {
    ...data.slotMetadata,
    id,
    name: name ?? (id === AUTOSAVE_SLOT_ID ? "Autosave" : "Manual Save"),
    cityName: data.cityName,
    population: data.state.population.total,
    money: data.state.economy.money,
    happiness: data.state.happiness.value,
    playTime: data.state.time.tick,
    date: data.updatedAt,
    saveVersion: data.version,
    scenarioId: scenarioId ?? "first_settlement",
  };
}

function parseMetadata(serialized: string): SaveSlotMetadata | null {
  try {
    const parsed = JSON.parse(serialized) as Partial<SaveSlotMetadata>;
    return isMetadata(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseExportFile(serialized: string): CitySaveData {
  let parsed: Partial<SaveExportFile>;
  try {
    parsed = JSON.parse(serialized) as Partial<SaveExportFile>;
  } catch {
    throw new Error("Invalid save file: malformed JSON");
  }
  if (parsed.meta?.exportVersion !== 1) {
    throw new Error("Invalid save file: unsupported export version");
  }
  if (!parsed.save || typeof parsed.save.cityName !== "string" || !parsed.save.cityName) {
    throw new Error("Invalid save file: missing city name");
  }
  try {
    return deserializeSave(JSON.stringify(parsed.save));
  } catch {
    throw new Error("Invalid save file: unsupported save data");
  }
}

function isMetadata(value: Partial<SaveSlotMetadata>): value is SaveSlotMetadata {
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.cityName === "string" &&
    typeof value.population === "number" &&
    typeof value.money === "number" &&
    typeof value.happiness === "number" &&
    typeof value.playTime === "number" &&
    typeof value.date === "string" &&
    typeof value.saveVersion === "number" &&
    typeof value.scenarioId === "string"
  );
}

function getSaveKey(id: SaveSlotId): string {
  return `save_slot_${id}`;
}

function getMetadataKey(id: SaveSlotId): string {
  return `save_metadata_${id}`;
}
