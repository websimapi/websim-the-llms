// Assets UI Management
import { hidePlotInfoPanel } from './plotHoverInfo.js';
import { playTrack } from './musicPlayer.js'; 
import { showConfirmationModal } from './confirmationModal.js';
import { deactivateDroneTransport } from './llmDroneTransport.js';
import * as THREE from 'three'; 

const CUSTOM_ASSETS_STORAGE_KEY = 'customAssets';

// Sample asset categories and data
const assetCategories = [
    { id: 'all', name: 'All Assets' },
    { id: 'buildings', name: 'Buildings' },
    { id: 'characters', name: 'Characters' },
    { id: 'vehicles', name: 'Vehicles' },
    { id: 'furniture', name: 'Furniture' },
    { id: 'decorations', name: 'Decorations' },
    { id: 'nature', name: 'Nature' },
    { id: 'textures', name: 'Textures' },
    { id: 'custom', name: 'My Assets' } 
];

// Sample assets with mock data (representing default/built-in assets)
const defaultAssets = [
    { id: 'd1', name: 'Modern House', category: 'buildings', image: '', isCustom: false },
    { id: 'd2', name: 'Office Building', category: 'buildings', image: '', isCustom: false },
    { id: 'd3', name: 'Robot Character', category: 'characters', image: '', isDefaultRobot: true, isCustom: false },
    { id: 'd4', name: 'Transport Drone', category: 'vehicles', image: '', isDrone: true, isCustom: false },
    { id: 'd5', name: 'Car', category: 'vehicles', image: '', isCustom: false },
    { id: 'd6', name: 'Office Chair', category: 'furniture', image: '', isCustom: false },
    { id: 'd7', name: 'Desk', category: 'furniture', image: '', isCustom: false },
    { id: 'd8', name: 'Lamp', category: 'furniture', image: '', isCustom: false },
    { id: 'd9', name: 'Painting', category: 'decorations', image: '', isCustom: false },
    { id: 'd10', name: 'Plant', category: 'nature', image: '', isCustom: false },
    { id: 'd11', name: 'Tree', category: 'nature', image: '', isCustom: false },
    { id: 'd12', name: 'Brick Wall', category: 'textures', image: '', isCustom: false },
    { id: 'd13', name: 'Wood Floor', category: 'textures', image: '', isCustom: false },
    { id: 'd14', name: 'Metal Panel', category: 'textures', image: '', isCustom: false },
    { id: 'd15', name: 'Fabric Pattern', category: 'textures', image: '', isCustom: false }
];

let currentAssets = []; // Combined default and custom assets

// --- Custom Asset Management ---

function loadCustomAssets() {
    const storedAssets = localStorage.getItem(CUSTOM_ASSETS_STORAGE_KEY);
    return storedAssets ? JSON.parse(storedAssets) : [];
}

function saveCustomAssetsToStorage(assets) {
    localStorage.setItem(CUSTOM_ASSETS_STORAGE_KEY, JSON.stringify(assets));
}

function addCustomAsset(assetData) {
    const customAssets = loadCustomAssets();
    // Add a unique ID and mark as custom
    assetData.id = `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    assetData.isCustom = true;
    assetData.createdAt = new Date().toISOString();
    customAssets.push(assetData);
    saveCustomAssetsToStorage(customAssets);
}

function deleteCustomAsset(assetId) {
    let customAssets = loadCustomAssets();
    customAssets = customAssets.filter(asset => asset.id !== assetId);
    saveCustomAssetsToStorage(customAssets);
    // Refresh the grid after deletion
    const activeCategory = document.querySelector('.category-item.active');
    const categoryId = activeCategory ? activeCategory.dataset.id : 'all';
    populateAssetGrid(categoryId);
}

// --- End Custom Asset Management ---

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
    // Load and merge assets before populating grid
    const customAssets = loadCustomAssets();
    currentAssets = [...defaultAssets, ...customAssets];
    populateAssetGrid('all'); // Show all initially

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
                    <!-- Create New Button -->
                    <button class="create-new-asset-btn">Create New</button>
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

                <!-- Create New Asset Form (Initially Hidden) -->
                <div id="create-asset-form">
                    <div class="create-asset-title">Create New Asset</div>
                    <div class="create-asset-form-group">
                        <label for="asset-name-input" class="create-asset-label">Asset Name:</label>
                        <input type="text" id="asset-name-input" class="create-asset-input" placeholder="Enter asset name...">
                    </div>
                    <div class="create-asset-form-group">
                        <label for="asset-file-input" class="create-asset-label">Upload File:</label>
                        <label for="asset-file-input" class="create-asset-file-label">Click or drag file here</label>
                        <input type="file" id="asset-file-input" class="create-asset-file-input">
                        <div class="file-name-display">No file selected</div>
                    </div>
                     <div class="create-asset-form-group">
                        <label for="asset-category-select" class="create-asset-label">Category:</label>
                        <select id="asset-category-select" class="create-asset-select">
                            <!-- Options populated dynamically, excluding 'all' and 'custom' -->
                        </select>
                    </div>
                    <div class="upload-progress">Uploading...</div>
                    <div class="create-asset-actions">
                         <button class="create-asset-cancel-btn">Cancel</button>
                         <button class="create-asset-save-btn">Save Asset</button>
                    </div>
                </div>

                <div class="assets-grid" id="assets-grid">
                    <!-- Assets will be added here -->
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(assetsPanel);

    // Populate category dropdown in the form
    populateCreateFormCategories();

    // Now the panel exists, set it up
    setupAssetsUI();
}

// Populate category dropdown in create form
function populateCreateFormCategories() {
    const selectElement = document.getElementById('asset-category-select');
    if (!selectElement) return;
    selectElement.innerHTML = ''; // Clear existing
    assetCategories.forEach(category => {
        // Exclude 'all' and 'custom' from being assignable categories initially
        if (category.id !== 'all' && category.id !== 'custom') {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            selectElement.appendChild(option);
        }
    });
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
        categoryItem.innerHTML = `
            <div class="asset-category-icon">
                ${getIconForCategory(category.id)}
            </div>
            ${category.name}
        `;

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
    assetItem.dataset.name = asset.name; // For sorting
    assetItem.dataset.createdAt = asset.createdAt || '0'; // For sorting

    // Determine content based on asset type
    let imageContent = '';
    let previewFunction = null;

    if (asset.isDefaultRobot) {
        imageContent = `<canvas class="robot-preview-canvas" width="180" height="180"></canvas>`;
        previewFunction = () => renderDefaultRobotPreview(assetItem.querySelector('.robot-preview-canvas'));
    } else if (asset.isDrone) {
        imageContent = `<canvas class="drone-preview-canvas" width="180" height="180"></canvas>`;
        previewFunction = () => renderDronePreview(assetItem.querySelector('.drone-preview-canvas'));
    } else if (asset.isCustom && asset.url && asset.fileType?.startsWith('image/')) {
        imageContent = `<img src="${asset.url}" alt="${asset.name}" class="asset-image-preview">`;
    } else if (asset.category === 'textures' || (asset.isCustom && asset.category === 'textures')) {
        if (asset.url && asset.fileType?.startsWith('image/')) {
            imageContent = `<img src="${asset.url}" alt="${asset.name}" class="asset-image-preview" style="object-fit: cover;">`;
        } else {
            imageContent = `<div style="background-color: #555; display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; font-size: 0.8em; color: #ccc;">
                Texture
            </div>`;
        }
    } else { // Default/other custom assets
        imageContent = `<div style="background-color: #444; display: flex; justify-content: center; align-items: center; width: 100%; height: 100%;">
            ${getIconForCategory(asset.category)}
        </div>`;
    }

    // Action buttons (Delete for custom, Place for others - Place functionality TBD)
    let actionsHTML = '';
    if (asset.isCustom) {
        actionsHTML = `
            <button class="asset-action-btn delete" title="Delete Asset">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        `;
    } else {
        actionsHTML = `
            <button class="asset-action-btn" title="Place in world (Not Implemented)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
            </button>
        `;
    }

    assetItem.innerHTML = `
        <div class="asset-image-container">
            <div class="asset-header">
                <div class="asset-category-icon">${getIconForCategory(asset.category)}</div>
            </div>
            <div class="asset-image">
                ${imageContent}
            </div>
        </div>
        <div class="asset-info">
            <h3 class="asset-name">${asset.name}</h3>
        </div>
        <div class="asset-actions">
           ${actionsHTML}
        </div>
    `;

    // Add event listeners
    assetItem.addEventListener('click', (e) => {
        // Don't select if clicking delete button
        if (e.target.closest('.asset-action-btn.delete')) return;

        // Select the asset
        document.querySelectorAll('.asset-item').forEach(item => {
            item.classList.remove('selected');
        });
        assetItem.classList.add('selected');
        // TODO: Add logic for what happens when an asset is selected (e.g., enable placement)
    });

    // Add delete listener for custom assets
    if (asset.isCustom) {
        const deleteButton = assetItem.querySelector('.asset-action-btn.delete');
        if (deleteButton) {
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent asset selection
                showConfirmationModal(
                    `Are you sure you want to delete the asset "${asset.name}"? This cannot be undone.`,
                    () => deleteCustomAsset(asset.id), // onConfirm
                    () => console.log('Asset deletion cancelled.') // onCancel
                );
            });
        }
    }

    // Schedule 3D preview rendering if needed
    if (previewFunction) {
        setTimeout(previewFunction, 50);
    }

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
        robotModel.position.y = -0.8; // Adjust Y position for preview

        // Render the scene
        renderer.render(scene, camera);

        // Cleanup
        setTimeout(() => {
            // Properly dispose of geometry and materials
            robotModel.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            scene.remove(robotModel);
            renderer.dispose();
        }, 200);
    });
}

// New function to create just the drone model for preview
function createDronePreviewModel(THREE) {
    const droneModel = new THREE.Group();
    droneModel.name = "DronePreviewModel";

    const DRONE_BASE_COLOR = 0xffffff;
    const DRONE_ACCENT_COLOR = 0xcccccc;
    const DRONE_DARK_ACCENT_COLOR = 0x888888;

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: DRONE_BASE_COLOR, metalness: 0.6, roughness: 0.4 });
    const armMaterial = new THREE.MeshStandardMaterial({ color: DRONE_ACCENT_COLOR, metalness: 0.5, roughness: 0.5 });
    const propellerHubMaterial = new THREE.MeshStandardMaterial({ color: DRONE_DARK_ACCENT_COLOR, metalness: 0.8, roughness: 0.2 });
    const propellerBladeMaterial = new THREE.MeshStandardMaterial({ color: DRONE_ACCENT_COLOR, metalness: 0.4, roughness: 0.6, side: THREE.DoubleSide });

    const centralBodyRadius = 0.3;
    const centralBodyHeight = 0.2;
    const centralBody = new THREE.Mesh(
        new THREE.CylinderGeometry(centralBodyRadius * 0.8, centralBodyRadius, centralBodyHeight, 12),
        bodyMaterial
    );
    droneModel.add(centralBody);

    const propDistance = 1.0;
    const armWidth = 0.08;
    const armHeight = 0.08;
    const armLength = propDistance;
    const angleRad = Math.PI / 4;

    const propellerPositions = [
        { x: propDistance * Math.sin(angleRad), z: -propDistance * Math.cos(angleRad) },
        { x: -propDistance * Math.sin(angleRad), z: -propDistance * Math.cos(angleRad) },
        { x: -propDistance * Math.sin(angleRad), z: propDistance * Math.cos(angleRad) },
        { x: propDistance * Math.sin(angleRad), z: propDistance * Math.cos(angleRad) }
    ];

    propellerPositions.forEach((propPos) => {
        const armRotationY = Math.atan2(propPos.x, propPos.z);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(armWidth, armHeight, armLength), armMaterial);
        arm.position.set(propPos.x / 2, 0, propPos.z / 2);
        arm.rotation.y = armRotationY;
        droneModel.add(arm);

        const propeller = createPreviewPropeller(THREE, propellerHubMaterial, propellerBladeMaterial);
        propeller.position.set(propPos.x, armHeight / 2 + 0.05, propPos.z);
        droneModel.add(propeller);
    });

    return droneModel;
}

// Helper to create propeller for preview drone
function createPreviewPropeller(THREE, hubMaterial, bladeMaterial) {
    const propellerGroup = new THREE.Group();
    propellerGroup.name = "Propeller";

    const hubRadius = 0.1;
    const hubHeight = 0.08;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(hubRadius, hubRadius, hubHeight, 8), hubMaterial);
    propellerGroup.add(hub);

    const blades = new THREE.Group();
    blades.name = "Blades";
    propellerGroup.add(blades);

    const bladeLength = 0.6;
    const bladeWidth = 0.1;
    const bladeThickness = 0.01;
    const bladeGeometry = new THREE.BoxGeometry(bladeLength, bladeThickness, bladeWidth);

    const blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blades.add(blade1);
    const blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade2.rotation.y = Math.PI / 2;
    blades.add(blade2);

    blades.position.y = hubHeight / 2 + bladeThickness / 2;

    return propellerGroup;
}

// New function to render the drone preview
function renderDronePreview(canvas) {
    if (!canvas) return;

    // Create a temporary scene, camera, and renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 1.5, 4.5); // Slightly different angle/distance for drone
    camera.lookAt(0, 0.2, 0); // Look slightly lower

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setSize(canvas.width, canvas.height);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(2, 3, 3);
    scene.add(directionalLight);

    // Create the drone model
    const droneModel = createDronePreviewModel(THREE);

    // Position the drone slightly higher
    droneModel.position.y = 0.3;
    droneModel.rotation.y = -Math.PI / 6; // Slight rotation for better view

    scene.add(droneModel);

    // Render the scene
    renderer.render(scene, camera);

    // Cleanup
    setTimeout(() => {
        // Properly dispose of geometry and materials
        droneModel.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        scene.remove(droneModel);
        renderer.dispose();
    }, 200);
}

// Populate the asset grid based on selected category
function populateAssetGrid(categoryId, searchTerm = '', sortOption = 'name-asc') {
    const assetsGrid = document.getElementById('assets-grid');
    if (!assetsGrid) return;

    assetsGrid.innerHTML = '';

    // Merge default and custom assets
    const customAssets = loadCustomAssets();
    currentAssets = [...defaultAssets, ...customAssets];

    // Filter by category
    let filteredAssets = [];
    if (categoryId === 'all') {
        filteredAssets = currentAssets;
    } else if (categoryId === 'custom') {
        filteredAssets = currentAssets.filter(asset => asset.isCustom);
    } else {
        // Show only default assets for default categories
        filteredAssets = currentAssets.filter(asset => asset.category === categoryId && !asset.isCustom);
    }

    // Filter by search term
    if (searchTerm) {
        filteredAssets = filteredAssets.filter(asset =>
            asset.name.toLowerCase().includes(searchTerm)
        );
    }

    // Sort the filtered assets
    filteredAssets = sortAssetList(filteredAssets, sortOption);

    // Display assets or empty message
    if (filteredAssets.length === 0) {
        assetsGrid.innerHTML = `<div style="color: #888; text-align: center; padding: 20px;">No assets found</div>`;
        return;
    }

    filteredAssets.forEach(asset => {
        const assetItem = createAssetItemElement(asset);
        assetsGrid.appendChild(assetItem);
    });
}

// --- Get Icon --- (rest of the function remains the same)
function getIconForCategory(category) {
    switch(category) {
        case 'buildings':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm0-4H5V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
            </svg>`;
        case 'characters':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>`;
        case 'vehicles':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>`;
        case 'furniture':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 8V6c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v2c-1.1 0-2 .9-2 2v10h20V10c0-1.1-.9-2-2-2zM6 6h12v2H6V6zm14 12H4v-3h2v1h12v-1h2v3z"/>
            </svg>`;
        case 'decorations':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z"/>
                <path d="M12 17l5-5h-3V8h-4v4H7z"/>
            </svg>`;
        case 'nature':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 12h2L12 3 5 12h2v4H4v2h16v-2h-3v-4z"/>
            </svg>`;
        case 'textures':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 3H3v18h18V3zm-2 16H5V5h14v14zm-5-6h-2v2H7v-2h2v-2h2v-2h2v2h2v2h2v2h-2z" opacity=".3"/>
                <path d="M5 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5zm14 16H5V5h14v14z"/>
                <path d="M7 15h2v-2H7v2zm4 0h2v-2h-2v2zm4 0h2v-2h-2v2zm-4-4h2V9h-2v2z"/>
            </svg>`;
        case 'custom': // Icon for Custom Assets category
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
             </svg>`;
        default:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
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
        closeButton.removeEventListener('click', closeAssetsUI); // Prevent duplicates
        closeButton.addEventListener('click', closeAssetsUI);
    }

    // Create New button
    const createNewButton = document.querySelector('.create-new-asset-btn');
    if (createNewButton) {
        createNewButton.removeEventListener('click', toggleCreateAssetForm); // Prevent duplicates
        createNewButton.addEventListener('click', toggleCreateAssetForm);
    }

    // --- Form Listeners ---
    const form = document.getElementById('create-asset-form');
    if (!form) return;

    const fileInput = form.querySelector('#asset-file-input');
    const fileNameDisplay = form.querySelector('.file-name-display');
    const categorySelect = form.querySelector('#asset-category-select');
    const saveButton = form.querySelector('.create-asset-save-btn');
    const cancelButton = form.querySelector('.create-asset-cancel-btn');
    const uploadProgress = form.querySelector('.upload-progress');

    if (fileInput && fileNameDisplay && categorySelect) {
        fileInput.removeEventListener('change', handleFileUploadEvent); // Prevent duplicates
        fileInput.addEventListener('change', handleFileUploadEvent);
    }

    if (saveButton) {
        saveButton.removeEventListener('click', handleSaveCustomAsset); // Prevent duplicates
        saveButton.addEventListener('click', handleSaveCustomAsset);
    }

    if (cancelButton) {
        cancelButton.removeEventListener('click', toggleCreateAssetForm); // Prevent duplicates
        cancelButton.addEventListener('click', toggleCreateAssetForm);
    }

    // Search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.removeEventListener('input', handleSearchInput); // Prevent duplicates
        searchInput.addEventListener('input', handleSearchInput);
    }

    // Sort select
    const sortSelect = document.querySelector('.sort-select');
    if (sortSelect) {
        sortSelect.removeEventListener('change', handleSortChange); // Prevent duplicates
        sortSelect.addEventListener('change', handleSortChange);
    }
}

function handleSearchInput(e) {
    const searchTerm = e.target.value.toLowerCase();
    filterAssetsBySearch(searchTerm);
}

function handleSortChange(e) {
    sortAssets(e.target.value);
}

function handleFileUploadEvent(e) {
    const fileInput = e.target;
    const fileNameDisplay = document.querySelector('.file-name-display');
    const categorySelect = document.getElementById('asset-category-select');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileNameDisplay.textContent = file.name;
        // Suggest category based on file type
        const suggestedCategory = suggestCategory(file.type);
        if (suggestedCategory) {
            categorySelect.value = suggestedCategory;
        }
    } else {
        fileNameDisplay.textContent = 'No file selected';
    }
}

async function handleSaveCustomAsset() {
    const form = document.getElementById('create-asset-form');
    const nameInput = form.querySelector('#asset-name-input');
    const fileInput = form.querySelector('#asset-file-input');
    const categorySelect = form.querySelector('#asset-category-select');
    const saveButton = form.querySelector('.create-asset-save-btn');
    const cancelButton = form.querySelector('.create-asset-cancel-btn');
    const uploadProgress = form.querySelector('.upload-progress');

    const name = nameInput.value.trim();
    const file = fileInput.files[0];
    const category = categorySelect.value;

    if (!name) {
        alert('Please enter an asset name.');
        return;
    }
    if (!file) {
        alert('Please select a file to upload.');
        return;
    }
    if (!category) {
        alert('Please select a category.');
        return;
    }

    // Disable buttons and show progress
    saveButton.disabled = true;
    cancelButton.disabled = true;
    uploadProgress.style.display = 'block';
    uploadProgress.textContent = 'Uploading...';

    try {
        // Upload the file using websim.upload
        const uploadedUrl = await websim.upload(file);
        uploadProgress.textContent = 'Upload complete! Saving...';

        // Create asset data
        const newAsset = {
            name: name,
            category: category,
            url: uploadedUrl,
            fileType: file.type,
            isCustom: true // Explicitly mark as custom
        };

        // Add to localStorage
        addCustomAsset(newAsset);

        // Reset form and hide
        resetCreateAssetForm();
        form.classList.remove('active');

        // Refresh grid to show the new asset (go to 'custom' category)
        document.querySelectorAll('.category-item').forEach(item => item.classList.remove('active'));
        const customCategoryItem = document.querySelector('.category-item[data-id="custom"]');
        if (customCategoryItem) customCategoryItem.classList.add('active');
        populateAssetGrid('custom');


    } catch (error) {
        console.error('Error uploading or saving asset:', error);
        uploadProgress.textContent = `Error: ${error.message || 'Upload failed'}`;
        alert(`Error uploading asset: ${error.message}`);
    } finally {
        // Re-enable buttons
        saveButton.disabled = false;
        cancelButton.disabled = false;
        // Hide progress after a delay or keep showing error
        if (!uploadProgress.textContent.startsWith('Error')) {
             setTimeout(() => {
                uploadProgress.style.display = 'none';
             }, 2000);
        }
    }
}

// Toggle visibility of the create asset form
function toggleCreateAssetForm() {
    const form = document.getElementById('create-asset-form');
    if (!form) return;
    const isActive = form.classList.contains('active');
    if (isActive) {
        form.classList.remove('active');
        resetCreateAssetForm(); // Reset when hiding
    } else {
        form.classList.add('active');
    }
}

// Reset the create asset form fields
function resetCreateAssetForm() {
    const form = document.getElementById('create-asset-form');
    if (!form) return;
    form.querySelector('#asset-name-input').value = '';
    form.querySelector('#asset-file-input').value = ''; // Clear file selection
    form.querySelector('.file-name-display').textContent = 'No file selected';
    form.querySelector('#asset-category-select').selectedIndex = 0; // Reset category
    form.querySelector('.upload-progress').style.display = 'none';
    form.querySelector('.upload-progress').textContent = '';
}

// Suggest category based on file type
function suggestCategory(fileType) {
    if (!fileType) return null;
    if (fileType.startsWith('image/')) return 'textures';
    if (fileType.startsWith('model/')) return 'characters'; // Or 'buildings', 'vehicles' etc. - needs more info
    if (fileType.startsWith('audio/')) return null; // Not directly placeable assets yet
    // Add more suggestions based on common MIME types for 3D models, etc.
    return 'decorations'; // Default fallback
}

// Filter assets by search term (refactored)
function filterAssetsBySearch(searchTerm) {
    const activeCategory = document.querySelector('.category-item.active');
    const categoryId = activeCategory ? activeCategory.dataset.id : 'all';
    populateAssetGrid(categoryId, searchTerm); // Pass search term
}

// Sort assets by the selected option (refactored)
function sortAssets(sortOption) {
    const activeCategory = document.querySelector('.category-item.active');
    const categoryId = activeCategory ? activeCategory.dataset.id : 'all';
    const searchInput = document.querySelector('.search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    populateAssetGrid(categoryId, searchTerm, sortOption); // Pass sort option
}

// Helper function to sort an array of assets
function sortAssetList(assets, sortOption) {
    return assets.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();

        switch (sortOption) {
            case 'name-asc':
                return nameA.localeCompare(nameB);
            case 'name-desc':
                return nameB.localeCompare(nameA);
            case 'newest':
                // Handle potential missing dates, placing items without dates last
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1; // a comes after b
                if (!dateB) return -1; // a comes before b
                return dateB - dateA; // Newest first
            case 'oldest':
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateA - dateB; // Oldest first
            default:
                return 0;
        }
    });
}

// Close the Assets UI
function closeAssetsUI() {
    const assetsPanel = document.getElementById('assets-ui-panel');
    if (assetsPanel) {
        assetsPanel.classList.remove('active');
        toggleCreateAssetForm(); // Ensure form is hidden on close
    }

    playTrack('city');
}

// Export the openAssetsUI function for use in citySceneUI.js
export function openAssetsUI() {
    console.log('Opening Assets UI');
    hidePlotInfoPanel();

    if (window.droneActive) {
        showConfirmationModal(
            "Cancel drone transport to open the Assets UI?",
            () => {
                deactivateDroneTransport(true);
                playTrack('creation');
                setupAssetsUI();
            },
            () => {
                console.log("Assets UI action cancelled due to active drone transport.");
            }
        );
    } else {
        playTrack('creation');
        setupAssetsUI();
    }
}