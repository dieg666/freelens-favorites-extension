import * as React from "react";
import { observer } from "mobx-react";
import { Renderer } from "@freelensapp/extensions";
import { FavoritesStore } from "../../common/store";

interface FavoritesPageProps {
  extension: Renderer.LensExtension;
}

export const FavoritesPage = observer(({ extension, ...props }: FavoritesPageProps & any) => {
  const store = FavoritesStore.getInstance();
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  
  // Try to extract cluster ID from URL/hostname
  React.useEffect(() => {
    if (!store) return;
    
    const hostname = window.location.hostname;
    const url = window.location.href;
    
    console.log("[FavoritesPage] Hostname:", hostname, "URL:", url);
    
    let clusterId: string | null = null;
    
    // Pattern 1: Cluster ID in subdomain (FreeLens uses this!)
    const subdomainMatch = hostname.match(/^([a-f0-9]{32})\.renderer\.freelens\.app$/i);
    if (subdomainMatch) {
      clusterId = subdomainMatch[1];
      console.log("[FavoritesPage] Setting cluster ID from subdomain:", clusterId);
      store.setCurrentCluster(clusterId);
      return;
    }
    
    // Pattern 2: From DOM element with id="cluster-{clusterid}"
    const clusterElement = document.querySelector('[id^="cluster-"]');
    if (clusterElement && clusterElement.id) {
      const elementIdMatch = clusterElement.id.match(/^cluster-([a-f0-9]{32})$/i);
      if (elementIdMatch) {
        clusterId = elementIdMatch[1];
        console.log("[FavoritesPage] Setting cluster ID from element ID:", clusterId);
        store.setCurrentCluster(clusterId);
        return;
      }
    }
    
    console.log("[FavoritesPage] Could not detect cluster ID");
  }, [store]);

  // Listen for favorites updates from sidebar
  React.useEffect(() => {
    const handleFavoritesUpdate = () => {
      console.log("[FavoritesPage] Received favorites-updated event, refreshing...");
      setRefreshTrigger(prev => prev + 1);
    };
    
    window.addEventListener('favorites-updated', handleFavoritesUpdate);
    
    return () => {
      window.removeEventListener('favorites-updated', handleFavoritesUpdate);
    };
  }, []);

  if (!store) {
    return <div style={{ padding: "20px" }}>Store not initialized</div>;
  }

  // Get favorites directly from store items and filter/sort in component
  // This ensures React re-renders when store.items changes
  const allItems = store.items;
  const currentClusterId = store.currentClusterId;
  
  const favorites = React.useMemo(() => {
    if (!currentClusterId) return [];
    
    const filtered = allItems
      .filter(item => item.clusterId === currentClusterId)
      .sort((a, b) => {
        // Sort by order field (if present), fallback to creation date
        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    
    return filtered;
  }, [allItems, currentClusterId, refreshTrigger]);
  
  // Log when favorites change
  React.useEffect(() => {
    console.log("[FavoritesPage] Favorites changed:", favorites.length, favorites);
  }, [favorites]);

  const handleRemove = async (itemId: string) => {
    console.log("[FavoritesPage] Remove button clicked for:", itemId);
    setRemovingId(itemId);
    // Small delay for animation
    await new Promise(resolve => setTimeout(resolve, 200));
    await store.removeFavorite(itemId);
    setRemovingId(null);
    console.log("[FavoritesPage] Remove completed");
    
    // Trigger sidebar update to refresh star icons
    window.dispatchEvent(new CustomEvent('favorites-updated'));
  };

  const handleNavigate = (path: string, title: string) => {
    console.log("[FavoritesPage] Navigating to:", { path, title });
    
    // Find the corresponding sidebar item and click it
    const allNavItems = document.querySelectorAll('[class*="navItem"]');
    let found = false;
    
    for (const item of allNavItems) {
      if (found) break;
      
      const linkElement = item.tagName === "A" ? item as HTMLAnchorElement : item.querySelector("a");
      if (!linkElement) continue;
      
      // Get data-testid (most reliable identifier)
      const dataTestId = linkElement.getAttribute('data-testid');
      
      // Match by data-testid first (most reliable)
      if (dataTestId && dataTestId === path) {
        console.log("[FavoritesPage] Found match by data-testid:", dataTestId, "clicking...");
        
        // Try to trigger navigation
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        linkElement.dispatchEvent(clickEvent);
        linkElement.click();
        
        found = true;
        console.log("[FavoritesPage] Navigation triggered");
        break;
      }
      
      // Fallback: match by title
      if (!found) {
        let itemText = '';
        const titleElement = linkElement.querySelector('[class*="title"]') || linkElement.querySelector('span');
        if (titleElement) {
          itemText = Array.from(titleElement.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent)
            .join('')
            .trim();
        }
        
        if (!itemText) {
          itemText = Array.from(linkElement.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent)
            .join('')
            .trim();
        }
        
        // Clean up UI elements
        itemText = itemText
          .replace(/keyboard_arrow_down/g, '')
          .replace(/keyboard_arrow_up/g, '')
          .replace(/keyboard_arrow_right/g, '')
          .replace(/expand_more/g, '')
          .replace(/expand_less/g, '')
          .trim();
        
        if (itemText === title) {
          console.log("[FavoritesPage] Found match by title:", itemText, "clicking...");
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          linkElement.dispatchEvent(clickEvent);
          linkElement.click();
          found = true;
          console.log("[FavoritesPage] Navigation triggered");
          break;
        }
      }
    }
    
    if (!found) {
      console.warn("[FavoritesPage] Could not find sidebar item for:", { path, title });
      console.warn("[FavoritesPage] Available data-testids:", 
        Array.from(document.querySelectorAll('[class*="navItem"] a')).map(a => a.getAttribute('data-testid'))
      );
    }
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    // Add slight opacity to the dragged element
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedId(null);
    setDragOverId(null);
    // Restore opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId && draggedId !== itemId) {
      setDragOverId(itemId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the drop zone completely
    if (e.currentTarget === e.target) {
      setDragOverId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === dropTargetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    console.log("[FavoritesPage] Dropping", draggedId, "onto", dropTargetId);

    // Find the indices of dragged and drop target items
    const draggedIndex = favorites.findIndex(item => item.id === draggedId);
    const dropIndex = favorites.findIndex(item => item.id === dropTargetId);

    if (draggedIndex === -1 || dropIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // Create new order by moving the dragged item
    const newOrder = [...favorites];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);

    // Update the store with new order
    const orderedIds = newOrder.map(item => item.id);
    await store.reorderFavorites(orderedIds);

    setDraggedId(null);
    setDragOverId(null);
    setRefreshTrigger(prev => prev + 1);
    
    // Also dispatch event to update sidebar dropdown
    window.dispatchEvent(new CustomEvent('favorites-updated'));
  };

  const getResourceIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('pod')) return '📦';
    if (lower.includes('deployment')) return '🚀';
    if (lower.includes('service')) return '🔌';
    if (lower.includes('configmap')) return '⚙️';
    if (lower.includes('secret')) return '🔐';
    if (lower.includes('namespace')) return '📁';
    if (lower.includes('node')) return '🖥️';
    if (lower.includes('ingress')) return '🌐';
    if (lower.includes('storage') || lower.includes('volume')) return '💾';
    if (lower.includes('job') || lower.includes('cronjob')) return '⏰';
    if (lower.includes('overview') || lower.includes('dashboard')) return '📊';
    if (lower.includes('workload')) return '⚡';
    if (lower.includes('config')) return '🔧';
    if (lower.includes('network')) return '🌍';
    if (lower.includes('access')) return '🔑';
    return '⭐';
  };

  return (
    <div style={{ 
      padding: "32px", 
      maxWidth: "1000px",
      margin: "0 auto"
    }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ 
          fontSize: "28px", 
          fontWeight: "600",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <span style={{ fontSize: "32px" }}>⭐</span>
          Your Favorites
        </h1>
        <p style={{ 
          opacity: 0.7, 
          fontSize: "14px",
          lineHeight: "1.6"
        }}>
          Quick access to your most-used Kubernetes resources. Hover over any sidebar item to add it to your favorites.
        </p>
      </div>

      {/* Favorites Count */}
      {favorites.length > 0 && (
        <div style={{
          marginBottom: "16px",
          fontSize: "13px",
          opacity: 0.6,
          fontWeight: "500"
        }}>
          {favorites.length} {favorites.length === 1 ? 'item' : 'items'}
        </div>
      )}

      {/* Empty State */}
      {favorites.length === 0 ? (
        <div style={{ 
          padding: "60px 40px", 
          textAlign: "center", 
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          borderRadius: "12px",
          border: "2px dashed rgba(255, 255, 255, 0.1)"
        }}>
          <div style={{ 
            fontSize: "64px", 
            marginBottom: "20px",
            opacity: 0.3
          }}>⭐</div>
          <h2 style={{ 
            fontSize: "20px", 
            marginBottom: "12px",
            fontWeight: "600"
          }}>
            No favorites yet
          </h2>
          <p style={{ 
            fontSize: "14px",
            opacity: 0.7,
            maxWidth: "400px",
            margin: "0 auto",
            lineHeight: "1.6"
          }}>
            Start by hovering over any item in the sidebar and clicking the star icon (☆) to add it here
          </p>
        </div>
      ) : (
        /* Favorites Grid */
        <div style={{
          display: "grid",
          gap: "12px"
        }}>
          {favorites.map(item => {
            const isRemoving = removingId === item.id;
            const isDragging = draggedId === item.id;
            const isDragOver = dragOverId === item.id;
            
            return (
              <div
                key={item.id}
                draggable={!isRemoving}
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id)}
                style={{
                  padding: "16px 20px",
                  backgroundColor: isRemoving 
                    ? "rgba(255, 100, 100, 0.1)" 
                    : isDragOver
                    ? "rgba(100, 150, 255, 0.15)"
                    : "rgba(255, 255, 255, 0.04)",
                  borderRadius: "8px",
                  border: isDragOver 
                    ? "2px solid rgba(100, 150, 255, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: isDragging ? "grabbing" : isRemoving ? "not-allowed" : "grab",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isRemoving ? "scale(0.95)" : "scale(1)",
                  opacity: isDragging ? 0.5 : isRemoving ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isRemoving && !isDragging) {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isRemoving) {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
                onClick={(e) => {
                  console.log("[FavoritesPage] Card clicked!", { target: e.target, currentTarget: e.currentTarget });
                  if (!isRemoving) {
                    handleNavigate(item.path, item.title);
                  }
                }}
              >
                <div style={{ 
                  flex: 1,
                  minWidth: 0, // For text truncation
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}>
                  {/* Drag Handle */}
                  <div style={{
                    fontSize: "18px",
                    opacity: isDragging ? 0.3 : 0.4,
                    cursor: "grab",
                    userSelect: "none",
                    lineHeight: 1
                  }}>
                    ⋮⋮
                  </div>
                  
                  <div style={{ 
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "15px",
                    flex: 1,
                    minWidth: 0
                  }}>
                    <span style={{ fontSize: "20px" }}>
                      {getResourceIcon(item.title)}
                    </span>
                    <span style={{ 
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {item.title}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.id);
                  }}
                  disabled={isRemoving}
                  title="Remove from favorites"
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    cursor: isRemoving ? "not-allowed" : "pointer",
                    backgroundColor: "transparent",
                    border: "1px solid rgba(255, 100, 100, 0.4)",
                    borderRadius: "6px",
                    color: "#ff6b6b",
                    transition: "all 0.2s ease",
                    fontWeight: "500",
                    whiteSpace: "nowrap",
                    opacity: isRemoving ? 0.5 : 0.8,
                  }}
                  onMouseEnter={(e) => {
                    if (!isRemoving) {
                      e.currentTarget.style.backgroundColor = "rgba(255, 100, 100, 0.15)";
                      e.currentTarget.style.borderColor = "rgba(255, 100, 100, 0.6)";
                      e.currentTarget.style.opacity = "1";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isRemoving) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = "rgba(255, 100, 100, 0.4)";
                      e.currentTarget.style.opacity = "0.8";
                    }
                  }}
                >
                  {isRemoving ? "Removing..." : "Remove"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      {favorites.length > 0 && (
        <div style={{ 
          marginTop: "32px", 
          padding: "20px 24px", 
          backgroundColor: "rgba(100, 150, 255, 0.08)",
          borderRadius: "8px",
          border: "1px solid rgba(100, 150, 255, 0.2)",
          fontSize: "13px",
          lineHeight: "1.6"
        }}>
          <div style={{ 
            fontWeight: "600",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>💡</span>
            <span>Pro Tips</span>
          </div>
          <div style={{ opacity: 0.9 }}>
            Click any favorite to navigate directly to that resource. Drag and drop favorites to reorder them. Hover over sidebar items to see the star icon and add more favorites. Favorites are saved per cluster - each cluster has its own list.
          </div>
        </div>
      )}
    </div>
  );
});
