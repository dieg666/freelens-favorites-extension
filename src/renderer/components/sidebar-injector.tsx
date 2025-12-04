import React, { useEffect } from "react";
import { FavoritesStore } from "../../common/store";

export const SidebarInjector = () => {
  const store = FavoritesStore.getInstance();

  useEffect(() => {
    console.log("[SidebarInjector] Injecting into sidebar");

    // Inject CSS for star icons
    const styleId = "favorites-sidebar-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        /* Add star icon container to sidebar items */
        [class*="navItem"] {
          position: relative !important;
        }

        .favorites-star-btn {
          position: absolute !important;
          right: 8px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
          font-size: 18px !important;
          padding: 4px !important;
          opacity: 0 !important;
          transition: opacity 0.2s !important;
          color: #ffc107 !important;
          z-index: 9999 !important;
          line-height: 1 !important;
          width: auto !important;
          height: auto !important;
          display: block !important;
        }

        [class*="navItem"]:hover .favorites-star-btn {
          opacity: 0.8 !important;
        }

        .favorites-star-btn:hover {
          opacity: 1 !important;
        }

        .favorites-star-btn.favorited {
          opacity: 1 !important;
        }

        /* Style for favorites dropdown */
        #favorites-menu-item {
          font-weight: bold;
        }

        .favorites-dropdown {
          padding-left: 20px;
        }
      `;
      document.head.appendChild(style);
      console.log("[SidebarInjector] CSS injected");
    }

    // Function to add star buttons to sidebar items
    const addStarButtons = () => {
      // Try multiple selectors to find sidebar navigation items
      // Use attribute selector to find items with navItem in class name (CSS modules)
      let sidebarItems = document.querySelectorAll('[class*="navItem"]');
      
      if (sidebarItems.length === 0) {
        // Fallback to standard selectors
        sidebarItems = document.querySelectorAll('.SidebarNavItem, nav a, aside a');
      }

      console.log(`[SidebarInjector] Found ${sidebarItems.length} sidebar items`);
      
      // Log some examples of what we found
      if (sidebarItems.length > 0) {
        console.log(`[SidebarInjector] Sample item classes:`, sidebarItems[0]?.className);
        console.log(`[SidebarInjector] Sample item href:`, (sidebarItems[0] as HTMLAnchorElement)?.href);
        console.log(`[SidebarInjector] Sample item tag:`, sidebarItems[0]?.tagName);
      }

      sidebarItems.forEach((item) => {
        // Skip if already has a star button
        if (item.querySelector('.favorites-star-btn')) {
          return;
        }

        // Item might be the link itself, or contain a link
        const linkElement = item.tagName === 'A' ? item as HTMLAnchorElement : item.querySelector('a');
        if (!linkElement) return;

        // Get href - could be full URL or pathname
        const hrefAttr = linkElement.getAttribute('href');
        if (!hrefAttr) return;

        // Extract pathname from URL or use as-is if it's already a path
        let pathname: string;
        try {
          const url = new URL(hrefAttr);
          pathname = url.pathname;
        } catch {
          // Not a valid URL, assume it's already a pathname
          pathname = hrefAttr;
        }

        console.log(`[SidebarInjector] Checking item: href=${hrefAttr}, pathname=${pathname}`);

        // Skip empty paths and our own favorites menu  
        if (!pathname || pathname === '#' || pathname.includes('/favorites')) {
          console.log(`[SidebarInjector] Skipping item: ${pathname}`);
          return;
        }

        console.log(`[SidebarInjector] Processing item: ${pathname}`);

        // Extract title from text content
        const title = item.textContent?.trim() || pathname;

        // Create star button
        const starBtn = document.createElement('button');
        starBtn.className = 'favorites-star-btn';
        starBtn.innerHTML = '☆'; // Empty star
        starBtn.title = 'Add to favorites';
        
        // Check if already favorited
        const isFavorited = store?.isFavorited(pathname) || false;
        if (isFavorited) {
          starBtn.innerHTML = '★'; // Filled star
          starBtn.classList.add('favorited');
          starBtn.title = 'Remove from favorites';
        }

        // Handle click
        starBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          console.log(`[SidebarInjector] Star clicked for: ${title} (${pathname})`);
          
          if (!store) {
            console.error("[SidebarInjector] Store not available");
            return;
          }

          if (store.isFavorited(pathname)) {
            // Remove from favorites
            const items = store.items;
            const item = items.find(i => i.path === pathname);
            if (item) {
              store.removeFavorite(item.id);
              starBtn.innerHTML = '☆';
              starBtn.classList.remove('favorited');
              starBtn.title = 'Add to favorites';
              console.log(`[SidebarInjector] Removed from favorites: ${title}`);
            }
          } else {
            // Add to favorites
            store.addFavorite({
              title,
              path: pathname,
            });
            starBtn.innerHTML = '★';
            starBtn.classList.add('favorited');
            starBtn.title = 'Remove from favorites';
            console.log(`[SidebarInjector] Added to favorites: ${title}`);
          }

          // Refresh favorites dropdown
          updateFavoritesDropdown();
        };

        // Append star button to the item
        item.appendChild(starBtn);
        console.log(`[SidebarInjector] Star button added for: ${title}`);
      });
    };

    // Function to update favorites dropdown
    const updateFavoritesDropdown = () => {
      if (!store) return;

      console.log("[SidebarInjector] Updating favorites dropdown");
      
      // Find the favorites menu item by looking for an anchor with "Favorites" text
      let favoritesMenuItem: Element | null = null;
      
      const allNavItems = document.querySelectorAll('[class*="navItem"]');
      for (const item of allNavItems) {
        const text = item.textContent?.trim();
        if (text === 'Favorites') {
          favoritesMenuItem = item;
          console.log("[SidebarInjector] Found Favorites menu item");
          break;
        }
      }
      
      if (!favoritesMenuItem) {
        console.log("[SidebarInjector] Favorites menu item not found");
        return;
      }

      // Remove existing dropdown items
      const existingDropdown = document.querySelectorAll('.favorites-dropdown-item');
      existingDropdown.forEach(item => item.remove());

      // Add favorited items as dropdown
      const favorites = store.items;
      console.log(`[SidebarInjector] Favorites count: ${favorites.length}`);
      
      if (favorites.length === 0) {
        console.log("[SidebarInjector] No favorites to show");
        return;
      }

      const parent = favoritesMenuItem.parentElement;
      if (!parent) {
        console.log("[SidebarInjector] Parent not found");
        return;
      }

      // Insert favorites as siblings after the Favorites menu item
      let insertAfter: Element = favoritesMenuItem;
      
      favorites.forEach(fav => {
        // Create a clickable item that looks like sidebar items
        const dropdownItem = document.createElement('a');
        dropdownItem.className = favoritesMenuItem!.className + ' favorites-dropdown-item';
        dropdownItem.href = fav.path;
        dropdownItem.style.cssText = 'padding-left: 40px !important; font-size: 13px !important; opacity: 0.9 !important;';
        dropdownItem.innerHTML = `<span class="title">${fav.title}</span>`;
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'favorites-remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove from favorites';
        removeBtn.style.cssText = `
          position: absolute !important;
          right: 30px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
          font-size: 20px !important;
          padding: 0 4px !important;
          opacity: 0 !important;
          transition: opacity 0.2s !important;
          color: #ff5252 !important;
          z-index: 9999 !important;
          line-height: 1 !important;
          width: auto !important;
          height: auto !important;
        `;
        
        dropdownItem.addEventListener('mouseenter', () => {
          removeBtn.style.opacity = '0.8';
        });
        dropdownItem.addEventListener('mouseleave', () => {
          removeBtn.style.opacity = '0';
        });
        removeBtn.addEventListener('mouseenter', () => {
          removeBtn.style.opacity = '1';
        });
        
        removeBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          store.removeFavorite(fav.id);
          updateFavoritesDropdown();
        };
        
        dropdownItem.appendChild(removeBtn);
        
        // Insert after the previous element
        parent.insertBefore(dropdownItem, insertAfter.nextSibling);
        insertAfter = dropdownItem;
      });

      console.log(`[SidebarInjector] Added ${favorites.length} items to dropdown`);
    };

    // Initial injection with delay to ensure DOM is ready
    setTimeout(() => {
      console.log("[SidebarInjector] Initial injection (delayed)");
      addStarButtons();
      updateFavoritesDropdown();
    }, 1000);

    // Also try immediately
    addStarButtons();
    updateFavoritesDropdown();

    // Re-inject when DOM changes (e.g., navigation)
    const observer = new MutationObserver((mutations) => {
      // Debounce: only run if there were actual changes
      let shouldUpdate = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
          shouldUpdate = true;
          break;
        }
      }
      
      if (shouldUpdate) {
        console.log("[SidebarInjector] DOM changed, re-injecting");
        addStarButtons();
        updateFavoritesDropdown();
      }
    });

    // Observe the sidebar for changes
    const sidebar = document.querySelector('.Sidebar') || document.body;
    observer.observe(sidebar, {
      childList: true,
      subtree: true,
    });

    console.log("[SidebarInjector] MutationObserver started");

    // Cleanup
    return () => {
      observer.disconnect();
      console.log("[SidebarInjector] Cleanup: observer disconnected");
    };
  }, [store]);

  return null; // This component doesn't render anything
};
