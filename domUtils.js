import {addSortableEventListeners, handleCheckboxChange, handleTabButtonClick} from "./eventHandler.js";
export function addTabToDOM(portfolio) {
    const tabsContainer = document.getElementById("tabsContainer");
    const tabContentContainer = document.getElementById("tabContentContainer");
    const selectForCompareTabs = document.getElementById("selectForCompareTabs");

    console.log("Adding tab to DOM for portfolio:", portfolio);
    const tabButton = document.createElement("button");
    tabButton.textContent = portfolio.name;
    tabButton.classList.add("tab");
    tabButton.id = `tab-${portfolio.id}`;
    tabButton.addEventListener("click", (event) => handleTabButtonClick(event, portfolio.id));
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
    addSortableEventListeners(tabContent);

    const optionContentLabel = document.createElement("label");
    const optionContentInput = document.createElement("input");
    optionContentInput.type="checkbox";
    optionContentInput.value=`${portfolio.name}`;
    optionContentInput.id=`checkbox-${portfolio.id}`;
    optionContentInput.addEventListener("change",handleCheckboxChange);
    optionContentLabel.classList.add("checkbox-label");
    optionContentLabel.appendChild(optionContentInput);
    optionContentLabel.append(`${portfolio.name}`);
    selectForCompareTabs.appendChild(optionContentLabel);
}

export function addTabsToDOM(portfolios){
    portfolios.forEach(addTabToDOM);
}

export function fetchAndDisplayPortfolioData() {
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
    // Create a number formatter
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
    });

    console.log("Updating table with ID:", tableId, "with data:", data);
    let tableBody = document.getElementById(tableId).querySelector("tbody");
    tableBody.innerHTML = ""; // Clear the table body
    console.log("Updating tableBody with ID:", tableId, "with data:", data);

    data.forEach((asset) => {
        let row = document.createElement(   "tr");

        // Format the numbers with commas as thousand separators
        let formattedQuantity = formatter.format(asset.quantity); // Directly format number
        let formattedAPrice = formatter.format(asset.aPrice);
        let formattedACost = formatter.format(asset.aCost);
        console.log(asset, formattedAPrice)

        row.innerHTML = `<td>${asset.code}</td><td>${formattedQuantity}</td><td>${formattedAPrice}</td><td>${formattedACost}</td>`;
        tableBody.appendChild(row);
    });
}

function updateDate(date, elementId) {
    console.log("Updating date for element ID:", elementId, "with date:", date);
    const displayDate = date ? new Date(date).toLocaleString() : "Date N/A";
    const dateSpan = document.getElementById(elementId);
    dateSpan.textContent = `${displayDate}`;
}

function updateSummaryTable(data, tableId) {
    // Create a number formatter
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
    });

    let totalCost = 0;
    let potGL = 0;
    let currentValue = 0;
    let totalValue = 0;
    let tlValue = 0;

    if (data.length > 0 && data[0].code === "TRY") {
        tlValue = parseFloat(data[0].quantity.replace(",", ""));
        data = data.slice(1); // Remove TL row from data for further calculations
    }

    data.forEach((asset) => {
        const quantity = asset.quantity;
        const aPrice = asset.aPrice;
        const aCost = asset.aCost;


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

export function showComparisonTable(combinedTable, selectedPortfolios) {
    // Helper function to determine the cell class based on comparison
    function getCellClass(values) {
        const nonEmptyValues = values.map(v => (v === '' ? '0' : `${v}`.replace(',', '')));
        const formattedValues = nonEmptyValues.map(v => parseFloat(v));
        const uniqueValues = new Set(formattedValues);
        return uniqueValues.size === 1 ? 'same-value' : 'different-value';
    }

    // Generate HTML for the combined table
    let tableHTML = `
        <table id="combinedTable">
            <thead>
                <tr>
                    <th class="sortable" data-table="combinedTable" data-column="0">Code</th>
                    ${selectedPortfolios.map((p, index) => `<th class="sortable" data-table="combinedTable" data-column="${index * 3 + 1}">Quantity (${p.name})</th>`).join('')}
                    ${selectedPortfolios.map((p, index) => `<th class="sortable" data-table="combinedTable" data-column="${index * 3 + 2}">APrice (${p.name})</th>`).join('')}
                    ${selectedPortfolios.map((p, index) => `<th class="sortable" data-table="combinedTable" data-column="${index * 3 + 3}">ACost (${p.name})</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${Object.values(combinedTable).map(row => {
        const quantities = selectedPortfolios.map(p => row.quantities[p.id] || '');
        const aPrices = selectedPortfolios.map(p => row.aPrices[p.id] || '');
        const aCosts = selectedPortfolios.map(p => row.aCosts[p.id] || '');

        return `
                        <tr>
                            <td>${row.code}</td>
                            ${quantities.map(q => `<td class="${getCellClass(quantities)}">${q}</td>`).join('')}
                            ${aPrices.map(p => `<td class="${getCellClass(aPrices)}">${p}</td>`).join('')}
                            ${aCosts.map(c => `<td class="${getCellClass(aCosts)}">${c}</td>`).join('')}
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    `;

    // Store the table HTML in localStorage
    localStorage.setItem('comparisonTableHTML', tableHTML);

    // Open the comparison page
    chrome.tabs.create({ url: chrome.runtime.getURL("comparison/comparison.html") });
}
