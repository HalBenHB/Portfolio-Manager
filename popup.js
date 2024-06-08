import {
    switchTab,
    addSortableEventListeners,
    handleSelectForCompareButtonClick,
    handleSettingsButtonClick,
    handleFullPageButtonClick, handleCompareButtonClick
} from "./eventHandler.js";

import {addTabsToDOM, fetchAndDisplayPortfolioData} from "./domUtils.js";
import {getPortfolios} from "./storageUtils.js";

document.addEventListener("DOMContentLoaded", mainFunction);

function mainFunction() {
    const settingsButton = document.getElementById("settingsButton");
    const fullPageButton = document.getElementById("fullPageButton");
    const selectForCompareButton = document.getElementById("selectForCompareButton");
    const compareButton = document.getElementById("compareButton");


    compareButton.addEventListener("click", handleCompareButtonClick);
    settingsButton.addEventListener("click", handleSettingsButtonClick);
    fullPageButton.addEventListener("click", handleFullPageButtonClick);
    selectForCompareButton.addEventListener("click", handleSelectForCompareButtonClick);

    console.log("Popup DOMContentLoaded event fired");
    const ziraatUrl = "https://esube1.ziraatyatirim.com.tr/";
    const portfolioUrlZiraat =
        "https://esube1.ziraatyatirim.com.tr/sanalsube/tr/Portfolio";


    let portfolios;

    getPortfolios()
        .then((retrievedPortfolios) => {
            portfolios = retrievedPortfolios; // Assign the portfolios variable here
            addTabsToDOM(portfolios);
            if (portfolios && portfolios.length > 0) {
                console.log("Setting first tab as active:", portfolios[0].id);
                switchTab(portfolios[0].id);
            }
            // Update the popup content after setting the active tab
            updatePopUp();
            fetchAndDisplayPortfolioData();
        })
        .catch((error) => {
            console.error("Error retrieving portfolios:", error);
        });

    // Add event listeners to sortable columns
    addSortableEventListeners(document);

    // Listen for the refreshPopup message to refresh the popup content
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "refreshPopup") {
            console.log("Received refreshPopup message.");
            fetchAndDisplayPortfolioData();
        }
    });

    // Listen for tab updates to detect when the URL changes to the portfolio URL
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === "complete" && tab.url === portfolioUrlZiraat) {
            console.log("Tab updated to portfolio URL.");
            updatePopUp();
        }
    });


    function updatePopUp() {
        function UPU_currentTab(button, portfolio, matchedTab) {
            document.getElementById(`tab-${portfolio.id}`).click();
            button.textContent = "Update " + portfolio.name;
            button.onclick = () => {
                chrome.tabs.sendMessage(
                    matchedTab.id,
                    {action: `parse-${portfolio.source}`, id: portfolio.id},
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.error(
                                "Error sending message to content script:",
                                chrome.runtime.lastError.message
                            );
                        } else {
                            console.log("Response from content script:", response);
                            fetchAndDisplayPortfolioData(); // Refresh the table immediately
                        }
                    }
                )
            };
        }

        function UPU_otherTab(button, portfolio, matchedTab) {
            button.textContent = "Switch to tab";
            button.onclick = () => {
                console.log("Navigating to portfolio URL in the current tab.");
                chrome.tabs.update(matchedTab.id, {active: true}, () => {
                    chrome.windows.update(matchedTab.windowId, {focused: true});
                });
            }
        }

        function UPU_noTab(button, portfolio) {
            button.textContent = "Login " + portfolio.source;
            button.onclick = () => {
                console.log("Navigating to portfolio URL in the current tab.");
                chrome.tabs.create({url: portfolio.url}, (newTab) => {
                    chrome.tabs.update(newTab.id, {active: true});
                    chrome.windows.update(newTab.windowId, {focused: true});
                });
            }
        }

        function UPU_currentTab_2(button, portfolio, matchedTab) {

            button.textContent = "Open Portfolio";
            button.onclick = () => {
                console.log("Navigating to portfolio URL in the current tab.");
                chrome.tabs.update(matchedTab.id, {url: portfolio.url}, () => {
                    console.log("Tab updated to portfolio URL.");
                    // Set a timeout to ensure the page is fully loaded before updating the button
                });
            };
        }

        let currentTab;
        chrome.windows.getCurrent({populate: true}, (currentWindow) => {
            currentTab = currentWindow.tabs.find((tab) => tab.active);
        });

        chrome.tabs.query({}, (allTabs) => {
            // Log all tabs for debugging
            console.log("All Tabs:", allTabs);

            portfolios.forEach((portfolio) => {
                const button = document.getElementById(`Button1-${portfolio.id}`);

                // Check if the portfolio's URL is open in any tab
                const tempURL = portfolio.url.replace("https://", "").replace("http://", "").replace("www.", "");
                const matchedTab = allTabs.find((tab) => tab.url && tab.url.includes(tempURL));

                let similarTab;
                if (portfolio.source === "Ziraat") {
                    similarTab = allTabs.find((tab) => tab.url && tab.url.includes(ziraatUrl));
                }

                if (matchedTab) {
                    if (matchedTab.id === currentTab.id) {
                        UPU_currentTab(button, portfolio, matchedTab);
                    } else {

                        UPU_otherTab(button, portfolio, matchedTab);
                    }
                } else {
                    if (similarTab) {
                        if (similarTab.id === currentTab.id) {
                            UPU_currentTab_2(button, portfolio, similarTab);

                        } else {
                            UPU_otherTab(button, portfolio, similarTab);
                        }
                    } else {
                        UPU_noTab(button, portfolio);
                    }
                }
            })
        });
    }

    window.onclick = function (event) {
        if (document.getElementById("selectForCompareTabs").classList.contains("show")) {
            if (!event.target.matches('.dropdown button') && !event.target.matches('.dropdown input') && !event.target.matches('.dropdown label')) {
                handleSelectForCompareButtonClick(event)
            }
        }
    }
}
