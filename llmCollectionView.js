import { llmDataManager } from './llmDataManager.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCustomCharacter } from './characterGenerator.js';
import { setupLLMViewInterface } from './llmViewInterface.js';
import { setupLLMCreationInterface } from './llmCreationInterface.js';
import { setupLLMCarousel, cleanupCarousel, selectModel as carouselSelectModel, getSelectedModelId } from './llmCollectionCarousel.js';

let collectionAnimationId;

export function setupLLMCollectionView(selectLLMId = null) {
    llmDataManager.init();

    const collectionUI = document.getElementById('llm-collection-ui');
    collectionUI.classList.add('active');

    setTimeout(() => {
        const collectionViewport = document.querySelector('.collection-viewport');
        const llmList = document.getElementById('llm-list');
        let editSelectedBtn = document.getElementById('edit-selected-llm-btn');

        llmList.innerHTML = '';
        collectionViewport.innerHTML = '';

        if (collectionAnimationId) {
            cancelAnimationFrame(collectionAnimationId);
        }

        cleanupCarousel();

        const llms = llmDataManager.getAllLLMs();

        if (llms.length === 0) {
            llmList.innerHTML = `
                <div class="empty-collection">
                    <h3>No LLMs Created Yet</h3>
                    <p>Create your first LLM by clicking the "Create New LLM" button below.</p>
                </div>
            `;
            if (editSelectedBtn) editSelectedBtn.disabled = true;
        } else {
            llms.forEach((llm, index) => {
                const llmItem = document.createElement('div');
                llmItem.className = 'llm-list-item';
                llmItem.setAttribute('data-id', llm.id);
                llmItem.innerHTML = `
                    <div class="llm-info">
                        <h3>${llm.name}</h3>
                        <p class="llm-type">${llm.model}</p>
                        <p class="llm-created">Created: ${new Date(llm.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="llm-actions">
                        <button class="llm-delete-btn" data-id="${llm.id}">Delete</button>
                    </div>
                `;
                llmList.appendChild(llmItem);

                llmItem.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'BUTTON') {
                        const id = llmItem.getAttribute('data-id');
                        carouselSelectModel(id);
                    }
                });
            });

            setupLLMCarousel(collectionViewport, llms);

            import('./llmProfileImageDisplay.js').then(module => {
                if (typeof module.addProfileImagesToLLMList === 'function') {
                    module.addProfileImagesToLLMList();
                } else {
                    console.error('addProfileImagesToLLMList function not found in module');
                }
            }).catch(error => {
                console.error('Error importing llmProfileImageDisplay module:', error);
            });

            collectionViewport.addEventListener('click', handleViewportClick);

            document.querySelectorAll('.llm-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const confirmed = confirm('Are you sure you want to delete this LLM?');
                    if (confirmed) {
                        deleteLLM(id);
                    }
                });
            });

            if (editSelectedBtn) {
                const newEditSelectedBtn = editSelectedBtn.cloneNode(true);
                editSelectedBtn.parentNode.replaceChild(newEditSelectedBtn, editSelectedBtn);
                editSelectedBtn = newEditSelectedBtn;

                editSelectedBtn.addEventListener('click', () => {
                    const selectedId = getSelectedModelId();
                    console.log("Edit button clicked, selected ID:", selectedId);
                    if (selectedId) {
                        handleEditLLM(selectedId);
                    } else {
                        console.log("No model selected to edit.");
                    }
                });
                editSelectedBtn.disabled = !getSelectedModelId();
            }

            if (selectLLMId) {
                carouselSelectModel(selectLLMId);
            } else if (llms.length > 0) {
                carouselSelectModel(llms[0].id);
            }
            if (editSelectedBtn) editSelectedBtn.disabled = !getSelectedModelId();
        }
    }, 100);

    const closeBtn = document.querySelector('.collection-close');
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', () => {
            collectionUI.classList.remove('active');
            cleanupCarousel();
        });
    }

    const createNewBtn = document.getElementById('create-new-llm-btn');
    if (createNewBtn) {
        const newCreateNewBtn = createNewBtn.cloneNode(true);
        createNewBtn.parentNode.replaceChild(newCreateNewBtn, createNewBtn);
        newCreateNewBtn.addEventListener('click', () => {
            collectionUI.classList.remove('active');
            document.getElementById('create-llm-ui').classList.add('active');
            setupLLMCreationInterface();
            cleanupCarousel();
        });
    }
}

function handleEditLLM(id) {
    const llm = llmDataManager.getLLMById(id);
    if (!llm) {
        console.error("Cannot edit LLM, ID not found:", id);
        return;
    }

    console.log("Editing LLM:", llm.name, `(ID: ${id})`);

    document.getElementById('llm-collection-ui').classList.remove('active');

    const createUI = document.getElementById('create-llm-ui');
    createUI.classList.add('active');
    createUI.setAttribute('data-edit-mode', 'true');
    createUI.setAttribute('data-edit-id', id);

    setupLLMCreationInterface(llm);

    if (collectionAnimationId) {
        cancelAnimationFrame(collectionAnimationId);
        collectionAnimationId = null;
    }
    cleanupCarousel();
}

function handleViewportClick(event) {
    const renderer = document.querySelector('.collection-viewport canvas');
    if (!renderer || !window.carouselCamera || !window.carouselScene) return;

    const rect = renderer.getBoundingClientRect();
    const mouse = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    };

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, window.carouselCamera);

    const intersects = raycaster.intersectObjects(window.carouselScene.children, true);

    if (intersects.length > 0) {
        let model = intersects[0].object;

        while (model && (!model.userData || !model.userData.id)) {
            model = model.parent;

            if (!model) break;
        }

        if (model && model.userData && model.userData.id) {
            carouselSelectModel(model.userData.id);
        }
    }
}

function deleteLLM(id) {
    if (llmDataManager.deleteLLM(id)) {
        const currentSelectedId = getSelectedModelId();
        setupLLMCollectionView(currentSelectedId === id ? null : currentSelectedId);
    }
}