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
    // Calculate the save path
    const userDataPath = process.env.HOME || process.env.USERPROFILE || "";
    this.savePath = path.join(
      userDataPath,
      "Library/Application Support/Freelens/extension-store/@freelensapp/custom-extension/favorites-store.json"
    );
    console.log("[FavoritesStore] Save path:", this.savePath);
    return this;
  }

  // Manual save to file
  private async saveToFile() {
    if (!this.savePath) {
      console.error("[FavoritesStore] Save path not set");
      return;
    }

    try {
      const data = this.toJSON();
      const fileContent = JSON.stringify(data, null, 2);
      await fs.writeFile(this.savePath, fileContent, "utf-8");
      console.log("[FavoritesStore] Successfully saved to file:", this.savePath);
    } catch (error) {
      console.error("[FavoritesStore] Error saving to file:", error);
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
    console.log("[FavoritesStore] Loaded from disk:", { items: this.items.length, groups: this.groups.length });
    console.log("[FavoritesStore] Store methods available:", Object.getOwnPropertyNames(Object.getPrototypeOf(this)));
  }

  toJSON(): FavoritesModel {
    // Convert MobX observables to plain JavaScript objects for serialization
    const data = {
      items: toJS(this.items),
      groups: toJS(this.groups),
    };
    console.log("[FavoritesStore] toJSON called - Serializing:", { items: data.items.length, groups: data.groups.length, itemsData: data.items });
    return data;
  }

  // Add a favorite navigation item
  @action
  async addFavorite(item: Omit<FavoriteNavItem, "id" | "createdAt" | "clusterId">): Promise<void> {
    if (!this.currentClusterId) {
      console.error("[FavoritesStore] Cannot add favorite: no cluster ID set");
      return;
    }

    const id = `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem: FavoriteNavItem = {
      ...item,
      id,
      clusterId: this.currentClusterId,
      createdAt: new Date().toISOString(),
    };
    console.log("[FavoritesStore] Adding favorite to cluster", this.currentClusterId, ":", newItem);
    
    // Create new array to trigger observable change detection
    this.items = [...this.items, newItem];
    console.log("[FavoritesStore] Total items after add:", this.items.length, "(current cluster:", this.currentClusterItems.length, ")");
    
    // Manually save to file
    await this.saveToFile();
  }

  // Remove a favorite item
  @action
  async removeFavorite(itemId: string): Promise<void> {
    console.log("[FavoritesStore] Removing favorite:", itemId);
    console.log("[FavoritesStore] Before remove - Total items:", this.items.length, "Current cluster items:", this.currentClusterItems.length);
    
    // Filter to create new array and trigger observable change detection
    const previousLength = this.items.length;
    const newItems = this.items.filter(item => item.id !== itemId);
    
    // Use runInAction to ensure MobX tracks this properly
    runInAction(() => {
      this.items = newItems;
    });
    
    console.log("[FavoritesStore] After remove - Total items:", this.items.length, "(removed:", previousLength - this.items.length, ")");
    console.log("[FavoritesStore] Current cluster items:", this.currentClusterItems.length);
    
    // Manually save to file
    await this.saveToFile();
  }

  // Check if path is already favorited in current cluster
  isFavorited(path: string): boolean {
    if (!this.currentClusterId) return false;
    return this.items.some(item => item.path === path && item.clusterId === this.currentClusterId);
  }

  // Reorder favorites for the current cluster
  @action
  async reorderFavorites(orderedIds: string[]): Promise<void> {
    console.log("[FavoritesStore] Reordering favorites:", orderedIds);
    
    // Create a map of id -> new order
    const orderMap = new Map<string, number>();
    orderedIds.forEach((id, index) => {
      orderMap.set(id, index);
    });
    
    // Update the order field for items in current cluster
    const updatedItems = this.items.map(item => {
      if (item.clusterId === this.currentClusterId && orderMap.has(item.id)) {
        const newOrder = orderMap.get(item.id)!;
        console.log(`[FavoritesStore] Setting order ${newOrder} for item ${item.title} (${item.id})`);
        return { ...item, order: newOrder };
      }
      return item;
    });
    
    // Force array replacement to trigger MobX reactivity using runInAction
    runInAction(() => {
      this.items = [...updatedItems]; // Create a fresh array copy
    });
    
    console.log("[FavoritesStore] After reorder - items:", this.items.length);
    console.log("[FavoritesStore] Items after reorder:", 
      this.items.map(i => ({ title: i.title, order: i.order, clusterId: i.clusterId }))
    );
    console.log("[FavoritesStore] Current cluster items with order:", 
      this.currentClusterItems.map(i => ({ title: i.title, order: i.order }))
    );
    
    // Save to file
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
