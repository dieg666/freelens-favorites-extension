import { Common } from "@freelensapp/extensions";
import { makeObservable, observable, action, toJS, computed, configure, runInAction } from "mobx";
import { promises as fs } from "fs";
import path from "path";

// Configure MobX to enforce actions
configure({
  enforceActions: "never",
});

// Navigation shortcut to a resource type/page (e.g., "Pods", "Deployments")
export interface FavoriteNavItem {
  id: string;
  title: string; // Display name, e.g., "Pods", "Deployments", "My Services"
  path: string; // Navigation path, e.g., "/workloads/pods", "/network/services"
  icon?: string; // Optional icon name
  groupId?: string; // Optional: if item belongs to a group
  clusterId: string; // Which cluster this favorite belongs to
  createdAt: string;
  order?: number; // Custom order for sorting (lower number = higher priority)
}

export interface FavoriteGroup {
  id: string;
  name: string;
  expanded: boolean; // UI state: is the group expanded?
  clusterId: string; // Which cluster this group belongs to
  createdAt: string;
}

export interface FavoritesModel {
  items: FavoriteNavItem[];
  groups: FavoriteGroup[];
}

export class FavoritesStore extends Common.Store.ExtensionStore<FavoritesModel> {
  @observable.ref items: FavoriteNavItem[] = [];
  @observable.ref groups: FavoriteGroup[] = [];
  @observable currentClusterId: string = "";

  private static instance?: FavoritesStore;
  private savePath?: string;

  constructor() {
    super({
      configName: "favorites-store",
      defaults: {
        items: [],
        groups: [],
      },
    });
    makeObservable(this);
  }

  // Set the current cluster ID
  @action
  setCurrentCluster(clusterId: string) {
    this.currentClusterId = clusterId;
  }

  // Get items for current cluster only, sorted by order
  @computed({ keepAlive: false })
  get currentClusterItems(): FavoriteNavItem[] {
    // Force re-evaluation by accessing the observable
    const items = this.items.slice();
    const clusterId = this.currentClusterId;
    
    const result = !clusterId 
      ? [] 
      : items
          .filter(item => item.clusterId === clusterId)
          .sort((a, b) => {
            // Sort by order field (if present), fallback to creation date
            const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) return orderA - orderB;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
    return result;
  }

  // Get groups for current cluster only
  @computed
  get currentClusterGroups(): FavoriteGroup[] {
    if (!this.currentClusterId) return [];
    return this.groups.filter(group => group.clusterId === this.currentClusterId);
  }

  // Store the save path when store is loaded
  async loadExtension(extension: any) {
    await super.loadExtension(extension);
    
    // Build cross-platform save path
    let appDataPath: string;
    
    if (process.platform === 'win32') {
      // Windows: %APPDATA%\Freelens
      appDataPath = path.join(process.env.APPDATA || '', 'Freelens');
    } else if (process.platform === 'darwin') {
      // macOS: ~/Library/Application Support/Freelens
      appDataPath = path.join(process.env.HOME || '', 'Library/Application Support/Freelens');
    } else {
      // Linux: ~/.config/Freelens
      appDataPath = path.join(process.env.HOME || '', '.config/Freelens');
    }
    
    this.savePath = path.join(
      appDataPath,
      'extension-store',
      'freelens-favorites-extension',
      'favorites-store.json'
    );
    
    return this;
  }
  
  // Save to file
  private async saveToFile(): Promise<void> {
    if (!this.savePath) {
      return;
    }

    try {
      await fs.mkdir(path.dirname(this.savePath), { recursive: true });
      const data = this.toJSON();
      const fileContent = JSON.stringify(data, null, 2);
      await fs.writeFile(this.savePath, fileContent, "utf-8");
    } catch (error) {
      console.error("[FavoritesStore] Error saving:", error);
    }
  }

  @computed get itemsCount(): number {
    return this.items.length;
  }
  
  @computed get groupsCount(): number {
    return this.groups.length;
  }

  static getInstance(): FavoritesStore | undefined {
    return FavoritesStore.instance;
  }

  static getInstanceOrCreate(): FavoritesStore {
    if (!FavoritesStore.instance) {
      FavoritesStore.instance = new FavoritesStore();
    }
    return FavoritesStore.instance;
  }

  fromStore(data: FavoritesModel): void {
    this.items = data.items || [];
    this.groups = data.groups || [];
  }

  toJSON(): FavoritesModel {
    return {
      items: toJS(this.items),
      groups: toJS(this.groups),
    };
  }

  @action
  async addFavorite(item: Omit<FavoriteNavItem, "id" | "createdAt" | "clusterId">): Promise<void> {
    if (!this.currentClusterId) {
      return;
    }

    const id = `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem: FavoriteNavItem = {
      ...item,
      id,
      clusterId: this.currentClusterId,
      createdAt: new Date().toISOString(),
    };
    
    this.items = [...this.items, newItem];
    await this.saveToFile();
  }

  @action
  async removeFavorite(itemId: string): Promise<void> {
    const newItems = this.items.filter(item => item.id !== itemId);
    
    runInAction(() => {
      this.items = newItems;
    });
    
    await this.saveToFile();
  }

  // Check if path is already favorited in current cluster
  isFavorited(path: string): boolean {
    if (!this.currentClusterId) return false;
    return this.items.some(item => item.path === path && item.clusterId === this.currentClusterId);
  }

  @action
  async reorderFavorites(orderedIds: string[]): Promise<void> {
    const orderMap = new Map<string, number>();
    orderedIds.forEach((id, index) => {
      orderMap.set(id, index);
    });
    
    const updatedItems = this.items.map(item => {
      if (item.clusterId === this.currentClusterId && orderMap.has(item.id)) {
        return { ...item, order: orderMap.get(item.id)! };
      }
      return item;
    });
    
    runInAction(() => {
      this.items = [...updatedItems];
    });
    
    await this.saveToFile();
  }

  // Get ungrouped favorites for current cluster
  getUngroupedFavorites(): FavoriteNavItem[] {
    return this.currentClusterItems.filter(item => !item.groupId);
  }

  // Get favorites in a specific group for current cluster
  getFavoritesByGroup(groupId: string): FavoriteNavItem[] {
    return this.currentClusterItems.filter(item => item.groupId === groupId);
  }

  // Create a new group
  @action
  addGroup(name: string): FavoriteGroup {
    const id = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newGroup: FavoriteGroup = {
      id,
      name,
      expanded: true,
      createdAt: new Date().toISOString(),
    };
    this.groups.push(newGroup);
    return newGroup;
  }

  // Remove a group (and optionally its items)
  @action
  removeGroup(groupId: string, removeItems: boolean = false): void {
    
    if (removeItems) {
      // Remove all items in this group
      const itemsToRemove = this.items.filter(item => item.groupId === groupId);
      itemsToRemove.forEach(item => {
        const index = this.items.indexOf(item);
        if (index !== -1) {
          this.items.splice(index, 1);
        }
      });
    } else {
      // Ungroup items (set groupId to undefined)
      this.items.forEach(item => {
        if (item.groupId === groupId) {
          item.groupId = undefined;
        }
      });
    }

    // Remove the group itself
    const index = this.groups.findIndex(group => group.id === groupId);
    if (index !== -1) {
      this.groups.splice(index, 1);
    }
  }

  // Toggle group expanded state
  @action
  toggleGroupExpanded(groupId: string): void {
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      group.expanded = !group.expanded;
    }
  }

  // Add item to group
  @action
  addItemToGroup(itemId: string, groupId: string): void {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.groupId = groupId;
    }
  }

  // Remove item from group (ungroup)
  @action
  removeItemFromGroup(itemId: string): void {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.groupId = undefined;
    }
  }

  // Update item details
  @action
  updateFavorite(itemId: string, updates: Partial<Omit<FavoriteNavItem, "id" | "createdAt">>): void {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
    }
  }
}
