// --- Settings Management ---
let decimalSettings = {
    investingDecimalSetting: 2,
    ziraatDecimalSetting: 2,
    fibabankaDecimalSetting: 2,
};


// Load decimalSettings once when the script initializes
chrome.storage.local.get(
    ["investingDecimalSetting", "ziraatDecimalSetting", "fibabankaDecimalSetting"],
    (result) => {
        decimalSettings.investingDecimalSetting = parseInt(result.investingDecimalSetting) || decimalSettings.investingDecimalSetting;
        decimalSettings.ziraatDecimalSetting = parseInt(result.ziraatDecimalSetting) || decimalSettings.ziraatDecimalSetting;
        decimalSettings.fibabankaDecimalSetting = parseInt(result.fibabankaDecimalSetting) || decimalSettings.fibabankaDecimalSetting;
        console.log("Content script decimalSettings loaded:", decimalSettings);
    }
);


// --- Parser Registry ---
const siteParsers = {};

/**
 * Registers a parsing function for a specific site configuration.
 * @param {object} config - Configuration object.
 * @param {string} config.action - The message action that triggers this parser (e.g., "parse-Ziraat").
 * @param {string} config.source - The source identifier (e.g., "Ziraat").
 * @param {string} config.settingKey - The key in the `decimalSettings` object for decimal formatting (e.g., "ziraatDecimalSetting").
 * @param {function} config.parseFunction - The function to call for parsing (receives `document` and `decimalSetting`).
 */
function registerParser(config) {
    if (!config || !config.action || !config.source || !config.settingKey || typeof config.parseFunction !== 'function') {
        console.error("Invalid parser configuration provided:", config);
        return;
    }
    if (config.waitForSelector && typeof config.waitForSelector !== 'string') {
        console.warn(`Parser config for ${config.action} has invalid waitForSelector (must be a string).`);
    }
    console.log(`Registering parser for action: ${config.action}`);

    siteParsers[config.action] = config;
}

// --- Wait for Element Function ---
/**
 * Waits for a specific element to appear in the DOM.
 * @param {string} selector - The CSS selector for the target element.
 * @param {number} timeoutMs - Maximum time to wait in milliseconds.
 * @returns {Promise<Element>} Resolves with the found element or rejects on timeout/error.
 */
function waitForElement(selector, timeoutMs = 15000) { // Increased default timeout
    return new Promise((resolve, reject) => {
        // Check if the element already exists
        const existingElement = document.querySelector(selector);
        if (existingElement) {
            console.log(`Element ${selector} already exists.`);
            resolve(existingElement);
            return;
        }

        let observer = null;
        let timeoutId = null;

        // Function to clean up observer and timeout
        const cleanup = () => {
            if (observer) observer.disconnect();
            if (timeoutId) clearTimeout(timeoutId);
        };

        // Set up the timeout
        timeoutId = setTimeout(() => {
            cleanup();
            console.error(`Timeout: Element ${selector} did not appear within ${timeoutMs}ms.`);
            reject(new Error(`Timeout waiting for element: ${selector}`));
        }, timeoutMs);

        // Set up the observer
        observer = new MutationObserver((mutations) => {
            const targetElement = document.querySelector(selector);
            if (targetElement) {
                cleanup();
                console.log(`Element ${selector} appeared.`);
                resolve(targetElement);
            }
            // Optional: Add logging for mutations if needed for debugging
            // console.log('DOM mutated, checking for:', selector);
        });

        // Start observing the document body for subtree modifications
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        console.log(`MutationObserver started, waiting for ${selector}...`);
    });
}


// --- Central Message Listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in content script utils:", message);
    const parserConfig = siteParsers[message.action];
    if (parserConfig) {
        console.log(`Executing parser for action: ${message.action}`);
        const decimalSetting = decimalSettings[parserConfig.settingKey];
        const selectorToWaitFor = parserConfig.waitForSelector; // Get the selector, if defined

        // --- Asynchronous Handling ---
        // We need to handle the response asynchronously because we might wait

        (async () => {
            try {
                if (selectorToWaitFor) {
                    // If a selector is specified, wait for it
                    console.log(`Waiting for element: ${selectorToWaitFor}`);
                    await waitForElement(selectorToWaitFor, 20000); // Wait up to 20 seconds
                    console.log(`Element ${selectorToWaitFor} found or wait finished.`);
                } else {
                    console.log("No specific element selector defined to wait for.");
                }

                // Now, attempt to parse the data (element should exist if waited for)
                const data = parserConfig.parseFunction(document, decimalSetting);
                console.log(`Parsed data from ${parserConfig.source}:`, data);

                // Send data to background script
                chrome.runtime.sendMessage(
                    {action: "saveData", data: data, source: parserConfig.source, id: message.id},
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("Error sending saveData message to background:", chrome.runtime.lastError.message);
                            sendResponse({
                                status: "Error",
                                message: `Background communication failed: ${chrome.runtime.lastError.message}`
                            });
                        } else {
                            console.log("Response from background script (saveData):", response);
                            // Relay background response status back to original sender (popup)
                            sendResponse(response || {status: "Error", message: "No response from background script."});
                        }
                    }
                );

            } catch (error) {
                // Handle errors from waitForElement or parseFunction
                console.error(`Error during processing for action ${message.action}:`, error);
                sendResponse({status: "Error", message: `Processing failed: ${error.message}`});
            }

        })(); // Immediately invoke the async function
        // Indicate that the response will be sent asynchronously
        return true;
    } else {
        console.log(`No parser registered for action: ${message.action}`);
        // No need to sendResponse if the message isn't handled
        // sendResponse({status: "Ignored", message: "Action not relevant to this content script"});
        return false;
    }
});


/**
 * Standardizes a number string representation to the format "digits.digits".
 * Handles different input conventions based on the setting.
 *
 * @param {string} input The number string to standardize (e.g., "1 234,56", "1,234.56", "1234.56").
 * @param {number} setting Defines the input format assumption:
 *                 0: No standardization (only removes spaces).
 *                 1: European format ('.' is thousands sep, ',' is decimal sep).
 *                 2: Auto-detect format.
 * @returns {string} The standardized number string (e.g., "1234.56") or the original (cleaned) input if setting is 0.
 */
function standardizeNumber(input, setting) {
    console.log(input,setting);
    if (typeof input !== 'string') {
        // Handle non-string input gracefully, e.g., return as is or throw error
        // For this example, let's try to convert or return an empty string
        input = String(input ?? '');
    }

    input = input.replace(/\s/g, ""); // Remove any spaces from the input
    let standardized = input;

    switch (setting) {
        case 0: // No change, just return space-cleaned input
            return standardized;
        case 1:
            // Assume European format: '.' is thousands, ',' is decimal
            // Remove all dots, then replace the comma with a dot
            standardized = input.replace(/\./g, "").replace(/,/g, ".");
            return standardized;
        case 2:
            // Auto-detect (simplified example)
            // Check if input contains both ',' and '.'
            if (input.includes(",") && input.includes(".")) {
                // Identify the decimal separator by its position (assume the one closer to the end is the decimal)
                let lastComma = input.lastIndexOf(",");
                let lastDot = input.lastIndexOf(".");

                if (lastComma > lastDot) {
                    // ',' is the decimal separator
                    standardized = input.replace(/\./g, "").replace(/,/g, ".");
                } else if (lastDot > lastComma) {
                    // '.' is the decimal separator
                    standardized = input.replace(/,/g, "");
                }
            } else if (input.includes(",")) {
                if ((input.match(/,/g)||[]).length===1){
                    // If there is only one ',', assume it's decimal.
                    standardized = input.replace(/,/g, ".");
                }
                else
                {
                    // Assume ',' is thousand separator
                    standardized = input.replace(/,/g, "");
                }
            }
            // If only dot, or neither, assume standard format already (or integer)
            return standardized;
        default:
            console.warn(`Unknown setting: ${setting}. Returning space-cleaned input.`);
            return standardized; // Fallback for unknown decimalSettings
    }
}