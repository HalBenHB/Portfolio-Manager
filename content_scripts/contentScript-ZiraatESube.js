console.log("contentScript-ZiraatESube.js loaded");

/**
 * Parses the portfolio data from the Ziraat E-Sube page.
 * @param {Document} doc - The page's document object.
 * @param {number} decimalSetting - The decimal standardization setting to use.
 * @returns {Array<object>} An array of portfolio asset objects.
 * @throws {Error} If essential table elements are not found.
 */

function parseZiraatPortfolioData(doc, decimalSetting) {
        function helper_parserZiraatPortfolioData(portfolioData, row) {

        let cells = row.querySelectorAll("td");

        const code = cells[0].textContent.trim().toUpperCase();
        const [quantity, aPrice, aCost] = [
            cells[1].textContent,
            cells[2].textContent,
            cells[4].textContent,
        ].map((text) => standardizeNumber(text, decimalSetting));

        portfolioData.push({
            code: code,
            quantity: parseFloat(quantity),
            aPrice: parseFloat(aPrice),
            aCost: parseFloat(aCost),
        });
    }

    let portfolioData = [];

    // Parse TL data
    let tlElement = doc.querySelector("#table-content-portfolio-cash tr");
    if (tlElement) {
        helper_parserZiraatPortfolioData(portfolioData, tlElement);
    } else {
        console.error("TL element not found");
    }

    // Parse equity data
    let equityRows = doc.querySelectorAll(
        "#table-content-portfolio-equity tr"
    );

    equityRows.forEach((row) => {
        helper_parserZiraatPortfolioData(portfolioData, row);
    });

    console.log("Parsed Ziraat Data:", portfolioData); // Log the extracted data
    return portfolioData;
}

// Register this parser with the central utility
registerParser({
    action: "parse-Ziraat",
    source: "Ziraat",
    settingKey: "ziraatDecimalSetting",
    parseFunction: parseZiraatPortfolioData
});