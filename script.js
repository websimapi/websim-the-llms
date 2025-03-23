import { config } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const loadingBar = document.querySelector('.loading-bar');
    const loadingPercentage = document.querySelector('.loading-percentage');
    const tipText = document.querySelector('.tip-text');
    const llmToggle = document.getElementById('llm-toggle');
    
    // Check if toggle state exists in localStorage
    const llmEnabled = localStorage.getItem('llmEnabled') === 'true';
    
    // Set initial toggle state
    llmToggle.checked = llmEnabled;

    // Toggle change event
    llmToggle.addEventListener('change', () => {
        const isEnabled = llmToggle.checked;
        localStorage.setItem('llmEnabled', isEnabled.toString());
        
        if (isEnabled) {
            // If we turn on LLM, immediately generate a tip
            generateLLMTip();
        } else {
            // If we turn off LLM, immediately show a random predefined tip
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
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant providing a short, humorous tip about 'The LLMs', a life simulation game inspired by The Sims where players manage virtual AI language models instead of people. Keep it brief (under 100 characters) and funny, styled like a loading screen tip from The Sims. Include references to AI concepts, language models, or machine learning, but in the context of daily life activities."
                    },
                    {
                        role: "user",
                        content: "Generate a single loading screen tip for 'The LLMs' game."
                    }
                ],
            });
            
            tipText.textContent = completion.content;
        } catch (error) {
            console.error("Error generating LLM tip:", error);
            tipText.textContent = "LLM error: Using fallback tips instead.";
            // Fall back to random tip if LLM fails
            setTimeout(setRandomTip, 1000);
        }
    }
    
    // Timer variables for LLM tip generation
    let tipTimer;
    let lastTipTime = 0;
    const tipCooldown = 10000; // 10 seconds between LLM tips
    
    // Function to update tips based on the toggle state
    function updateTip() {
        const currentTime = Date.now();
        
        if (llmToggle.checked) {
            // If LLM is enabled and cooldown has passed
            if (currentTime - lastTipTime >= tipCooldown) {
                generateLLMTip();
                lastTipTime = currentTime;
            }
        } else {
            // Default behavior - show random tip
            setRandomTip();
        }
    }
    
    // Set initial tip based on toggle state
    if (llmEnabled) {
        generateLLMTip();
        lastTipTime = Date.now();
    } else {
        setRandomTip();
    }
    
    // Update tips at regular intervals based on toggle state
    setInterval(() => {
        updateTip();
    }, llmEnabled ? tipCooldown : 3000);
    
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