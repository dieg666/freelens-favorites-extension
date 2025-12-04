import React from "react";
import { Renderer } from "@freelensapp/extensions";
import { FavoritesStore } from "../common/store";
import { FavoritesIcon } from "./icons";
import { FavoritesPage } from "./components";
import { initializeSidebarInjection } from "./utils/sidebar-injection";

export default class CustomRenderer extends Renderer.LensExtension {
  private cleanupInjection?: () => void;
  private clusterIdObserver?: MutationObserver;

  async onActivate() {
    // Initialize favorites store
    const store = FavoritesStore.getInstanceOrCreate();
    await store.loadExtension(this);
    
    // Wait for store to be fully loaded before initializing sidebar
    await store.whenReady;
    
    console.log("[CustomRenderer] Store ready, initializing sidebar injection");
    
    // Detect and set current cluster ID
    this.detectAndSetClusterId();
    
    // Initialize sidebar injection immediately
    // The injection logic will handle timing internally
    this.cleanupInjection = initializeSidebarInjection();
  }

  private detectAndSetClusterId() {
    const store = FavoritesStore.getInstance();
    if (!store) return;

    // Function to extract cluster ID from URL or DOM
    const updateClusterId = () => {
      const url = window.location.href;
      const hash = window.location.hash;
      const pathname = window.location.pathname;
      const hostname = window.location.hostname;
      
      console.log("[CustomRenderer] Detecting cluster ID - Hostname:", hostname, "URL:", url);
      
      let clusterId: string | null = null;
      
      // Pattern 1: Cluster ID in subdomain (FreeLens uses this!)
      // Format: https://{clusterid}.renderer.freelens.app:port/...
      const subdomainMatch = hostname.match(/^([a-f0-9]{32})\.renderer\.freelens\.app$/i);
      if (subdomainMatch) {
        clusterId = subdomainMatch[1];
        console.log("[CustomRenderer] Detected cluster ID from subdomain:", clusterId);
        store.setCurrentCluster(clusterId);
        return;
      }
      
      // Pattern 2: /cluster/{id} in pathname
      let clusterMatch = pathname.match(/\/cluster\/([^\/]+)/);
      if (clusterMatch) {
        clusterId = clusterMatch[1];
      }
      
      // Pattern 3: #/cluster/{id} in hash
      if (!clusterId) {
        clusterMatch = hash.match(/#?\/?cluster\/([^\/]+)/);
        if (clusterMatch) clusterId = clusterMatch[1];
      }
      
      // Pattern 4: cluster={id} query param
      if (!clusterId) {
        clusterMatch = url.match(/[?&]cluster=([^&]+)/);
        if (clusterMatch) clusterId = clusterMatch[1];
      }
      
      if (clusterId) {
        console.log("[CustomRenderer] Detected cluster ID from URL:", clusterId);
        store.setCurrentCluster(clusterId);
        return;
      }

      // Pattern 5: From DOM element with id="cluster-{clusterid}"
      const clusterElement = document.querySelector('[id^="cluster-"]');
      if (clusterElement && clusterElement.id) {
        const elementIdMatch = clusterElement.id.match(/^cluster-([a-f0-9]{32})$/i);
        if (elementIdMatch) {
          clusterId = elementIdMatch[1];
          console.log("[CustomRenderer] Detected cluster ID from element ID:", clusterId);
          store.setCurrentCluster(clusterId);
          return;
        }
      }
      
      // Pattern 6: data-cluster-id attribute
      const clusterFrame = document.querySelector('[data-cluster-id]');
      if (clusterFrame) {
        const dataClusterId = clusterFrame.getAttribute('data-cluster-id');
        if (dataClusterId) {
          console.log("[CustomRenderer] Detected cluster ID from data attribute:", dataClusterId);
          store.setCurrentCluster(dataClusterId);
          return;
        }
      }

      console.log("[CustomRenderer] No cluster ID detected yet");
    };

    // Initial detection immediately
    updateClusterId();
    
    // Retry with delays to let FreeLens initialize
    setTimeout(updateClusterId, 100);
    setTimeout(updateClusterId, 500);

    // Watch for URL changes (hash navigation)
    window.addEventListener('hashchange', updateClusterId);
    window.addEventListener('popstate', updateClusterId);

    // Also watch for DOM changes (lighter monitoring)
    this.clusterIdObserver = new MutationObserver(() => {
      updateClusterId();
    });
    this.clusterIdObserver.observe(document.body, {
      childList: true,
      subtree: false, // Don't watch deep subtree to reduce overhead
      attributes: true,
      attributeFilter: ['data-cluster-id', 'id'],
    });
  }

  onDeactivate() {
    // Cleanup when extension is deactivated
    if (this.cleanupInjection) {
      this.cleanupInjection();
    }
    
    if (this.clusterIdObserver) {
      this.clusterIdObserver.disconnect();
    }
    
    window.removeEventListener('hashchange', this.detectAndSetClusterId);
  }

  // Favorites page in cluster context
  clusterPages = [
    {
      id: "favorites",
      components: {
        Page: () => <FavoritesPage extension={this} />,
      },
    },
  ];

  // Sidebar menu for favorites (appears at top)
  clusterPageMenus = [
    {
      id: "favorites",
      title: "Favorites",
      target: { pageId: "favorites" },
      components: {
        Icon: FavoritesIcon,
      },
      orderNumber: 1, // Lowest number = appears first
    },
  ];
}
