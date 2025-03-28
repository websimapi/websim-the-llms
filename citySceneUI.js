// New file for city scene UI interactions
import { toggleConsolePanel } from './cityScene.js';
import { hidePlotInfoPanel } from './plotHoverInfo.js'; // Import the hide function
import { showConfirmationModal } from './confirmationModal.js';
import { deactivateDroneTransport } from './llmDroneTransport.js'; // Import drone deactivation

// Setup UI interactions for the city scene
export function setupUIInteractions() {
    setupMenuButtons();
    setupConsoleToggle();
    setupCameraControls();
}

function setupMenuButtons() {
    const createLLMButton = document.querySelector('.create-llm-btn');
    const moveLLMButton = document.querySelector('.move-llm-btn');

    if (createLLMButton) {
        createLLMButton.addEventListener('click', () => {
            if (window.droneActive) {
                showConfirmationModal(
                    "Cancel drone transport to create a new LLM?",
                    () => { // onConfirm
                        deactivateDroneTransport(true);
                        openCreateLLMUI();
                    },
                    () => { // onCancel
                        console.log("Create LLM action cancelled due to active drone transport.");
                    }
                );
            } else {
                openCreateLLMUI();
            }
        });
    }

    if (moveLLMButton) {
        moveLLMButton.addEventListener('click', () => {
             if (window.droneActive) {
                showConfirmationModal(
                    "Cancel drone transport to manage LLMs?",
                    () => { // onConfirm
                        deactivateDroneTransport(true);
                        openCollectionViewUI();
                    },
                    () => { // onCancel
                        console.log("Manage LLMs action cancelled due to active drone transport.");
                    }
                );
            } else {
                openCollectionViewUI();
            }
        });
    }
}

// Helper function to open Create LLM UI
function openCreateLLMUI() {
    console.log('Opening Create LLM UI');
    hidePlotInfoPanel(); // Hide plot info when opening menu
    document.getElementById('create-llm-ui').classList.add('active');
    // Set global variable to track that create LLM was opened from plot view
    window.createLLMOpenedFrom = 'plot';

    // Import and setup LLM creation interface
    import('./llmCreationInterface.js').then(module => {
        module.setupLLMCreationInterface();
    }).catch(err => console.error("Error loading create LLM interface:", err));
}

// Helper function to open Collection View UI
function openCollectionViewUI() {
    console.log('Opening Collection View UI');
    hidePlotInfoPanel(); // Hide plot info when opening menu

    // Import and setup LLM collection view
    import('./llmCollectionView.js').then(module => {
        module.setupLLMCollectionView();
        document.getElementById('llm-collection-ui').classList.add('active');
    }).catch(err => console.error("Error loading collection view:", err));
}

// Setup console toggle key listener
export function setupConsoleToggle() {
    document.addEventListener('keydown', (event) => {
        if (event.key === '`' || event.key === '~') {
            toggleConsolePanel();
        }
    });
}

// Setup additional camera controls
function setupCameraControls() {
    // Add keyboard controls for camera
    document.addEventListener('keydown', (event) => {
        // You can add keyboard shortcuts for camera movement here
        // For example: WASD keys for panning
    });
}

// Setup console panel functionality
export function setupConsolePanel() {
    const consolePanel = document.getElementById('console-panel');
    const closeButton = document.querySelector('.console-close');
    const exportButton = document.getElementById('export-data');
    const importButton = document.getElementById('import-data');
    const gridToggleButton = document.getElementById('toggle-grid');

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            consolePanel.classList.add('hidden');
        });
    }

    if (gridToggleButton) {
        gridToggleButton.addEventListener('click', () => {
            if (window.cityGrid) {
                window.cityGrid.visible = !window.cityGrid.visible;
                const consoleContent = document.querySelector('#console-panel .console-content'); // Corrected selector
                if (consoleContent) { // Add null check
                    consoleContent.innerHTML += `<p>Grid ${window.cityGrid.visible ? 'shown' : 'hidden'}</p>`;
                }
            }
        });
    }

    // Setup data export/import functionality
    setupDataExportImport(exportButton, importButton);
}

function setupDataExportImport(exportButton, importButton) {
    // Implementation of export/import functionality
    // This can be expanded as needed
     if (exportButton) {
        exportButton.addEventListener('click', () => {
             // Add export logic here - potentially using cityData.saveGame()
             console.log("Export button clicked - Implement export logic.");
             const consoleContent = document.querySelector('#console-panel .console-content');
             if(consoleContent) consoleContent.innerHTML += `<p>Export requested...</p>`;
        });
     }
     if (importButton) {
         importButton.addEventListener('click', () => {
             // Add import logic here - potentially using cityData.loadGame()
             console.log("Import button clicked - Implement import logic.");
             const consoleContent = document.querySelector('#console-panel .console-content');
             if(consoleContent) consoleContent.innerHTML += `<p>Import requested...</p>`;
         });
     }
}