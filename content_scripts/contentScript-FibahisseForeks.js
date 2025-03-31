console.log("contentScript-FibahisseForeks.js loaded");

function parseFibahissePortfolioData(doc, decimalSetting) {
    let portfolioData = [];

    // Parse TL data
    const portfolioWidgetObject = doc.querySelector(".portfoyW");
    // Check again just in case, though it shouldn't be necessary if wait succeeded
    if (!portfolioWidgetObject) {
        console.error("FATAL: .portfoyW element disappeared after being found by observer!");
        return []; // Return empty or throw error
    }

    try {
        const hisseTab = portfolioWidgetObject.querySelector(".tabs li:first-child"); // Assuming first tab is 'Hisse'
        if (hisseTab && !hisseTab.classList.contains('active')) { // Check if it's not already active
            console.log("Clicking 'Hisse' tab...");
            hisseTab.click();
            // WARNING: Clicking might cause *internal* content to reload.
            // If parsing fails after this, you might need *another* wait here
            // for the table content itself to stabilize after the click.
            // For now, we assume the table is ready shortly after the click or already present.
        }

        //const infoItems = portfolioObject.querySelectorAll(".info ul li");
        //const [totalValue, totalProfit, totalProfitPercent] = [...infoItems].map(el => el.innerText.trim());
        //console.log({ totalValue, totalProfit, totalProfitPercent });

        const portfoyObject = portfolioWidgetObject.querySelector(".portfoy");
        if (!portfoyObject) {
            console.error("'.portfoy' container not found within '.portfoyW'.");
            return [];
        }

        const tableObject = portfoyObject.querySelector("table");
        if (!tableObject) {
            console.error("'table' not found within '.portfoy'.");
            return [];
        }
        const allRows = tableObject.querySelectorAll("tr");
        if (allRows.length < 2) { // Need at least header + 1 data row
            console.warn("Portfolio table has no data rows.");
            return [];
        }
        const headerRow = allRows[0];
        const headerEls = headerRow.querySelectorAll("th");
        if (!headerEls || headerEls.length === 0) {
            console.error("Portfolio table header (th elements) not found.");
            return [];
        }


        // Map headers to indices based on 'field-id'
        const requiredFields = ["symbol", "piece", "cost", "live_price_last"];
        const fieldIndexes = {};
        let foundFieldsCount = 0;
        headerEls.forEach((header, index) => {
            const fieldId = header.getAttribute("field-id");
            if (fieldId && requiredFields.includes(fieldId)) {
                fieldIndexes[fieldId] = index;
                foundFieldsCount++;
            }
        });

        // Check if all required headers were found
        if (foundFieldsCount !== requiredFields.length) {
            console.warn(`Missing required table headers. Found: ${foundFieldsCount}/${requiredFields.length}. Required: ${requiredFields.join(', ')}. Indexes found:`, fieldIndexes);
            // Proceeding anyway, but expect potential errors if fields are missing
            return []; // uncomment this to stop if headers are missing
        }

        const equityRows = Array.from(allRows).slice(1); // Skip header row

        equityRows.forEach((row) => {
            const cells = row.querySelectorAll("td");
            if (cells.length <= Math.max(...Object.values(fieldIndexes))) {
                console.warn(`Skipping row ${rowIndex + 1}: Not enough cells (${cells.length}).`);
                return; // continue to next row
            }

            const code = cells[fieldIndexes["symbol"]].textContent.replace(/\s+/g, '');
            const [quantity, aPrice, aCost] = [cells[fieldIndexes["piece"]].textContent.replace(/\s+/g, ''), cells[fieldIndexes["live_price_last"]].textContent.replace(/\s+/g, ''), cells[fieldIndexes["cost"]].textContent.replace(/\s+/g, ''),].map((text) => standardizeNumber(text, decimalSetting));
            portfolioData.push({
                code: code, quantity: parseFloat(quantity), aPrice: parseFloat(aPrice), aCost: parseFloat(aCost),
            });
        });

    } catch (error) {
        console.error("Error during Foreks iframe parsing logic:", error);
        return [];
    }
    // Final check and log
    if (portfolioData.length === 0) {
        console.warn("Foreks iframe parsing finished, but no data was extracted.");
    } else {
        console.log("Parsed Foreks Iframe Data:", portfolioData);
    }
    return portfolioData;
}

// Register this parser with the central utility
registerParser({
    action: "parse-Fibabanka",
    source: "Fibabanka",
    settingKey: "fibabankaDecimalSetting",
    parseFunction: parseFibahissePortfolioData,
    waitForSelector: ".portfoyW" // <-- Add this line: The main widget selector to wait for
});