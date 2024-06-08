document.addEventListener("DOMContentLoaded", mainFunction);


function mainFunction(){
    console.log("Popup DOMContentLoaded event fired");

    const ziraatUrl = "https://esube1.ziraatyatirim.com.tr/";
    const portfolioUrlZiraat =
        "https://esube1.ziraatyatirim.com.tr/sanalsube/tr/Portfolio";
    const tabsContainer = document.getElementById("tabsContainer");
    const tabContentContainer = document.getElementById("tabContentContainer");
    const settingsButton = document.getElementById("settingsButton");
    const fullPageButton = document.getElementById("fullPageButton");
    const selectForCompareButton = document.getElementById("selectForCompareButton");
    const selectForCompareTabs = document.getElementById("selectForCompareTabs");
    let portfolios;


    chrome.storage.local.get("extensionData", (result) => {
        console.log("Retrieved extensionData from storage:", result);
        portfolios = result.extensionData.portfolios || [];
        portfolios.forEach((portfolio) => {
            console.log("Adding portfolio to DOM:", portfolio);
            addTabToDOM(portfolio);
        });
        console.log("portfolios.length:", portfolios.length);

        if (portfolios && portfolios.length > 0) {
            console.log("Setting first tab as active:", portfolios[0].id);
            switchTab(portfolios[0].id);
        }
        // Update the popup content after setting the active tab
        updatePopUp();
        fetchAndDisplayPortfolioData();

    });

    settingsButton.addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
    });

    fullPageButton.addEventListener("click", () => {
        chrome.tabs.create({url: chrome.runtime.getURL("popup.html")});
    });


    function addTabToDOM(portfolio) {
        console.log("Adding tab to DOM for portfolio:", portfolio);
        const tabButton = document.createElement("button");
        tabButton.textContent = portfolio.name;
        tabButton.classList.add("tab");
        tabButton.id = `tab-${portfolio.id}`;
        tabButton.addEventListener("click", () => {
            console.log("Tab clicked, switching to portfolio:", portfolio.id);
            switchTab(portfolio.id);
        });
        tabsContainer.appendChild(tabButton);

        const tabContent = document.createElement("div");
        tabContent.id = `tabContent-${portfolio.id}`;
        tabContent.classList.add("tab-content");

        const thTL = portfolio.source === "Ziraat" ? "<th>TL</th>" : "";

        tabContent.innerHTML = `
            <h2>${portfolio.name}</h2>
            <div class="header-row">
                <button id="Button1-${portfolio.id}">Update</button>
                <span id="updateDate-${portfolio.id}">Date: N/A</span>
            </div>
            <table id="summaryTable-${portfolio.id}">
                <thead>
                    <tr>
                        <th>Total Cost</th>
                        <th>Pot G/L</th>
                        <th>Current Value</th>
                        ${thTL}
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <!-- Summary data will be inserted here -->
                    </tr>
                </tbody>
            </table>
            <table id="portfolioTable-${portfolio.id}">
                <thead>
                    <tr>
                        <th class="sortable" data-table="portfolioTable-${portfolio.id}" data-column="0">Code</th>
                        <th class="sortable" data-table="portfolioTable-${portfolio.id}" data-column="1">Quantity</th>
                        <th class="sortable" data-table="portfolioTable-${portfolio.id}" data-column="2">APrice</th>
                        <th class="sortable" data-table="portfolioTable-${portfolio.id}" data-column="3">ACost</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Portfolio data will be inserted here -->
                </tbody>
            </table>
        `;
        tabContentContainer.appendChild(tabContent);

        // Add event listeners to sortable columns for the new tab
        tabContent.querySelectorAll(".sortable").forEach((header) => {
            header.addEventListener("click", () => {
                console.log("Sortable header clicked:", header);
                const tableId = header.getAttribute("data-table");
                const columnIndex = parseInt(header.getAttribute("data-column"));
                const currentDirection = header.getAttribute("data-sort-direction") || "asc";
                const newDirection = currentDirection === "asc" ? "desc" : "asc";

                // Remove sorted classes from all headers
                tabContent.querySelectorAll(".sortable").forEach((header) => {
                    header.classList.remove("sorted-asc", "sorted-desc");
                    header.removeAttribute("data-sort-direction");
                });

                // Add sorted class and direction to the clicked header
                header.classList.add(newDirection === "asc" ? "sorted-asc" : "sorted-desc");
                header.setAttribute("data-sort-direction", newDirection);

                sortTable(tableId, columnIndex, newDirection);
            });
        });

        const optionContentLabel = document.createElement("label");
        const optionContentInput = document.createElement("input");
        optionContentInput.type="checkbox";
        optionContentInput.value=`${portfolio.name}`;
        optionContentLabel.appendChild(optionContentInput);
        optionContentLabel.append(`${portfolio.name}`);
        selectForCompareTabs.appendChild(optionContentLabel);
    }

    function switchTab(portfolioId) {
        console.log("Switching to tab with portfolio ID:", portfolioId);
        document.querySelectorAll(".tab-content").forEach((content) => {
            content.style.display = "none";
        });
        document.querySelectorAll(".tab").forEach((tab) => {
            tab.classList.remove("active");
        });

        document.getElementById(`tab-${portfolioId}`).classList.add("active");
        document.getElementById(`tabContent-${portfolioId}`).style.display = "block";
    }

    function fetchAndDisplayPortfolioData() {
        console.log("Fetching and displaying portfolio data");
        chrome.runtime.sendMessage({action: "getData"}, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message to background script:", chrome.runtime.lastError.message);
            } else {
                console.log("Received data in fetchAndDisplayPortfolioData:", response);
                if (response && response.portfolios) {
                    response.portfolios.forEach((portfolio) => {
                        console.log("Updating portfolio data for:", portfolio.id, " with response: ", response);
                        updateTable(portfolio.data || [], `portfolioTable-${portfolio.id}`);
                        updateDate(portfolio.updateDate, `updateDate-${portfolio.id}`);
                        updateSummaryTable(portfolio.data || [], `summaryTable-${portfolio.id}`);
                    });
                } else {
                    console.error("No portfolios found in response.");
                }
            }
        });
    }

    function updateTable(data, tableId) {
        console.log("Updating table with ID:", tableId, "with data:", data);
        let tableBody = document.getElementById(tableId).querySelector("tbody");
        tableBody.innerHTML = ""; // Clear the table body
        console.log("Updating tableBody with ID:", tableId, "with data:", data);

        data.forEach((asset) => {
            let row = document.createElement("tr");

            // Format the numbers with commas as thousand separators
            let formattedQuantity = formatter.format(parseFloat(asset.quantity));
            let formattedAPrice = parseFloat(asset.aPrice);
            let formattedACost = parseFloat(asset.aCost);
            console.log(asset, formattedAPrice)

            row.innerHTML = `<td>${asset.code}</td><td>${formattedQuantity}</td><td>${formattedAPrice}</td><td>${formattedACost}</td>`;
            tableBody.appendChild(row);
        });
    }

    function updateDate(date, elementId) {
        console.log("Updating date for element ID:", elementId, "with date:", date);
        const dateSpan = document.getElementById(elementId);
        dateSpan.textContent = `${date || "Date N/A"}`;
    }

    function updateSummaryTable(data, tableId) {
        let totalCost = 0;
        let potGL = 0;
        let currentValue = 0;
        let tlValue = 0;
        let totalValue = 0;

        if (data.length > 0 && data[0].code === "TRY") {
            tlValue = parseFloat(data[0].quantity.replace(",", ""));
            data = data.slice(1); // Remove TL row from data for further calculations
        }

        data.forEach((asset) => {
            const quantity = (typeof asset.quantity === 'string' || asset.quantity instanceof String) ? parseFloat(asset.quantity.replace(",", "")) : asset.quantity;
            const aPrice = (typeof asset.aPrice === 'string' || asset.aPrice instanceof String) ? parseFloat(asset.aPrice.replace(",", "")) : asset.aPrice;
            const aCost = (typeof asset.aCost === 'string' || asset.aCost instanceof String) ? parseFloat(asset.aCost.replace(",", "")) : asset.aCost;


            const assetCost = quantity * aCost;
            const assetValue = quantity * aPrice;
            const assetGL = assetValue - assetCost;

            if (tableId.includes("2")) {
                console.log(quantity, aPrice, aCost, assetCost, assetValue, assetGL);
            }

            totalCost += assetCost;
            currentValue += assetValue;
            potGL += assetGL;
        });

        totalValue = currentValue + tlValue;

        const formattedTotalCost = formatter.format(totalCost);
        const formattedPotGL = formatter.format(potGL);
        const formattedCurrentValue = formatter.format(currentValue);
        const formattedTlValue = formatter.format(tlValue);
        const formattedTotalValue = formatter.format(totalValue);

        if (tableId.includes("Ziraat")) {
            const summaryRow = document.querySelector(`#${tableId} tbody tr`);
            summaryRow.innerHTML = `
        <td>${formattedTotalCost}</td>
        <td>${formattedPotGL}</td>
        <td>${formattedCurrentValue}</td>
        <td>${formattedTlValue}</td>
        <td>${formattedTotalValue}</td>
      `;
        } else if (tableId.includes("Investing")) {
            const summaryRow = document.querySelector(`#${tableId} tbody tr`);
            summaryRow.innerHTML = `
        <td>${formattedTotalCost}</td>
        <td>${formattedPotGL}</td>
        <td>${formattedCurrentValue}</td>
        <td>${formattedTotalValue}</td>
      `;
        }
    }


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
                const tableId = `portfolioTable-${portfolio.id}`;
                const summaryTableId = `summaryTable-${portfolio.id}`;
                const updateDateId = `updateDate-${portfolio.id}`;

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

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Add event listeners to sortable columns
    document.querySelectorAll(".sortable").forEach((header) => {
        header.addEventListener("click", () => {
            console.log("Sortable column clicked:", header);
            const tableId = header.getAttribute("data-table");
            const columnIndex = parseInt(header.getAttribute("data-column"));
            const currentDirection = header.getAttribute("data-sort-direction") || "asc";
            const newDirection = currentDirection === "asc" ? "desc" : "asc";

            // Remove sorted classes from all headers
            document.querySelectorAll(".sortable").forEach((header) => {
                header.classList.remove("sorted-asc", "sorted-desc");
                header.removeAttribute("data-sort-direction");
            });

            // Add sorted class and direction to the clicked header
            header.classList.add(newDirection === "asc" ? "sorted-asc" : "sorted-desc");
            header.setAttribute("data-sort-direction", newDirection);

            sortTable(tableId, columnIndex, newDirection);
        });
    });

    function sortTable(tableId, columnIndex, direction) {
        console.log("Sorting table:", tableId, "on column:", columnIndex, "direction:", direction);
        let table = document.getElementById(tableId);
        let rows = Array.from(table.rows).slice(1); // Get all rows except the header
        let isNumeric = !isNaN(rows[0].cells[columnIndex].textContent.trim());

        rows.sort((rowA, rowB) => {
            let cellA = rowA.cells[columnIndex].textContent.trim();
            let cellB = rowB.cells[columnIndex].textContent.trim();

            if (isNumeric) {
                return direction === "asc" ? parseFloat(cellA) - parseFloat(cellB) : parseFloat(cellB) - parseFloat(cellA);
            } else {
                return direction === "asc" ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
            }
        });

        // Re-insert sorted rows into the table
        let tbody = table.tBodies[0];
        rows.forEach((row) => tbody.appendChild(row));
    }


    // Listen for the refreshPopup message to refresh the popup content
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

    // Create a number formatter
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
    });

selectForCompareButton.addEventListener("click",()=>{
    document.getElementById("selectForCompareTabs").classList.toggle("show");
});

window.onclick = function(event) {
    if (!event.target.matches('.dropdown button')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

document.querySelectorAll('.dropdown-content input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const text = this.value;
        const selectedItems = document.querySelector('.selected-items');
        const existingItem = selectedItems.querySelector(`[data-value="${text}"]`);

        if (this.checked) {
            if (!existingItem) {
                const selectedItem = document.createElement('div');
                selectedItem.setAttribute('data-value', text);
                selectedItem.innerText = text;
                selectedItems.appendChild(selectedItem);
            }
        } else {
            if (existingItem) {
                existingItem.remove();
            }
        }
    });
});

}
