import { defineStore } from "pinia";

export type TemplateLayout = "layout-1" | "layout-2" | null;

export interface LibraryCard {
  id: string;
  title: string;
  color?: string;
  w?: number;
  h?: number;
}

export type CanvasArea = "header" | "left" | "content" | "right";

export interface CanvasCard extends LibraryCard {
  area: CanvasArea;
  x: number; // left in px（对自适应宽度场景固定为0）
  y: number; // top in px（区域内的纵向位置）
  __iid?: string; // 实例级唯一ID，避免相同卡片冲突
}

interface TemplateState {
  selectedTemplate: TemplateLayout;
  library: LibraryCard[];
  canvasCards: CanvasCard[];
}

export const useTemplateStore = defineStore("template-store", {
  state: (): TemplateState => ({
    selectedTemplate: null,
    library: [],
    canvasCards: []
  }),
  actions: {
    selectTemplate(t: TemplateLayout) {
      this.selectedTemplate = t;
      // 切换模板时清空画布（也可选择保留，根据需求）
      this.canvasCards = [];
    },
    addLibraryCard(card: Omit<LibraryCard, "id">) {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      this.library.push({ id, ...card });
    },
    removeLibraryCard(id: string) {
      this.library = this.library.filter(c => c.id !== id);
    },
    // 将库中的卡片放到画布（克隆一份），支持字段覆盖（如高度）
    placeCardFromLibrary(
      id: string,
      area: CanvasArea,
      x: number,
      y: number,
      overrides?: Partial<CanvasCard>
    ) {
      const base = this.library.find(c => c.id === id);
      if (!base) return;
      this.canvasCards.push({
        ...base,
        area,
        x,
        y,
        ...(overrides || {}),
        __iid: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      });
    },
    moveCanvasCard(index: number, x: number, y: number) {
      const c = this.canvasCards[index];
      if (!c) return;
      c.x = x;
      c.y = y;
    },
    moveCanvasCardToArea(index: number, area: CanvasArea, x: number, y: number) {
      const c = this.canvasCards[index];
      if (!c) return;
      c.area = area;
      c.x = x;
      c.y = y;
    },
    saveTemplate(): string {
      const payload = {
        selectedTemplate: this.selectedTemplate,
        canvasCards: this.canvasCards
      };
      const json = JSON.stringify(payload);
      if (typeof window !== "undefined") {
        localStorage.setItem("template-snapshot", json);
      }
      return json;
    },
    loadTemplate(json?: string) {
      const data = json
        ? JSON.parse(json)
        : (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("template-snapshot") || "null") : null);
      if (!data) return;
      this.selectedTemplate = data.selectedTemplate as TemplateLayout;
      this.canvasCards = Array.isArray(data.canvasCards) ? data.canvasCards : [];
    },
    removeCanvasCard(index: number) {
      this.canvasCards.splice(index, 1);
    },
    removeCanvasCardByIid(iid: string) {
      const idx = this.canvasCards.findIndex(c => c.__iid === iid);
      if (idx !== -1) this.canvasCards.splice(idx, 1);
    }
  }
});


