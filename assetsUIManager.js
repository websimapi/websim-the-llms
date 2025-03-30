// Assets UI Management
import { hidePlotInfoPanel } from './plotHoverInfo.js';
import { playTrack } from './musicPlayer.js';
import { showConfirmationModal } from './confirmationModal.js';
import { deactivateDroneTransport } from './llmDroneTransport.js';
import * as THREE from 'three'; // Add import for THREE.js

// Sample asset categories and data
const assetCategories = [
    { id: 'all', name: 'All Assets' },
    { id: 'buildings', name: 'Buildings' },
    { id: 'characters', name: 'Characters' },
    { id: 'vehicles', name: 'Vehicles' },
    { id: 'furniture', name: 'Furniture' },
    { id: 'decorations', name: 'Decorations' },
    { id: 'nature', name: 'Nature' }
];

// Sample assets with mock data
const sampleAssets = [
    { id: 1, name: 'Modern House', category: 'buildings', image: '' },
    { id: 2, name: 'Office Building', category: 'buildings', image: '' },
    { id: 3, name: 'Robot Character', category: 'characters', image: '', isDefaultRobot: true },
    { id: 4, name: 'Drone', category: 'vehicles', image: '' },
    { id: 5, name: 'Car', category: 'vehicles', image: '' },
    { id: 6, name: 'Office Chair', category: 'furniture', image: '' },
    { id: 7, name: 'Desk', category: 'furniture', image: '' },
    { id: 8, name: 'Lamp', category: 'furniture', image: '' },
    { id: 9, name: 'Painting', category: 'decorations', image: '' },
    { id: 10, name: 'Plant', category: 'nature', image: '' },
    { id: 11, name: 'Tree', category: 'nature', image: '' }
];

// Setup the Assets UI
export function setupAssetsUI() {
    console.log('Setting up Assets UI');
    hidePlotInfoPanel();
    
    const assetsPanel = document.getElementById('assets-ui-panel');
    if (!assetsPanel) {
        createAssetsUIElements();
        return;
    }
    
    // Show the panel
    assetsPanel.classList.add('active');
    
    // Populate the UI
    populateCategorySidebar();
    populateAssetGrid('all');
    
    // Set up event listeners
    setupAssetsEventListeners();
}

// Create the UI elements for the Assets panel
function createAssetsUIElements() {
    const assetsPanel = document.createElement('div');
    assetsPanel.id = 'assets-ui-panel';
    assetsPanel.className = 'assets-ui-panel';
    
    assetsPanel.innerHTML = `
        <div class="assets-header">
            <div class="assets-title">Asset Library</div>
            <button class="assets-close">&times;</button>
        </div>
        
        <div class="assets-container">
            <div class="assets-sidebar">
                <div class="asset-category">
                    <div class="category-title">Categories</div>
                    <div class="category-items" id="category-list">
                        <!-- Categories will be added here -->
                    </div>
                </div>
            </div>
            
            <div class="assets-main">
                <div class="assets-filter">
                    <div class="search-container">
                        <div class="search-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                            </svg>
                        </div>
                        <input type="text" class="search-input" placeholder="Search assets...">
                    </div>
                    
                    <select class="sort-select">
                        <option value="name-asc">Name (A-Z)</option>
                        <option value="name-desc">Name (Z-A)</option>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
                
                <div class="assets-grid" id="assets-grid">
                    <!-- Assets will be added here -->
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(assetsPanel);
    
    // Now the panel exists, set it up
    setupAssetsUI();
}

// Populate the category sidebar
function populateCategorySidebar() {
    const categoryList = document.getElementById('category-list');
    if (!categoryList) return;
    
    categoryList.innerHTML = '';
    
    assetCategories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.dataset.id = category.id;
        categoryItem.textContent = category.name;
        
        if (category.id === 'all') {
            categoryItem.classList.add('active');
        }
        
        categoryItem.addEventListener('click', () => {
            // Remove active class from all categories
            document.querySelectorAll('.category-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked category
            categoryItem.classList.add('active');
            
            // Filter assets by category
            populateAssetGrid(category.id);
        });
        
        categoryList.appendChild(categoryItem);
    });
}

// Update the function to render a single asset item for the asset grid
function createAssetItemElement(asset) {
    const assetItem = document.createElement('div');
    assetItem.className = 'asset-item';
    assetItem.dataset.id = asset.id;
    
    // For default robot character, render a snapshot
    let imageContent = '';
    if (asset.isDefaultRobot) {
        // Add a canvas for rendering the default robot
        imageContent = `<canvas class="robot-preview-canvas" width="180" height="180"></canvas>`;
        // Schedule rendering after the element is added to DOM
        setTimeout(() => renderDefaultRobotPreview(assetItem.querySelector('.robot-preview-canvas')), 50);
    } else {
        // Use icon for other assets
        imageContent = `<div style="background-color: #444; display: flex; justify-content: center; align-items: center;">
            ${getIconForCategory(asset.category)}
        </div>`;
    }
    
    assetItem.innerHTML = `
        <div class="asset-image-container">
            <div class="asset-image">
                ${imageContent}
            </div>
        </div>
        <div class="asset-info">
            <h3 class="asset-name">${asset.name}</h3>
        </div>
        <div class="asset-actions">
            <button class="asset-action-btn" title="Place in world">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
            </button>
        </div>
    `;
    
    // Add click event
    assetItem.addEventListener('click', () => {
        // Select the asset
        document.querySelectorAll('.asset-item').forEach(item => {
            item.classList.remove('selected');
        });
        assetItem.classList.add('selected');
    });
    
    return assetItem;
}

// Function to render a default robot preview
function renderDefaultRobotPreview(canvas) {
    if (!canvas) return;
    
    // Create a temporary scene, camera, and renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 1.5, 3.5);
    camera.lookAt(0, 1, 0);
    
    const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true 
    });
    renderer.setSize(canvas.width, canvas.height);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 2);
    scene.add(directionalLight);
    
    // Import and create the default robot model
    import('./llmModelCreationRenderer.js').then(module => {
        const robotModel = module.createRobotModel(scene, '#3cb371', 'modern').model;
        
        // Position the robot
        robotModel.position.y = 0;
        
        // Render the scene
        renderer.render(scene, camera);
        
        // Cleanup
        setTimeout(() => {
            scene.remove(robotModel);
            renderer.dispose();
        }, 200);
    });
}

// Populate the asset grid based on selected category
function populateAssetGrid(categoryId) {
    const assetsGrid = document.getElementById('assets-grid');
    if (!assetsGrid) return;
    
    assetsGrid.innerHTML = '';
    
    // Filter assets by category
    const filteredAssets = categoryId === 'all' 
        ? sampleAssets 
        : sampleAssets.filter(asset => asset.category === categoryId);
    
    if (filteredAssets.length === 0) {
        assetsGrid.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No assets found in this category</div>';
        return;
    }
    
    filteredAssets.forEach(asset => {
        const assetItem = createAssetItemElement(asset);
        assetsGrid.appendChild(assetItem);
    });
}

// Get a placeholder image URL based on category
function getPlaceholderImageForCategory(category) {
    return '';
}

// Get a placeholder icon based on asset category
function getIconForCategory(category) {
    switch(category) {
        case 'buildings':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="#888">
                <path d="M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm0-4H5V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
            </svg>`;
        case 'characters':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="#888">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>`;
        case 'vehicles':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="#888">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>`;
        case 'furniture':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="#888">
                <path d="M20 8V6c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v2c-1.1 0-2 .9-2 2v10h20V10c0-1.1-.9-2-2-2zM6 6h12v2H6V6zm14 12H4v-3h2v1h12v-1h2v3z"/>
            </svg>`;
        case 'decorations':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="#888">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z"/>
                <path d="M12 17l5-5h-3V8h-4v4H7z"/>
            </svg>`;
        case 'nature':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="#888">
                <path d="M17 12h2L12 3 5 12h2v4H4v2h16v-2h-3v-4z"/>
            </svg>`;
        default:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="#888">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                <path d="M18 9l-1.4-1.4-5.6 5.6-2.6-2.6L7 12l4 4z"/>
            </svg>`;
    }
}

// Set up event listeners for the Assets UI
function setupAssetsEventListeners() {
    // Close button
    const closeButton = document.querySelector('.assets-close');
    if (closeButton) {
        closeButton.addEventListener('click', closeAssetsUI);
    }
    
    // Search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterAssetsBySearch(searchTerm);
        });
    }
    
    // Sort select
    const sortSelect = document.querySelector('.sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortAssets(e.target.value);
        });
    }
}

// Filter assets by search term
function filterAssetsBySearch(searchTerm) {
    // Get current active category
    const activeCategory = document.querySelector('.category-item.active');
    const categoryId = activeCategory ? activeCategory.dataset.id : 'all';
    
    // Filter assets by category and search term
    let filteredAssets = categoryId === 'all' 
        ? sampleAssets 
        : sampleAssets.filter(asset => asset.category === categoryId);
    
    // Further filter by search term
    if (searchTerm) {
        filteredAssets = filteredAssets.filter(asset => 
            asset.name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Update the grid
    const assetsGrid = document.getElementById('assets-grid');
    if (!assetsGrid) return;
    
    assetsGrid.innerHTML = '';
    
    if (filteredAssets.length === 0) {
        assetsGrid.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No assets match your search</div>';
        return;
    }
    
    // Repopulate with filtered assets
    filteredAssets.forEach(asset => {
        const assetItem = createAssetItemElement(asset);
        assetsGrid.appendChild(assetItem);
    });
}

// Sort assets by the selected option
function sortAssets(sortOption) {
    // Get current displayed assets
    const assetItems = Array.from(document.querySelectorAll('.asset-item'));
    const assetsGrid = document.getElementById('assets-grid');
    if (!assetsGrid || assetItems.length === 0) return;
    
    // Sort assets based on option
    assetItems.sort((a, b) => {
        const nameA = a.querySelector('.asset-name').textContent;
        const nameB = b.querySelector('.asset-name').textContent;
        
        switch(sortOption) {
            case 'name-asc':
                return nameA.localeCompare(nameB);
            case 'name-desc':
                return nameB.localeCompare(nameA);
            case 'newest':
                return parseInt(b.dataset.id) - parseInt(a.dataset.id);
            case 'oldest':
                return parseInt(a.dataset.id) - parseInt(b.dataset.id);
            default:
                return 0;
        }
    });
    
    // Clear and re-add sorted items
    assetsGrid.innerHTML = '';
    assetItems.forEach(item => {
        assetsGrid.appendChild(item);
    });
}

// Close the Assets UI
function closeAssetsUI() {
    const assetsPanel = document.getElementById('assets-ui-panel');
    if (assetsPanel) {
        assetsPanel.classList.remove('active');
    }
    
    // Play city music when returning to city view
    playTrack('city');
}

// Export the openAssetsUI function for use in citySceneUI.js
export function openAssetsUI() {
    console.log('Opening Assets UI');
    hidePlotInfoPanel();
    
    // Check if a drone transport is active
    if (window.droneActive) {
        showConfirmationModal(
            "Cancel drone transport to open the Assets UI?",
            () => {
                deactivateDroneTransport(true);
                setupAssetsUI();
            },
            () => {
                console.log("Assets UI action cancelled due to active drone transport.");
            }
        );
    } else {
        setupAssetsUI();
    }
}