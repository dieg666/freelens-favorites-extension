import { FavoritesStore } from "../../common/store";

export function initializeSidebarInjection() {
  const store = FavoritesStore.getInstance();
  if (!store) {
    console.error("[SidebarInjection] Store not available");
    return;
  }

  // Debounce timer for observer
  let debounceTimer: NodeJS.Timeout | null = null;

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

      /* Make Favorites menu sticky - full width coverage */
      .favorites-menu-sticky {
        position: sticky !important;
        top: 0 !important;
        z-index: 1000 !important;
        
        /* Same background as sidebar by default */
        background-color: var(--sidebarBackground, #36393e) !important;
        
        /* Smooth transitions */
        transition: background-color 0.2s ease !important;
      }
      
      /* Favorites menu link - top level item */
      .favorites-menu-sticky > a[class*="navItem"] {
        position: relative !important;
        z-index: 10 !important;
      }
      
      /* Hybrid approach: subtle background overlay + border + shadow */
      .favorites-menu-sticky.is-stuck {
        /* Frosted glass effect - clearly shows stickiness */
        background-color: rgba(54, 57, 62, 0.98) !important;
        
        /* Clear separator */
        border-bottom: 1px solid var(--borderFaintColor, #373a3e) !important;
        
        /* Pronounced but tasteful shadow */
        box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.3) !important;
      }
      
      /* Only apply cyan when Favorites page is actually active (clicked) */
      .favorites-menu-sticky > a[class*="navItem"]:global(.active) {
        background: var(--primary, #00a7a0) !important;
        color: var(--sidebarActiveColor, #ffffff) !important;
      }
      
      /* Dropdown items - behave like submenu items (no background, no borders) */
      .favorites-dropdown-item {
        position: relative !important;
        color: var(--textColorPrimary, #8e9297) !important;
        background-color: var(--sidebarBackground, #36393e) !important;
        border: none !important;
        border-top: none !important;
        border-bottom: none !important;
        transition: color 0.15s ease, transform 0.15s ease, background-color 0.15s ease !important;
        
        /* Left padding to align with parent when border appears */
        padding-left: 40px !important;
        
        /* Match main sidebar item font size */
        font-size: 14px !important;
        
        /* Full opacity */
        opacity: 1 !important;
      }
      
      /* Hover - match submenu behavior with subtle lift effect */
      .favorites-dropdown-item:hover {
        color: var(--sidebarSubmenuActiveColor, #ffffff) !important;
        background-color: rgba(255, 255, 255, 0.05) !important;
        transform: translateX(2px) !important;
      }
      
      /* Active state - cyan accent like FreeLens submenus */
      .favorites-dropdown-item:global(.active) {
        color: var(--sidebarSubmenuActiveColor, #ffffff) !important;
        background-color: rgba(255, 255, 255, 0.08) !important;
        border-left: 4px solid var(--primary, #00a7a0) !important;
        padding-left: 36px !important; /* Compensate for border */
      }
      
      /* Collapsible dropdown container */
      .favorites-dropdown-container {
        overflow: hidden !important;
        transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .favorites-dropdown-container.collapsed {
        max-height: 0 !important;
      }
      
      /* Expand/collapse icon - use native Material Icon style */
      .favorites-expand-icon {
        position: absolute !important;
        right: 8px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        opacity: 0.7 !important;
        pointer-events: auto !important;
        cursor: pointer !important;
        padding: 4px !important;
        z-index: 10 !important;
        font-family: 'Material Icons' !important;
        font-size: 24px !important;
        line-height: 1 !important;
        user-select: none !important;
        color: inherit !important;
        margin-left: auto !important;
      }
      
      .favorites-expand-icon:hover {
        opacity: 1 !important;
      }
      
      /* Rotate when collapsed - same as native FreeLens */
      .favorites-menu-collapsed .favorites-expand-icon {
        transform: translateY(-50%) rotate(-180deg) !important;
      }

      .favorites-star-btn {
        position: absolute !important;
        right: 8px !important;
        top: 50% !important;
        transform: translateY(-50%) scale(1) !important;
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
        font-size: 18px !important;
        padding: 4px !important;
        opacity: 0 !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        color: var(--textColorPrimary, #8e9297) !important;
        z-index: 1 !important;
        line-height: 1 !important;
        width: auto !important;
        height: auto !important;
        display: block !important;
        filter: none !important;
      }

      [class*="navItem"]:hover .favorites-star-btn {
        opacity: 0.7 !important;
      }

      .favorites-star-btn:hover {
        opacity: 1 !important;
        transform: translateY(-50%) scale(1.2) !important;
        color: var(--textColorAccent, #ffffff) !important;
      }

      /* Favorited state - white/light color (no yellow) */
      .favorites-star-btn.favorited {
        opacity: 0.95 !important;
        color: var(--textColorAccent, #ffffff) !important;
      }
      
      .favorites-star-btn.favorited:hover {
        transform: translateY(-50%) scale(1.15) !important;
        color: var(--textColorAccent, #ffffff) !important;
      }

      @keyframes star-pop {
        0% { transform: translateY(-50%) scale(1); }
        50% { transform: translateY(-50%) scale(1.4); }
        100% { transform: translateY(-50%) scale(1); }
      }

      .favorites-star-btn.adding {
        animation: star-pop 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      /* Remove button - aligned with expand icon */
      .favorites-remove-btn {
        position: absolute !important;
        right: 8px !important;
        top: 50% !important;
        transform: translateY(-50%) scale(0.9) !important;
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
        font-size: 24px !important;
        padding: 4px !important;
        opacity: 0 !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        color: #ff5252 !important;
        z-index: 20 !important;
        line-height: 1 !important;
        width: auto !important;
        height: auto !important;
        user-select: none !important;
        font-family: 'Material Icons' !important;
      }
      
      .favorites-dropdown-item:hover .favorites-remove-btn {
        opacity: 0.7 !important;
        transform: translateY(-50%) scale(1) !important;
      }
      
      .favorites-remove-btn:hover {
        opacity: 1 !important;
        transform: translateY(-50%) scale(1.2) !important;
        color: #ff3333 !important;
        filter: drop-shadow(0 2px 4px rgba(255, 51, 51, 0.3)) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Function to update existing star buttons
  const updateStarButtons = () => {
    const sidebarItems = document.querySelectorAll('[class*="navItem"]');
    
    sidebarItems.forEach((item) => {
      const starBtn = item.querySelector(".favorites-star-btn") as HTMLButtonElement;
      if (!starBtn) return;
      
      // Check if this is actually in the sidebar
      const isInSidebar = !!(
        item.closest('[class*="Sidebar"]') || 
        item.closest('[class*="sidebar"]') ||
        item.closest('nav') ||
        (item as HTMLElement).getAttribute?.('data-testid')?.startsWith('link-for-sidebar-item')
      );
      
      if (!isInSidebar) return;
      
      const linkElement = item.tagName === "A" 
        ? (item as HTMLAnchorElement) 
        : item.querySelector("a");
      if (!linkElement) return;
      
      // Get the item identifier (same logic as in addStarButtons)
      const dataTestId = linkElement.getAttribute('data-testid');
      const dataHref = linkElement.getAttribute('data-href');
      const hrefAttr = linkElement.getAttribute("href");
      
      let itemId: string;
      if (dataTestId) {
        itemId = dataTestId;
      } else if (dataHref && dataHref !== '/') {
        itemId = dataHref;
      } else if (hrefAttr) {
        itemId = hrefAttr;
      } else {
        return;
      }
      
      // Update star button state
      const isFavorited = store.isFavorited(itemId);
      if (isFavorited) {
        starBtn.innerHTML = "★";
        starBtn.classList.add("favorited");
        starBtn.title = "Remove from favorites";
      } else {
        starBtn.innerHTML = "☆";
        starBtn.classList.remove("favorited");
        starBtn.title = "Add to favorites";
      }
    });
  };

  // Function to add star buttons to sidebar items
  const addStarButtons = () => {
    const sidebarItems = document.querySelectorAll('[class*="navItem"]');
    
    let processedCount = 0;
    let skippedCount = 0;

    sidebarItems.forEach((item, index) => {
      // Skip if already has a star button
      if (item.querySelector(".favorites-star-btn")) {
        skippedCount++;
        return;
      }
      
      // CRITICAL: Check if this element is actually in the sidebar navigation
      // by checking if it or its ancestors have sidebar-related classes
      const isInSidebar = !!(
        item.closest('[class*="Sidebar"]') || 
        item.closest('[class*="sidebar"]') ||
        item.closest('nav') ||
        // Check if element has data-testid starting with "link-for-sidebar-item"
        (item as HTMLElement).getAttribute?.('data-testid')?.startsWith('link-for-sidebar-item')
      );
      
      if (!isInSidebar) {
        skippedCount++;
        return;
      }

      const linkElement =
        item.tagName === "A"
          ? (item as HTMLAnchorElement)
          : item.querySelector("a");
      if (!linkElement) {
        skippedCount++;
        return;
      }

      const hrefAttr = linkElement.getAttribute("href");
      
      if (!hrefAttr) {
        skippedCount++;
        return;
      }

      // Get the pathname - FreeLens uses client-side routing
      // So we need to use a combination of href and the item's position/text
      let pathname: string;
      let itemId: string;
      
      // Extract clean title (avoid textContent which includes all child elements like icons)
      // Look for a specific element containing the title, or use the direct text nodes only
      let title = '';
      const titleElement = linkElement.querySelector('[class*="title"]') || linkElement.querySelector('span');
      if (titleElement) {
        // Try to get text from title element only
        const titleText = Array.from(titleElement.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent)
          .join('')
          .trim();
        title = titleText || titleElement.textContent?.trim() || '';
      } else {
        // Fallback: get only text nodes directly under the link
        title = Array.from(linkElement.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent)
          .join('')
          .trim();
      }
      
      // If still empty, use textContent but clean it up
      if (!title) {
        title = linkElement.textContent?.trim() || '';
      }
      
      // Clean up common UI elements from the title
      title = title
        .replace(/keyboard_arrow_down/g, '')
        .replace(/keyboard_arrow_up/g, '')
        .replace(/keyboard_arrow_right/g, '')
        .replace(/expand_more/g, '')
        .replace(/expand_less/g, '')
        .replace(/chevron_right/g, '')
        .trim();
      
      // Check if FreeLens is using data attributes for routing
      const dataTestId = linkElement.getAttribute('data-testid');
      const dataHref = linkElement.getAttribute('data-href');
      const ariaLabel = linkElement.getAttribute('aria-label');
      
      // Prefer data-testid as it's unique and stable
      // Format is usually like: "link-for-sidebar-item-pods"
      if (dataTestId) {
        pathname = dataTestId;
        itemId = dataTestId;
      } else if (dataHref && dataHref !== '/') {
        pathname = dataHref;
        itemId = dataHref;
      } else if (hrefAttr.startsWith('#')) {
        // Hash-based routing: #/workloads/pods
        pathname = hrefAttr.substring(1);
        itemId = pathname;
      } else if (hrefAttr.startsWith('http')) {
        // Full URL
        try {
          const url = new URL(hrefAttr);
          pathname = url.hash ? url.hash.substring(1) : url.pathname;
          itemId = pathname;
        } catch {
          pathname = hrefAttr;
          itemId = hrefAttr;
        }
      } else if (hrefAttr === '/' && title) {
        // FreeLens uses href="/" with client-side routing
        // Use title as the identifier instead (fallback)
        pathname = `/${title.toLowerCase().replace(/\s+/g, '-')}`;
        itemId = title; // Use title as unique ID
      } else {
        // Relative path
        pathname = hrefAttr;
        itemId = hrefAttr;
      }

      // Skip only the Favorites menu itself and its dropdown items
      if (title.toLowerCase() === 'favorites' || 
          pathname.includes("/favorites") ||
          item.classList.contains('favorites-dropdown-item') ||
          item.classList.contains('favorites-menu-link')) {
        skippedCount++;
        return;
      }
      
      // Skip items without a meaningful identifier
      if (!itemId || !title) {
        skippedCount++;
        return;
      }
      
      // Detect if this is a group (to skip adding star to it)
      const isGroup = item.querySelector('[class*="arrow"]') || 
                      item.querySelector('.favorites-expand-icon') || // Skip if has expand icon
                      linkElement.textContent?.includes('keyboard_arrow') ||
                      item.nextElementSibling?.classList.toString().includes('sub') ||
                      item.nextElementSibling?.classList.toString().includes('child');
      
      // Skip groups - don't add stars to them
      if (isGroup) {
        skippedCount++;
        return;
      }
      
      processedCount++;

      // Create star button
      const starBtn = document.createElement("button");
      starBtn.className = "favorites-star-btn";
      starBtn.innerHTML = "☆";
      starBtn.title = "Add to favorites";

      // Check if already favorited
      const isFavorited = store.isFavorited(itemId);
      if (isFavorited) {
        starBtn.innerHTML = "★";
        starBtn.classList.add("favorited");
        starBtn.title = "Remove from favorites";
      }

      // Handle click
      starBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (store.isFavorited(itemId)) {
          // Remove from favorites
          const items = store.items;
          const item = items.find((i) => i.path === itemId);
          if (item) {
            store.removeFavorite(item.id);
            starBtn.innerHTML = "☆";
            starBtn.classList.remove("favorited");
            starBtn.title = "Add to favorites";
          }
        } else {
          // Add to favorites with animation
          starBtn.classList.add("adding");
          
          store.addFavorite({
            title,
            path: itemId, // Use itemId as the unique path
          });
          
          starBtn.innerHTML = "★";
          starBtn.classList.remove("adding");
          starBtn.classList.add("favorited");
          starBtn.title = "Remove from favorites";
        }

        // Refresh favorites dropdown immediately without waiting for observer
        setTimeout(() => updateFavoritesDropdown(), 0);
        
        // Notify dashboard to refresh
        window.dispatchEvent(new CustomEvent('favorites-updated'));
      };

      // Append star button to the item
      item.appendChild(starBtn);
    });
  };

  // State for collapse - persist across DOM updates
  let isCollapsed = false;

  // Function to make Favorites menu sticky and collapsible
  const makeFavoritesSticky = () => {
    // Find the favorites menu item
    const allNavItems = document.querySelectorAll('[class*="navItem"]');
    
    for (const item of allNavItems) {
      const text = item.textContent?.trim();
      
      // Check if text contains "Favorites" (case-insensitive)
      if (text && text.toLowerCase().includes("favorites")) {
        // Get the parent wrapper (SidebarItem container)
        const parentWrapper = item.parentElement;
        
        if (parentWrapper) {
          // Apply sticky to the parent wrapper
          parentWrapper.classList.add('favorites-menu-sticky');
          
          // Mark the link itself to prevent stars from being added
          item.classList.add('favorites-menu-link');
          
          // Restore collapse state if it was collapsed
          if (isCollapsed) {
            parentWrapper.classList.add('favorites-menu-collapsed');
          }
          
          // Add expand/collapse icon if not already present
          if (!item.querySelector('.favorites-expand-icon')) {
            const expandIcon = document.createElement('span');
            expandIcon.className = 'favorites-expand-icon material-icons';
            expandIcon.textContent = 'keyboard_arrow_down'; // Material Icon name
            item.appendChild(expandIcon);
            
            // Clicking the expand icon toggles collapse
            expandIcon.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              isCollapsed = !isCollapsed;
              toggleDropdown(isCollapsed);
            });
            
            // Clicking the link itself navigates to dashboard (default behavior)
            // We don't need to add a handler - just let the link work normally
          }
          
          // Detect when element is stuck using IntersectionObserver
          const observer = new IntersectionObserver(
            ([entry]) => {
              if (entry.intersectionRatio < 1) {
                parentWrapper.classList.add('is-stuck');
              } else {
                parentWrapper.classList.remove('is-stuck');
              }
            },
            { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
          );
          
          observer.observe(parentWrapper);
        }
        
        break;
      }
    }
  };
  
  // Function to toggle dropdown visibility
  const toggleDropdown = (collapse: boolean) => {
    const allNavItems = document.querySelectorAll('[class*="navItem"]');
    
    for (const item of allNavItems) {
      const text = item.textContent?.trim();
      
      if (text && text.toLowerCase().includes("favorites")) {
        const parentWrapper = item.parentElement;
        
        if (parentWrapper) {
          if (collapse) {
            parentWrapper.classList.add('favorites-menu-collapsed');
          } else {
            parentWrapper.classList.remove('favorites-menu-collapsed');
          }
          
          // Update dropdown items visibility
          const dropdownItems = document.querySelectorAll('.favorites-dropdown-item');
          dropdownItems.forEach((dropItem) => {
            const htmlItem = dropItem as HTMLElement;
            if (collapse) {
              htmlItem.style.display = 'none';
            } else {
              htmlItem.style.display = '';
            }
          });
        }
        
        break;
      }
    }
  };

  // Function to update favorites dropdown
  const updateFavoritesDropdown = () => {
    // Find the favorites menu item by looking for text containing "Favorites"
    let favoritesMenuItem: Element | null = null;

    const allNavItems = document.querySelectorAll('[class*="navItem"]');
    
    for (const item of allNavItems) {
      const text = item.textContent?.trim();
      
      // Check if text contains "Favorites" (case-insensitive)
      if (text && text.toLowerCase().includes("favorites")) {
        favoritesMenuItem = item;
        break;
      }
    }

    if (!favoritesMenuItem) {
      return;
    }

    // Remove existing dropdown items
    const existingDropdown = document.querySelectorAll(".favorites-dropdown-item");
    existingDropdown.forEach((item) => item.remove());

    const parent = favoritesMenuItem.parentElement;
    if (!parent) {
      return;
    }

    // Get all favorite items FOR CURRENT CLUSTER ONLY
    const favorites = store.currentClusterItems;

    if (favorites.length === 0) {
      return;
    }

    // Insert favorites as siblings after the Favorites menu item
    let insertAfter: Element = favoritesMenuItem;

    // Render all favorite items
    favorites.forEach((fav) => {
      const dropdownItem = createDropdownItem(fav, favoritesMenuItem!, 40);
      
      // Apply collapse state if items should be hidden
      if (isCollapsed) {
        (dropdownItem as HTMLElement).style.display = 'none';
      }
      
      parent.insertBefore(dropdownItem, insertAfter.nextSibling);
      insertAfter = dropdownItem;
    });
  };

  // Helper function to create a dropdown item
  const createDropdownItem = (fav: any, favoritesMenuItem: Element, paddingLeft: number) => {
    const dropdownItem = document.createElement("a");
    // Remove any "active", "selected", or "favorites-menu-link" classes from the base class name
    const baseClasses = favoritesMenuItem.className
      .split(' ')
      .filter(c => 
        !c.toLowerCase().includes('active') && 
        !c.toLowerCase().includes('selected') &&
        !c.includes('favorites-menu-link')
      )
      .join(' ');
    dropdownItem.className = baseClasses + " favorites-dropdown-item";
    dropdownItem.href = "#"; // Use # to prevent navigation
    dropdownItem.style.cssText =
      `border: none !important;
       outline: none !important;
       box-shadow: none !important;`;
    dropdownItem.innerHTML = `<span class="title">${fav.title}</span>`;

    // Handle click to navigate to the actual sidebar item
    dropdownItem.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Find the corresponding sidebar item and click it
      const allNavItems = document.querySelectorAll('[class*="navItem"]');
      for (const item of allNavItems) {
        const linkElement = item.tagName === "A" ? item as HTMLAnchorElement : item.querySelector("a");
        if (!linkElement) continue;
        
        // Get data-testid (most reliable)
        const dataTestId = linkElement.getAttribute('data-testid');
        
        // Match by data-testid first (best match)
        if (dataTestId === fav.path) {
          linkElement.click();
          return;
        }
        
        // Fallback: match by title
        const title = item.textContent?.trim() || '';
        const cleanTitle = title
          .replace(/keyboard_arrow_down/g, '')
          .replace(/keyboard_arrow_up/g, '')
          .trim();
        
        if (cleanTitle === fav.title || title === fav.path) {
          linkElement.click();
          return;
        }
      }
      
      console.warn("[SidebarDropdown] Could not find sidebar item for:", fav.title);
    };

    // Add remove button
    const removeBtn = document.createElement("button");
    removeBtn.className = "favorites-remove-btn";
    removeBtn.innerHTML = "close"; // Material Icons name
    removeBtn.title = "Remove from favorites";

    // Remove button click handler
    removeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      store.removeFavorite(fav.id);
      
      // Update sidebar stars
      updateStarButtons();
      // Refresh dropdown immediately
      setTimeout(() => updateFavoritesDropdown(), 0);
    };

    dropdownItem.appendChild(removeBtn);
    return dropdownItem;
  };

  // Initial injection with multiple retry attempts
  const attemptInjection = (attemptNumber: number = 0) => {
    try {
      const maxAttempts = 10;
      
      addStarButtons();
      updateFavoritesDropdown();
      makeFavoritesSticky();
      
      // Keep retrying for the first 5 seconds
      if (attemptNumber < maxAttempts) {
        setTimeout(() => attemptInjection(attemptNumber + 1), 500);
      }
    } catch (error) {
      console.error('[SidebarInjection] Error in attemptInjection:', error);
    }
  };
  
  // Start immediate injection
  try {
    attemptInjection();
    
    // Also try immediately
    addStarButtons();
    updateFavoritesDropdown();
    makeFavoritesSticky();
  } catch (error) {
    console.error('[SidebarInjection] Error starting injection:', error);
  }

  // Re-inject when DOM changes (debounced)
  const observer = new MutationObserver((mutations) => {
    // Check if any of the mutations are relevant (not our own dropdown items)
    const isRelevant = mutations.some(mutation => {
      // Ignore changes to our dropdown items
      if (mutation.target instanceof Element) {
        if (mutation.target.classList.contains('favorites-dropdown-item')) {
          return false;
        }
      }
      
      // Ignore additions/removals of our dropdown items
      const addedNodes = Array.from(mutation.addedNodes);
      const removedNodes = Array.from(mutation.removedNodes);
      const allNodes = [...addedNodes, ...removedNodes];
      
      for (const node of allNodes) {
        if (node instanceof Element && node.classList.contains('favorites-dropdown-item')) {
          return false;
        }
      }
      
      return true;
    });
    
    if (!isRelevant) {
      return; // Skip if all mutations are our own dropdown changes
    }
    
    // Debounce the injection to avoid rapid repeated calls
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
      addStarButtons();
      updateFavoritesDropdown();
      makeFavoritesSticky();
    }, 200);
  });

  // Observe the sidebar for changes
  const sidebar = document.querySelector(".Sidebar") || document.body;
  observer.observe(sidebar, {
    childList: true,
    subtree: true,
  });

  // Listen for favorites updates from the dashboard
  const handleFavoritesUpdate = () => {
    // Update existing star buttons
    updateStarButtons();
    // Also update dropdown
    updateFavoritesDropdown();
    // Ensure sticky positioning is maintained
    makeFavoritesSticky();
  };
  
  window.addEventListener('favorites-updated', handleFavoritesUpdate);

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    observer.disconnect();
    window.removeEventListener('favorites-updated', handleFavoritesUpdate);
  };
}
