chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get("extensionData", (result) => {
        if (!result.extensionData) {
            // Only set initial data if it's not already set
            chrome.storage.local.set({
                extensionData: {
                    portfolios: [],
                },
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error initializing storage:", chrome.runtime.lastError);
                } else {
                    console.log("Extension installed and storage initialized.");
                }
            });
        } else {
            console.log("Storage already initialized.");
        }
    });
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in background script:", message);
    switch (message.action) {
        case "saveData":
            chrome.storage.local.get("extensionData", (result) => {

                if (chrome.runtime.lastError) {
                    console.error("Error getting storage:", chrome.runtime.lastError);
                    sendResponse({status: "Error getting storage"});
                    return true; // Need to return true as we intend to respond async
                }

                console.log("Current extensionData before save:", result);
                let extensionData = result.extensionData || {
                    portfolios: [],
                };
                if (!Array.isArray(extensionData.portfolios)) {
                    // Ensure portfolios is always an array, fixing potential corruption
                    console.warn("Portfolios data was not an array, resetting.");
                    extensionData.portfolios = [];
                }

                let portfolioIndex = extensionData.portfolios.findIndex(p => p && p.id === message.id); // Added check for p existence

                if (portfolioIndex !== -1) {
                    let portfolio = extensionData.portfolios[portfolioIndex];
                    console.log("A portfolio found: ;", portfolio);
                    portfolio.data = message.data;
                    console.log("Founded portfolio data updated", portfolio);
                    portfolio.updateDate = new Date().toISOString();
                    console.log("Updated portfolio:", extensionData.portfolios[portfolioIndex]);

                    chrome.storage.local.set({extensionData: extensionData}, () => {
                        if (chrome.runtime.lastError) {
                            console.error("Error saving data:", chrome.runtime.lastError);
                            sendResponse({status: "Error saving data"});
                        } else {
                            console.log("BACKGROUND: Data saved:", extensionData);
                            sendResponse({status: "Data saved"});
                            console.log("BACKGROUND: Sending refreshPopup message.");
                            chrome.runtime.sendMessage({action: "refreshPopup"});
                        }
                    });
                } else {
                    // --- Portfolio Not Found ---
                    // This indicates a configuration problem. The popup should only trigger
                    // updates for portfolios that exist in the configuration.
                    // We should NOT add a new portfolio here as we lack name, URL etc.
                    console.error(`Error saving data: Portfolio with ID '${message.id}' (Source: ${message.source}) not found in storage. Was it configured in options?`);
                    sendResponse({status: "Error", message: `Portfolio ID '${message.id}' not found`});
                    // Do not save, as no valid update occurred.
                }
            });
            return true;
        case "getData":
            chrome.storage.local.get("extensionData", (result) => {
                if (chrome.runtime.lastError) {
                    console.error("BACKGROUND: Error getting data:", chrome.runtime.lastError);
                    sendResponse({});
                } else {
                    console.log("BACKGROUND: Retrieved Data for getData request:", result.extensionData);
                    sendResponse(result.extensionData);
                }
            });
            return true;
    }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const portfolioUrl = "https://esube1.ziraatyatirim.com.tr/sanalsube/tr/Portfolio";
    if (changeInfo.status === "complete" && tab.url === portfolioUrl) {
        console.log("Tab updated to portfolio URL.");
        chrome.runtime.sendMessage({action: "refreshPopup"});
    }
});
