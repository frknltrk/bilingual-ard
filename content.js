(async function () {
    const translationCache = new Map(); // Cache translations to avoid redundant API calls

    const observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(async (node) => {
                    if (node.nodeType === 1 && node.matches(".ardplayer-untertitel p")) {
                        const subtitleContainer = node.closest("[lang='de-DE']");
                        if (!subtitleContainer) return; // Ensure subtitles are in German

                        if (!node.dataset.translated) {
                            node.dataset.translated = "true";
                            storeSubtitle(node);
                        }
                    }
                });
            }
        }
    });

    const subtitleContainer = document.querySelector(".ardplayer-untertitel");
    if (subtitleContainer) {
        observer.observe(subtitleContainer, { childList: true, subtree: true });
    }

    function storeSubtitle(originalP) {
        let text = originalP.innerText.trim().replace(/\n/g, ' '); // Replace new lines with spaces
        if (!text) return;

        if (!translationCache.has(text)) {
            translationCache.set(text, null); // Placeholder to avoid duplicate requests
            fetchTranslation(text).then((translatedText) => {
                if (translatedText) {
                    translationCache.set(text, translatedText);
                    checkAndShowSubtitles();
                }
            });
        }
    }

    function checkAndShowSubtitles() {
        const playPauseButton = document.querySelector(".ardplayer-button-playpause");
        const isPaused = playPauseButton && playPauseButton.classList.contains("ardplayer-icon-play");
        if (isPaused) {
            showStoredSubtitle();
        }
    }

    function showStoredSubtitle() {
        document.querySelectorAll(".ardplayer-untertitel p").forEach((originalP) => {
            let text = originalP.innerText.trim().replace(/\n/g, ' ');
            let translatedText = translationCache.get(text);
            if (!translatedText) return;

            let translatedP = originalP.parentNode.querySelector(".translated-subtitle");
            if (!translatedP) {
                translatedP = document.createElement("p");
                translatedP.className = "translated-subtitle";
                originalP.parentNode.insertBefore(translatedP, originalP); // Insert above original subtitle
            }

            // Only log once when adding the translated text
            // if (!translatedP.innerText) {
            //     console.log(translatedText);
            // }

            translatedP.innerText = translatedText;
            translatedP.style.display = "block";
        });
    }

    async function fetchTranslation(text) {
        try {
            const response = await fetch(
                "https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=en&dt=t&q=" +
                encodeURIComponent(text)
            );
            const result = await response.json();
            let translatedText = result[0].map((item) => item[0]).join(" ");

            // Convert text to sentence case (first letter capitalized, rest lowercase)
            translatedText = translatedText
                .toLowerCase()
                .replace(/(^\w|\.\s*\w)/g, (match) => match.toUpperCase());

            return translatedText;
        } catch (error) {
            console.error("Translation error:", error);
            return "";
        }
    }

    const observerPlayPause = new MutationObserver(checkAndShowSubtitles);
    const playPauseButton = document.querySelector(".ardplayer-button-playpause");
    if (playPauseButton) {
        observerPlayPause.observe(playPauseButton, { attributes: true, attributeFilter: ["class"] });
    }
})();