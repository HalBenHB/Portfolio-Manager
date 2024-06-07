chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    extensionData: {
      ziraat: { portfolio: [], updateDate: null },
      investing: { portfolio: [], updateDate: null },
    },
  });
  console.log("Extension installed and storage initialized.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background script:", message);

  if (message.action === "saveData") {
    chrome.storage.local.get("extensionData", (result) => {
      let extensionData = result.extensionData || {
        ziraat: { portfolio: [], updateDate: null },
        investing: { portfolio: [], updateDate: null },
      };

      if (message.source === "ziraat") {
        extensionData.ziraat.portfolio = message.data;
        extensionData.ziraat.updateDate = new Date().toLocaleString();
      } else if (message.source === "investing") {
        extensionData.investing.portfolio = message.data;
        extensionData.investing.updateDate = new Date().toLocaleString();
      }

      chrome.storage.local.set({ extensionData: extensionData }, () => {
        console.log("Data saved:", extensionData);
        sendResponse({ status: "Data saved" });
        chrome.runtime.sendMessage({ action: "refreshPopup" });
      });
    });
    return true; // Indicates that we will respond asynchronously
  } else if (message.action === "getData") {
    chrome.storage.local.get("extensionData", (result) => {
      console.log("Retrieved Data:", result.extensionData); // Log the data retrieved from storage
      sendResponse(result.extensionData);
    });
    return true;
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const portfolioUrl =
    "https://esube1.ziraatyatirim.com.tr/sanalsube/tr/Portfolio";
  if (changeInfo.status === "complete" && tab.url === portfolioUrl) {
    console.log("Tab updated to portfolio URL.");
    chrome.runtime.sendMessage({ action: "refreshPopup" });
  }
});
