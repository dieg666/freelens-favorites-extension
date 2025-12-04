import { CustomPreferencesStore } from "../src/common/store";

describe("CustomPreferencesStore", () => {
  let store: CustomPreferencesStore;

  beforeEach(() => {
    store = new CustomPreferencesStore();
  });

  test("should initialize with default values", () => {
    expect(store.enabled).toBe(false);
    expect(store.clusterSpecificData).toEqual({});
  });

  test("should set and get cluster notes", () => {
    const clusterId = "test-cluster-1";
    const notes = "Test notes for cluster";
    
    store.setClusterNotes(clusterId, notes);
    
    const data = store.getClusterData(clusterId);
    expect(data.notes).toBe(notes);
    expect(data.lastAccessed).toBeTruthy();
  });

  test("should update last accessed time", () => {
    const clusterId = "test-cluster-2";
    
    store.setClusterNotes(clusterId, "Initial notes");
    const initialTime = store.getClusterData(clusterId).lastAccessed;
    
    // Wait a bit to ensure time difference
    setTimeout(() => {
      store.updateLastAccessed(clusterId);
      const updatedTime = store.getClusterData(clusterId).lastAccessed;
      
      expect(updatedTime).not.toBe(initialTime);
    }, 10);
  });

  test("should serialize and deserialize correctly", () => {
    store.enabled = true;
    store.setClusterNotes("cluster-1", "Notes 1");
    store.setClusterNotes("cluster-2", "Notes 2");
    
    const json = store.toJSON();
    expect(json.enabled).toBe(true);
    expect(json.clusterSpecificData["cluster-1"].notes).toBe("Notes 1");
    expect(json.clusterSpecificData["cluster-2"].notes).toBe("Notes 2");
    
    const newStore = new CustomPreferencesStore();
    newStore.fromStore(json);
    
    expect(newStore.enabled).toBe(true);
    expect(newStore.getClusterData("cluster-1").notes).toBe("Notes 1");
    expect(newStore.getClusterData("cluster-2").notes).toBe("Notes 2");
  });

  test("should return empty data for non-existent cluster", () => {
    const data = store.getClusterData("non-existent");
    expect(data.notes).toBe("");
    expect(data.lastAccessed).toBe("");
  });
});
