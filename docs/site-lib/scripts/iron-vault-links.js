/**
 * Iron Vault Link Fixer
 * Converts Iron Vault track/entity path spans to working links on the exported site.
 * 
 * Uses MutationObserver to handle SPA-style navigation where content is replaced
 * without full page reloads.
 */
(function() {
  let searchIndex = null;
  let isProcessing = false;

  // Load the search index to resolve entity paths
  async function loadSearchIndex() {
    if (searchIndex) return; // Already loaded
    try {
      const response = await fetch('site-lib/search-index.json');
      if (response.ok) {
        searchIndex = await response.json();
      }
    } catch (e) {
      // Silently fail - entity links with just filenames won't work
    }
  }

  // Convert Obsidian path to HTML path
  function obsidianToHtmlPath(obsidianPath) {
    return obsidianPath
      .toLowerCase()
      .replace(/\.md$/, '.html')
      .replace(/ /g, '-')
      .replace(/'/g, '');
  }

  // Find a page in the search index by filename
  function findPageByFilename(filename) {
    if (!searchIndex || !searchIndex.documentIds) return null;
    
    // Handle both full paths and just filenames
    const searchName = filename.split('/').pop().toLowerCase().replace(/\.md$/, '').replace(/ /g, '-');
    
    for (const id in searchIndex.documentIds) {
      const path = searchIndex.documentIds[id];
      const pathFilename = path.split('/').pop().replace('.html', '');
      if (pathFilename === searchName) {
        return path;
      }
    }
    return null;
  }

  // Convert a span to a link
  function convertToLink(el, href) {
    // Skip if already processed (parent is already a link or element is a link)
    if (el.tagName === 'A' || el.closest('a[data-iv-processed]')) return;
    
    const link = document.createElement('a');
    link.className = el.className;
    link.innerHTML = el.innerHTML;
    link.href = href;
    link.setAttribute('data-iv-processed', 'true');
    
    // Copy all data attributes
    Array.from(el.attributes).forEach(function(attr) {
      if (attr.name.startsWith('data-')) {
        link.setAttribute(attr.name, attr.value);
      }
    });
    
    el.parentNode.replaceChild(link, el);
  }

  // Process track paths (full paths like "The Starforged (NickArrow)/Progress/...")
  function processTrackPaths(container) {
    const root = container || document;
    root.querySelectorAll('span[data-track-path]').forEach(function(el) {
      const trackPath = el.getAttribute('data-track-path');
      if (!trackPath) return;
      
      const htmlPath = obsidianToHtmlPath(trackPath);
      convertToLink(el, htmlPath);
    });
  }

  // Process entity paths (can be full paths or just filenames)
  function processEntityPaths(container) {
    const root = container || document;
    root.querySelectorAll('span[data-entity-path]').forEach(function(el) {
      const entityPath = el.getAttribute('data-entity-path');
      if (!entityPath) return;
      
      // Check if it's already a full path or just a filename
      if (entityPath.includes('/')) {
        // Full path - convert directly
        const htmlPath = obsidianToHtmlPath(entityPath);
        convertToLink(el, htmlPath);
      } else {
        // Just filename - look up in search index
        const resolvedPath = findPageByFilename(entityPath);
        if (resolvedPath) {
          convertToLink(el, resolvedPath);
        }
      }
    });
  }

  // Process all Iron Vault links in a container (or whole document)
  async function processLinks(container) {
    if (isProcessing) return;
    isProcessing = true;
    
    await loadSearchIndex();
    processTrackPaths(container);
    processEntityPaths(container);
    
    isProcessing = false;
  }

  // Debounce function to avoid processing too frequently
  function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  }

  // Debounced version of processLinks
  const debouncedProcessLinks = debounce(function() {
    processLinks();
  }, 100);

  // Set up MutationObserver to watch for content changes (SPA navigation)
  function setupObserver() {
    const centerContent = document.getElementById('center-content');
    if (!centerContent) {
      // Fallback to body if center-content doesn't exist
      return;
    }

    const observer = new MutationObserver(function(mutations) {
      // Check if any mutation added nodes that might contain Iron Vault elements
      let shouldProcess = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node or its children have Iron Vault elements
              if (node.querySelector && (
                node.querySelector('span[data-track-path]') ||
                node.querySelector('span[data-entity-path]') ||
                node.matches('span[data-track-path]') ||
                node.matches('span[data-entity-path]')
              )) {
                shouldProcess = true;
                break;
              }
            }
          }
        }
        if (shouldProcess) break;
      }
      
      if (shouldProcess) {
        debouncedProcessLinks();
      }
    });

    observer.observe(centerContent, {
      childList: true,
      subtree: true
    });
  }

  // Also listen for popstate (browser back/forward navigation)
  window.addEventListener('popstate', function() {
    setTimeout(function() {
      processLinks();
    }, 200);
  });

  // Main initialization
  async function init() {
    await processLinks();
    setupObserver();
  }

  // Run when DOM is ready or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 200);
    });
  } else {
    setTimeout(init, 200);
  }
})();
