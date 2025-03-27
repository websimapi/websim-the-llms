// New file for credits overlay functionality
import marked from 'marked';

export function setupCredits() {
    const creditsButton = document.getElementById('credits-button');
    const creditsOverlay = document.getElementById('credits-overlay');
    const creditsCloseButton = document.getElementById('credits-close-button');
    const creditsContent = document.getElementById('credits-markdown-content');

    if (!creditsButton || !creditsOverlay || !creditsCloseButton || !creditsContent) {
        console.error("Credits elements not found!");
        return;
    }

    // Show Credits Overlay
    creditsButton.addEventListener('click', async () => {
        try {
            // Fetch the Markdown file
            const response = await fetch('/credits.md');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const markdownText = await response.text();

            // Render Markdown to HTML using marked
            creditsContent.innerHTML = marked.parse(markdownText);

            // Show the overlay
            creditsOverlay.classList.remove('hidden');
        } catch (error) {
            console.error("Error loading or rendering credits:", error);
            creditsContent.innerHTML = `<p>Error loading credits: ${error.message}</p>`;
            creditsOverlay.classList.remove('hidden'); // Show overlay even if error
        }
    });

    // Hide Credits Overlay
    creditsCloseButton.addEventListener('click', () => {
        creditsOverlay.classList.add('hidden');
    });

    // Hide overlay if clicking outside the content area
    creditsOverlay.addEventListener('click', (event) => {
        if (event.target === creditsOverlay) {
            creditsOverlay.classList.add('hidden');
        }
    });
}