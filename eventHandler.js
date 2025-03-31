import {getPortfolios} from "./storageUtils.js";
import {showComparisonTable} from "./domUtils.js";

let selectedOptions = []

export function handleCompareButtonClick(event) {
    getPortfolios()
        .then((retrievedPortfolios) => {
            restOfTheFunct(retrievedPortfolios);
        })
        .catch((error) => {
            console.error("Error retrieving portfolios:", error);
        });

    function restOfTheFunct(portfolios) {
        console.log("portfolios", portfolios);
        let selectedPortfolios = [];

        document.querySelectorAll('input[type=checkbox]').forEach((checkbox) => {
            if (checkbox.checked) {
                let portfolioId = checkbox.id.replace("checkbox-", "");
                portfolios.forEach(portfolio => {
                    if (portfolio.id === portfolioId) {
                        selectedPortfolios.push(portfolio);
                    }
                })
            }
        });
        // Create a combined table
        const combinedTable = {};

        console.log("SelectedPortfolios: ", selectedPortfolios);
        selectedPortfolios.forEach(portfolio => {
            portfolio.data.forEach(asset => {
                if (!combinedTable[asset.code]) {
                    combinedTable[asset.code] = {
                        code: asset.code,
                        quantities: {},
                        aPrices: {},
                        aCosts: {},
                    };
                }
                combinedTable[asset.code].quantities[portfolio.id] = asset.quantity;
                combinedTable[asset.code].aPrices[portfolio.id] = asset.aPrice;
                combinedTable[asset.code].aCosts[portfolio.id] = asset.aCost;
            });
        });
        showComparisonTable(combinedTable, selectedPortfolios);
    }
}


export function handleSettingsButtonClick(event) {
    chrome.runtime.openOptionsPage();
}

export function handleFullPageButtonClick(event) {
    chrome.tabs.create({url: chrome.runtime.getURL("popup/popup.html")});
}

export function handleTabButtonClick(event, portfolioId) {
    console.log("Tab clicked, switching to portfolio:", portfolioId);
    switchTab(portfolioId);
}

export function handleSelectForCompareButtonClick(event) {
    document.getElementById("selectForCompareTabs").classList.toggle("show");
}


export function switchTab(portfolioId) {
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

export function addSortableEventListeners(tabContent) {
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
}

export function sortTable(tableId, columnIndex, direction, doc = document) {

    console.log("Sorting table:", tableId, "on column:", columnIndex, "direction:", direction);
    console.log("doc",doc);
    let table = doc.getElementById(tableId);
    console.log("Table element",table);
    let rows = Array.from(table.rows).slice(1); // Get all rows except the header
    console.log("rows element",rows);

    let isNumeric = !isNaN(rows[0].cells[columnIndex].textContent.trim());

    rows.sort((rowA, rowB) => {
        let cellA = rowA.cells[columnIndex].textContent.trim();
        let cellB = rowB.cells[columnIndex].textContent.trim();

        // Treat empty cells as 0 for numerical sorting
        if (isNumeric) {
            cellA = cellA === "" ? 0 : parseFloat(cellA);
            cellB = cellB === "" ? 0 : parseFloat(cellB);
            return direction === "asc" ? cellA - cellB : cellB - cellA;
        } else {
            // Treat empty cells as empty strings for alphabetical sorting
            cellA = cellA === "" ? "" : cellA;
            cellB = cellB === "" ? "" : cellB;
            return direction === "asc" ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
        }
    });
    // Re-insert sorted rows into the table
    let tbody = table.tBodies[0];
    rows.forEach((row) => tbody.appendChild(row));
}

export function handleCheckboxChange(event) {
    let compareButton = document.getElementById("compareButton");
    let compareButtonVisible = selectedOptions.length >= 1;
    let checkbox = event.target;
    let checkboxId = checkbox.id.replace("checkbox-", "");

    if (checkbox.checked) {
        selectedOptions.push(checkboxId);
    } else {
        const index = selectedOptions.indexOf(checkboxId);
        if (index > -1) {
            selectedOptions.splice(index, 1);
        }
    }

    if (selectedOptions.length >= 1 && !compareButtonVisible) {
        compareButton.style.display = "inline-block";
    } else if (selectedOptions.length === 0 && compareButtonVisible) {
        compareButton.style.display = "none";
    }
}