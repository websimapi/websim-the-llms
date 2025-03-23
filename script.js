import { config } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const loadingBar = document.querySelector('.loading-bar');
    const loadingPercentage = document.querySelector('.loading-percentage');
    const tipText = document.querySelector('.tip-text');
    const llmToggle = document.getElementById('llmToggle');
    
    let usingLLM = false;
    let generatingTip = false;
    
    // Toggle LLM tips generation
    llmToggle.addEventListener('change', () => {
        usingLLM = llmToggle.checked;
        if (usingLLM) {
            generateLLMTip();
        } else {
            setRandomTip();
        }
    });
    
    // Randomly select a tip from config
    function setRandomTip() {
        const randomIndex = Math.floor(Math.random() * config.loadingTips.length);
        tipText.textContent = config.loadingTips[randomIndex];
    }
    
    // Generate a tip using LLM
    async function generateLLMTip() {
        if (!usingLLM || generatingTip) return;
        
        generatingTip = true;
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant providing short, amusing tips for a game called 'The LLMs' which is inspired by The Sims. Create a single tip about virtual life simulation, character management, or language model care. Keep it under 100 characters and make it sound like a loading screen tip from The Sims."
                    }
                ]
            });
            
            if (usingLLM) { // Double check we're still using LLM
                tipText.textContent = completion.content;
            }
        } catch (error) {
            console.error("Error generating LLM tip:", error);
            tipText.textContent = "Error generating tip. Please try again.";
        } finally {
            generatingTip = false;
        }
    }
    
    // Set initial random tip
    setRandomTip();
    
    // Change tip every 3 seconds
    setInterval(() => {
        if (usingLLM) {
            generateLLMTip();
        } else {
            setRandomTip();
        }
    }, 3000);
    
    // Simulate loading progress
    let progress = 0;
    const interval = 50; // Update every 50ms
    const increment = (interval / config.loadingTime) * 100;
    
    const loadingInterval = setInterval(() => {
        progress += increment;
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            // You could redirect to the main game here after a short delay
            setTimeout(() => {
                // Uncomment when you have a main game page
                // window.location.href = 'game.html';
                console.log('Loading complete! Ready to enter The LLMs world.');
            }, 1000);
        }
        
        loadingBar.style.width = `${progress}%`;
        loadingPercentage.textContent = `${Math.round(progress)}%`;
    }, interval);
});