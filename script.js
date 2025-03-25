import { config } from './config.js';
import { cityData } from './cityData.js';
import * as THREE from 'three';
import { setupLLMCreationInterface } from './llmCreationInterface.js';
import { attributeSystem } from './attributeSystem.js';
import { llmDataManager } from './llmDataManager.js';
import { setupLLMCollectionView } from './llmCollectionView.js';
import { setupMusicPlayer } from './musicPlayer.js';

let bgAudio;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize LLM data manager
    if (typeof llmDataManager !== 'undefined') {
        llmDataManager.init();
    }
    
    // Setup music player UI
    setupMusicPlayer();

    const startOverlay = document.getElementById('start-overlay');
});