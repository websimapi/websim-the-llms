// Debug helper for LLM Collection view rendering issues
export function debugCollectionRendering() {
    console.log('--------- Collection Viewport Debug Start ---------');
    
    // Check for collection viewport element
    const viewport = document.querySelector('.collection-viewport');
    if (!viewport) {
        console.error('Collection viewport element not found in DOM');
        return false;
    }
    
    // Check viewport dimensions
    const rect = viewport.getBoundingClientRect();
    console.log('Viewport dimensions:', {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        visible: isElementVisible(viewport)
    });
    
    // Check if element has any renderer children
    const rendererCanvas = viewport.querySelector('canvas');
    if (!rendererCanvas) {
        console.error('No canvas element found in viewport - renderer not attached');
        return false;
    }
    
    console.log('Renderer canvas found:', {
        width: rendererCanvas.width,
        height: rendererCanvas.height,
        style: rendererCanvas.style.cssText
    });
    
    // Check visibility in DOM hierarchy
    const parentVisibility = getParentVisibilityInfo(viewport);
    console.log('Parent visibility chain:', parentVisibility);
    
    // Check for any z-index issues
    const zIndexIssues = checkZIndexIssues(viewport);
    console.log('Z-index issues:', zIndexIssues);
    
    // Check CSS visibility properties
    const computedStyle = window.getComputedStyle(viewport);
    console.log('Computed styles:', {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        transform: computedStyle.transform,
        position: computedStyle.position,
        zIndex: computedStyle.zIndex
    });
    
    console.log('--------- Collection Viewport Debug End ---------');
    return true;
}

// Check if an element is visible in the viewport
function isElementVisible(el) {
    if (!el) return false;
    
    const style = window.getComputedStyle(el);
    if (style.display === 'none') return false;
    if (style.visibility !== 'visible') return false;
    if (parseFloat(style.opacity) <= 0) return false;
    
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    
    return true;
}

// Get visibility info for all parent elements
function getParentVisibilityInfo(element) {
    const info = [];
    let current = element.parentElement;
    
    while (current) {
        const style = window.getComputedStyle(current);
        info.push({
            tag: current.tagName,
            id: current.id,
            class: current.className,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            overflow: style.overflow
        });
        current = current.parentElement;
    }
    
    return info;
}

// Check for z-index issues that could hide the viewport
function checkZIndexIssues(element) {
    const issues = [];
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const elementZIndex = style.zIndex !== 'auto' ? parseInt(style.zIndex) : 0;
    
    // Find all elements that might overlap
    document.querySelectorAll('*').forEach(el => {
        if (el === element || el.contains(element) || element.contains(el)) return;
        
        const elRect = el.getBoundingClientRect();
        const elStyle = window.getComputedStyle(el);
        const elZIndex = elStyle.zIndex !== 'auto' ? parseInt(elStyle.zIndex) : 0;
        
        // Check if elements overlap
        const overlap = !(
            elRect.right < rect.left || 
            elRect.left > rect.right || 
            elRect.bottom < rect.top || 
            elRect.top > rect.bottom
        );
        
        if (overlap && elZIndex > elementZIndex && elStyle.position !== 'static') {
            issues.push({
                element: `${el.tagName}#${el.id}.${el.className}`,
                zIndex: elZIndex,
                position: elStyle.position
            });
        }
    });
    
    return issues;
}

// Apply debug styling to help visualize the viewport
export function applyDebugStyling() {
    const viewport = document.querySelector('.collection-viewport');
    if (!viewport) return;
    
    // Add debug border
    viewport.style.border = '2px dashed red';
    
    // Add debug label
    const debugLabel = document.createElement('div');
    debugLabel.textContent = 'COLLECTION VIEWPORT';
    debugLabel.style.position = 'absolute';
    debugLabel.style.top = '10px';
    debugLabel.style.left = '10px';
    debugLabel.style.background = 'rgba(255,0,0,0.7)';
    debugLabel.style.color = 'white';
    debugLabel.style.padding = '5px';
    debugLabel.style.zIndex = '9999';
    debugLabel.style.pointerEvents = 'none';
    viewport.appendChild(debugLabel);
    
    // Force dimensions if needed
    if (viewport.clientWidth < 100 || viewport.clientHeight < 100) {
        viewport.style.minWidth = '300px';
        viewport.style.minHeight = '200px';
        console.log('Applied minimum dimensions to viewport');
    }
}