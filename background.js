chrome.runtime.onInstalled.addListener(() => {
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
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in background script:", message);
    if (message.action === "saveData") {
        chrome.storage.local.get("extensionData", (result) => {
            console.log("Extension initializing storage:", result);
            let extensionData = result.extensionData || {
                portfolios: [],
            };

            if (message.source === "Ziraat" || message.source === "Investing") {
                console.log("Extension initializing storage with message.source: ", message.source," and result: ", result);
                let portfolio = extensionData.portfolios.find(p => p.id === message.id);
                console.log("A portfolio find from extensionData.portfolios.find(p => p.id === message.id);",portfolio);

                if (portfolio) {
                    portfolio.data = message.data;
                    console.log("Founded portfolio data updated",portfolio);
                    portfolio.updateDate = new Date().toLocaleString();
                } else {
                    console.log("Portfolio actually not founded");
                    extensionData.portfolios.push({
                        id: message.id,
                        source: message.source,
                        data: message.data,
                        updateDate: new Date().toLocaleString(),
                    });
                }
            }

            chrome.storage.local.set({extensionData: extensionData }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error saving data:", chrome.runtime.lastError);
                    sendResponse({ status: "Error saving data" });
                } else {
                    console.log("Data saved:", extensionData);
                    sendResponse({ status: "Data saved" });
                    chrome.runtime.sendMessage({ action: "refreshPopup" });
                }
            });
        });
        return true; // Indicates that we will respond asynchronously
    } else if (message.action === "getData") {
        chrome.storage.local.get("extensionData", (result) => {
            if (chrome.runtime.lastError) {
                console.error("Error getting data:", chrome.runtime.lastError);
                sendResponse({});
            } else {
                console.log("Retrieved Data:", result.extensionData); // Log the data retrieved from storage
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
        chrome.runtime.sendMessage({ action: "refreshPopup" });
    }
});
