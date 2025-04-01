import {
    switchTab,
    addSortableEventListeners,
    handleSelectForCompareButtonClick,
    handleSettingsButtonClick,
    handleFullPageButtonClick, handleCompareButtonClick
} from "../eventHandler.js";

import {addTabsToDOM, fetchAndDisplayPortfolioData} from "../domUtils.js";
import {getPortfolios} from "../storageUtils.js";

document.addEventListener("DOMContentLoaded", mainFunction);

function mainFunction() {
    const ziraatBaseUrl = "https://esube1.ziraatyatirim.com.tr/";
    const ziraatPortfolioUrl =
        "https://esube1.ziraatyatirim.com.tr/sanalsube/tr/Portfolio";
    const fibabankaBaseUrl = "https://internetbankaciligi.fibabanka.com.tr/"; // Base login domain


    const settingsButton = document.getElementById("settingsButton");
    const fullPageButton = document.getElementById("fullPageButton");
    const selectForCompareButton = document.getElementById("selectForCompareButton");
    const compareButton = document.getElementById("compareButton");


    compareButton.addEventListener("click", handleCompareButtonClick);
    settingsButton.addEventListener("click", handleSettingsButtonClick);
    fullPageButton.addEventListener("click", handleFullPageButtonClick);
    selectForCompareButton.addEventListener("click", handleSelectForCompareButtonClick);

    console.log("Popup DOMContentLoaded event fired");


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
            console.log("POPUP: Received refreshPopup message. Calling fetchAndDisplayPortfolioData.");
            fetchAndDisplayPortfolioData();
        }
    });

    // Listen for tab updates to detect when the URL changes to the portfolio URL
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === "complete" && tab.url === ziraatPortfolioUrl) {
            console.log("Tab updated to portfolio URL.");
            updatePopUp();
        }
    });


    function updatePopUp() {
        function UPU_currentTab(button, portfolio, matchedTab) {
            document.getElementById(`tab-${portfolio.id}`).click(); // Switch to the correct tab in the popup
            button.textContent = "Update " + portfolio.name;
            button.onclick = () => {

                // Dynamically determine the action based on the source
                const parseAction = `parse-${portfolio.source}`; // e.g., "parse-Fibabanka"
                console.log(`Sending message to tab ${matchedTab.id} with action: ${parseAction}`); // Debug log

                chrome.tabs.sendMessage(
                    matchedTab.id,
                    {action: parseAction, id: portfolio.id},
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.error(
                                `Error sending message to content script (${portfolio.source}):`,
                                chrome.runtime.lastError.message
                            );
                        } else {
                            console.log(`Response from content script (${portfolio.source}):`, response);
                            fetchAndDisplayPortfolioData(); // Refresh the table immediately
                        }
                    }
                )
            };
        }

        function UPU_otherTab(button, portfolio, matchedTab) {
            button.textContent = "Switch to tab";
            button.onclick = () => {
                console.log(`Switching to tab ID: ${matchedTab.id} for ${portfolio.name}`);
                chrome.tabs.update(matchedTab.id, {active: true}, () => {
                    chrome.windows.update(matchedTab.windowId, {focused: true});
                });
            }
        }

        // UPU_noTab: Opens the portfolio URL in a new tab (uses portfolio.url - no change needed)
        function UPU_noTab(button, portfolio) {
            button.textContent = "Login " + portfolio.source;
            button.onclick = () => {
                console.log(`Opening login/portfolio URL: ${portfolio.url} for ${portfolio.name}`);
                if (!portfolio.url) {
                    console.error(`Cannot open tab for ${portfolio.name}, URL is missing.`);
                    alert(`Portfolio URL for ${portfolio.name} is not configured in options.`);
                    return;
                }
                chrome.tabs.create({url: portfolio.url}, (newTab) => {
                    // Control here why two??
                    chrome.tabs.update(newTab.id, {active: true});
                    chrome.windows.update(newTab.windowId, {focused: true});
                });
            }
        }

        // UPU_currentTab_2: Navigates the *current* tab to the portfolio URL (uses portfolio.url - no change needed)
        function UPU_currentTab_2(button, portfolio, matchedTab) {
            button.textContent = "Open Portfolio";
            button.onclick = () => {
                if (!portfolio.url) {
                    console.error(`Cannot navigate tab for ${portfolio.name}, URL is missing.`);
                    alert(`Portfolio URL for ${portfolio.name} is not configured in options.`);
                    return;
                }

                console.log(`Navigating target tab (${matchedTab.id}) to portfolio URL: ${portfolio.url} for ${portfolio.name}`);

                // if (Fibabanka ) document.querySelector('[data-testid="menuFibaBorsa"]').click();
                chrome.tabs.update(matchedTab.id, {url: portfolio.url}, () => {
                    console.log(`Tab ${matchedTab.id} update initiated to ${portfolio.url}.`);

                    // Note: The content script will only run *after* the navigation is complete.
                    // The button state will be updated the *next* time the popup is opened or updatePopUp is called.
                });
            };
        }


        chrome.windows.getCurrent({populate: true}, (currentWindow) => {


            const currentTab = currentWindow.tabs.find((tab) => tab.active);

            chrome.tabs.query({}, (allTabs) => {

                // Log all tabs for debugging console.log("All Tabs:", allTabs);

                // Use the portfolios variable fetched earlier
                if (!portfolios || portfolios.length === 0) {
                    console.log("No portfolios defined yet.");
                    return;
                }

                portfolios.forEach((portfolio) => {
                    const button = document.getElementById(`Button1-${portfolio.id}`);
                    if (!button) {
                        console.warn(`Button not found for portfolio ID: Button1-${portfolio.id}`);
                        return; // Skip if button doesn't exist for some reason
                    }

                    // Check if the portfolio's URL is open in any tab
                    const tempURL = portfolio.url.replace("https://", "").replace("http://", "").replace("www.", "");
                    const matchedTab = allTabs.find((tab) => tab.url && tab.url.includes(tempURL));

                    let similarTab;
                    if (portfolio.source === "Ziraat") {
                        similarTab = allTabs.find((tab) => tab.url && tab.url.includes(ziraatBaseUrl));
                    }
                    if (portfolio.source === "Fibabanka") {
                        similarTab = allTabs.find((tab) => tab.url && tab.url.includes(fibabankaBaseUrl));
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
        });
    }

    window.onclick = function (event) {
        if (document.getElementById("selectForCompareTabs").classList.contains("show")) {
            // Check if the click was outside the dropdown button AND the dropdown content itself
            if (!event.target.closest('#compareStuff')) // legacy if (!event.target.matches('.dropdown button') && !event.target.matches('.dropdown input') && !event.target.matches('.dropdown label')) {
            {
                handleSelectForCompareButtonClick(event)
            }
        }
    }
}