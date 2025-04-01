console.log("contentScript-Investing.js loaded");

/**
 * Parses the portfolio data from the Investing.com page.
 * @param {Document} doc - The page's document object.
 * @param {number} decimalSetting - The decimal standardization setting to use.
 * @returns {Array<object>} An array of portfolio asset objects.
 * @throws {Error} If the main portfolio table is not found.
 */
function parseInvestingPortfolioData(doc, decimalSetting) {
    let portfolioData = [];

    // Find the table with an ID starting with "positionstable"
    let table = doc.querySelector('[id^="positionstable"]');

    if (table) {
        // Locate the tbody within the identified table
        let tbody = table.querySelector("tbody");

        if (tbody) {
            // Parse rows within the identified tbody
            let rows = tbody.querySelectorAll("tr");
            rows.forEach((row) => {
                let cells = row.querySelectorAll("td");

                let [codeCell, quantityCell, aPriceCell, aCostCell] = [
                    ["sum_pos_fpb_symbols", "symbol"],
                    ["sum_pos_amount", "amount"],
                    ["sum_pos_fpb_current_price", "price"],
                    ["sum_pos_avg_price", "cost"],
                ].map((names) =>
                    Array.from(cells).find((cell) =>
                        names.includes(cell.getAttribute("data-column-name"))
                    )
                );
                if (codeCell.textContent===""){
                    codeCell=Array.from(cells).find((cell) =>
                        "sum_pos_Name".includes(cell.getAttribute("data-column-name"))
                    )
                }

                if (codeCell && cells.length >= 4) {
                    const code = codeCell.textContent.trim().toUpperCase();
                    let [quantity, aPrice, aCost] = [
                        quantityCell.textContent,
                        aPriceCell.textContent,
                        aCostCell.textContent,
                    ].map((text) =>
                        standardizeNumber(text, decimalSetting)
                    );

                    portfolioData.push({
                        code: code,
                        quantity: parseFloat(quantity),
                        aPrice: parseFloat(aPrice),
                        aCost: parseFloat(aCost),
                    });
                }
            });
        } else {
            console.error("tbody not found within the table.");
        }
    } else {
        console.error('Table with ID starting with "positionstable" not found.');
    }
    console.log("Parsed Investing Data:", portfolioData); // Log the extracted data
    return portfolioData;
}

// Register this parser with the central utility
registerParser({
    action: "parse-Investing",
    source: "Investing",
    settingKey: "investingDecimalSetting",
    parseFunction: parseInvestingPortfolioData
});