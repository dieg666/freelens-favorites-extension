import React from "react";
import { observer } from "mobx-react";
import { Renderer } from "@freelensapp/extensions";
import { FavoritesStore } from "../../common/store";

interface FavoritesSidebarProps {
  extension: Renderer.LensExtension;
}

export const FavoritesSidebar = observer(({ extension }: FavoritesSidebarProps) => {
  const store = FavoritesStore.getInstance();
  
  if (!store) {
    console.log("[FavoritesSidebar] Store not initialized");
    return null;
  }

  // Get current cluster context
  const cluster = Renderer.K8sApi.useCluster();
  const clusterId = cluster?.id;

  if (!clusterId) {
    console.log("[FavoritesSidebar] No cluster selected");
    return null;
  }

  console.log("[FavoritesSidebar] Rendering for cluster:", clusterId);

  const groups = store.getGroupsByCluster(clusterId);
  const ungroupedItems = store.getUngroupedFavorites(clusterId);

  const handleItemClick = (item: any) => {
    console.log("[FavoritesSidebar] Item clicked:", item);
    // Navigate to the item
    // Note: Navigation will be implemented based on Freelens API
    alert(`Navigate to: ${item.kind} ${item.namespace}/${item.name}`);
  };

  const handleGroupToggle = (groupId: string) => {
    console.log("[FavoritesSidebar] Toggling group:", groupId);
    store.toggleGroupExpanded(groupId);
  };

  if (groups.length === 0 && ungroupedItems.length === 0) {
    return (
      <div style={{ padding: "10px", color: "#999", fontSize: "12px" }}>
        No favorites yet. Right-click on resources to add them.
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Render ungrouped items */}
      {ungroupedItems.map(item => (
        <div
          key={item.id}
          onClick={() => handleItemClick(item)}
          style={{
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <span style={{ opacity: 0.7, fontSize: "11px" }}>{item.kind}</span>
          <span>{item.name}</span>
          {item.namespace && (
            <span style={{ opacity: 0.5, fontSize: "11px" }}>({item.namespace})</span>
          )}
        </div>
      ))}

      {/* Render groups */}
      {groups.map(group => {
        const groupItems = store.getFavoritesByGroup(group.id);
        return (
          <div key={group.id} style={{ marginTop: "8px" }}>
            {/* Group header */}
            <div
              onClick={() => handleGroupToggle(group.id)}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <span>{group.expanded ? "▼" : "▶"}</span>
              <span>{group.name}</span>
              <span style={{ opacity: 0.5, fontSize: "11px" }}>({groupItems.length})</span>
            </div>

            {/* Group items (only show when expanded) */}
            {group.expanded && (
              <div style={{ paddingLeft: "12px" }}>
                {groupItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <span style={{ opacity: 0.7, fontSize: "11px" }}>{item.kind}</span>
                    <span>{item.name}</span>
                    {item.namespace && (
                      <span style={{ opacity: 0.5, fontSize: "11px" }}>({item.namespace})</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
