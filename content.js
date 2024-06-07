let InvestingDecimalPointSetting;
let ZiraatDecimalPointSetting;

chrome.storage.local.get(
  ["investingDecimalSetting", "ziraatDecimalSetting"],
  (result) => {
    InvestingDecimalPointSetting = result.investingDecimalSetting ?? 1; // Default to 1 if not set
    ZiraatDecimalPointSetting = result.ziraatDecimalSetting ?? 0; // Default to 0 if not set
    console.log("Settings loaded:", {
      InvestingDecimalPointSetting,
      ZiraatDecimalPointSetting,
    });
  }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in content script:", message);

  if (message.action === "parseZiraatPortfolio") {
    let data = parseZiraatPortfolioData();
    chrome.runtime.sendMessage(
      { action: "saveData", data: data, source: "ziraat" },
      (response) => {
        console.log("Response from background script:", response);
        if (response.status === "Data saved") {
          console.log("Data saved");
          chrome.runtime.sendMessage({ action: "refreshPopup" });
        }
      }
    );
    sendResponse({ status: "Parsing initiated" });
  } else if (message.action === "parseInvestingPortfolio") {
    let data = parseInvestingPortfolioData();
    chrome.runtime.sendMessage(
      { action: "saveData", data: data, source: "investing" },
      (response) => {
        console.log("Response from background script:", response);
        if (response.status === "Data saved") {
          console.log("Data saved");
          chrome.runtime.sendMessage({ action: "refreshPopup" });
        }
      }
    );
    sendResponse({ status: "Parsing initiated" });
  }
});

function parseZiraatPortfolioData() {
  let portfolioData = [];

  // Parse TL data
  let tlElement = document.querySelector("#table-content-portfolio-cash tr");
  if (tlElement) {
    let cells = tlElement.querySelectorAll("td");

    let [code, quantity, aPrice, aCost] = [
      cells[0].textContent,
      cells[1].textContent,
      cells[2].textContent,
      cells[4].textContent,
    ].map((text) => standardizeNumber(text, ZiraatDecimalPointSetting));

    portfolioData.push({
      code: code,
      quantity: quantity,
      aPrice: aPrice,
      aCost: aCost,
    });
  } else {
    console.error("TL element not found");
  }

  // Parse equity data
  let equityRows = document.querySelectorAll(
    "#table-content-portfolio-equity tr"
  );
  equityRows.forEach((row) => {
    let cells = row.querySelectorAll("td");

    let [code, quantity, aPrice, aCost] = [
      cells[0].textContent,
      cells[1].textContent,
      cells[2].textContent,
      cells[4].textContent,
    ].map((text) => standardizeNumber(text, ZiraatDecimalPointSetting));

    portfolioData.push({
      code: code,
      quantity: quantity,
      aPrice: aPrice,
      aCost: aCost,
    });
  });

  console.log("Parsed Ziraat Data:", portfolioData); // Log the extracted data
  return portfolioData;
}

function parseInvestingPortfolioData() {
  let portfolioData = [];

  // Find the table with an ID starting with "positionstable"
  let table = document.querySelector('[id^="positionstable"]');

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

        if (codeCell && cells.length >= 4) {
          let [code, quantity, aPrice, aCost] = [
            codeCell.textContent,
            quantityCell.textContent,
            aPriceCell.textContent,
            aCostCell.textContent,
          ].map((text) =>
            standardizeNumber(text, InvestingDecimalPointSetting)
          );

          portfolioData.push({
            code: code,
            quantity: quantity,
            aPrice: aPrice,
            aCost: aCost,
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

function standardizeNumber(input, setting) {
  // Remove any spaces from the input
  input = input.replace(/\s/g, "");

  if (setting == 0) {
    return input;
  }
  if (setting == 1) {
    // Replace , with . and . with ,
    input = input
      .replace(/,/g, "TEMP")
      .replace(/\./g, ",")
      .replace(/TEMP/g, ".");
    return input;
  }
  if (setting == 2) {
    // Check if input contains both ',' and '.'
    if (input.includes(",") && input.includes(".")) {
      // Identify the decimal separator by its position (assume the one closer to the end is the decimal)
      let lastComma = input.lastIndexOf(",");
      let lastDot = input.lastIndexOf(".");

      if (lastComma > lastDot) {
        // ',' is the decimal separator
        input = input.replace(/\./g, "");
        input = input.replace(/,/g, ".");
      } else {
        // '.' is the decimal separator
        input = input.replace(/,/g, "");
      }
    } else if (input.includes(",")) {
      // If only ',' is present, assume it's the decimal if there is one ',' and there are 3 digits after
      let parts = input.split(",");
      if (parts.length === 2 && parts[1].length === 3) {
        // Assume ',' is thousands separator, do nothing
      } else {
        // Assume ',' is decimal separator
        input = input.replace(/,/g, ".");
      }
    }

    // Ensure proper thousands separator
    let [integerPart, decimalPart] = input.split(".");
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  }
}
