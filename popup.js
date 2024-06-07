document.addEventListener("DOMContentLoaded", () => {
  const ziraatUrl = "https://esube1.ziraatyatirim.com.tr/";
  const portfolioUrlZiraat =
    "https://esube1.ziraatyatirim.com.tr/sanalsube/tr/Portfolio";
  const portfolioUrlInvesting =
    "https://tr.investing.com/portfolio/?portfolioID=NDVhMmE0PmRiPGllbzRlZg%3D%3D";

  const ziraatTab = document.getElementById("ziraatTab");
  const investingTab = document.getElementById("investingTab");
  const ziraatContent = document.getElementById("ziraatContent");
  const investingContent = document.getElementById("investingContent");
  const ziraatButton1 = document.getElementById("ziraatButton1");
  const investingButton1 = document.getElementById("investingButton1");
  const settingsButton = document.getElementById("settingsButton");
  const fullPageButton = document.getElementById("fullPageButton");

  settingsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  fullPageButton.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
  });

  ziraatTab.addEventListener("click", () => {
    switchTab(ziraatTab, investingTab, ziraatContent, investingContent);
  });

  investingTab.addEventListener("click", () => {
    switchTab(investingTab, ziraatTab, investingContent, ziraatContent);
  });

  ziraatButton1.addEventListener("click", () => {
    updatePortfolio("ziraat");
  });

  investingButton1.addEventListener("click", () => {
    updatePortfolio("investing");
  });

  function switchTab(activeTab, inactiveTab, activeContent, inactiveContent) {
    activeTab.classList.add("active");
    inactiveTab.classList.remove("active");
    activeContent.classList.add("active");
    inactiveContent.classList.remove("active");
    //handlePopUpUpdate();
  }

  function fetchAndDisplayPortfolioData() {
    console.log("Fetching portfolio data...");
    chrome.runtime.sendMessage({ action: "getData" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error sending message to background script:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log("Portfolio Data received:", response); // Log the data received from storage
        updateTable(
          response.ziraat.portfolio || [],
          "ziraatTable",
          "summaryTableZiraat"
        );
        updateDate(response.ziraat.updateDate, "updateDateZiraat"); // Update the date displayed in the popup for Ziraat

        updateTable(
          response.investing.portfolio || [],
          "investingTable",
          "summaryTableInvesting"
        );
        updateDate(response.investing.updateDate, "updateDateInvesting"); // Update the date displayed in the popup for Investing
      }
    });
  }

  function updateTable(data, tableId, summaryTableId) {
    let tableBody = document.getElementById(tableId).querySelector("tbody");
    console.log("Updating table with data:", data); // Add this line
    tableBody.innerHTML = ""; // Clear the table body
    data.forEach((asset) => {
      let row = document.createElement("tr");
      row.innerHTML = `<td>${asset.code}</td><td>${asset.quantity}</td><td>${asset.aPrice}</td><td>${asset.aCost}</td>`;
      tableBody.appendChild(row);
    });
    updateSummary(data || [], summaryTableId);
  }

  function updateSummary(data, summaryTableId) {
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
      const quantity = parseFloat(asset.quantity.replace(",", ""));
      const aPrice = parseFloat(asset.aPrice.replace(",", ""));
      const aCost = parseFloat(asset.aCost.replace(",", ""));

      const assetCost = quantity * aCost;
      const assetValue = quantity * aPrice;
      const assetGL = assetValue - assetCost;

      totalCost += assetCost;
      currentValue += assetValue;
      potGL += assetGL;
    });

    totalValue = currentValue + tlValue;

    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const formattedTotalCost = formatter.format(totalCost);
    const formattedPotGL = formatter.format(potGL);
    const formattedCurrentValue = formatter.format(currentValue);
    const formattedTlValue = formatter.format(tlValue);
    const formattedTotalValue = formatter.format(totalValue);

    if (summaryTableId === "summaryTableZiraat") {
      const summaryRow = document.querySelector(`#${summaryTableId} tbody tr`);
      summaryRow.innerHTML = `
        <td>${formattedTotalCost}</td>
        <td>${formattedPotGL}</td>
        <td>${formattedCurrentValue}</td>
        <td>${formattedTlValue}</td>
        <td>${formattedTotalValue}</td>
      `;
    } else if (summaryTableId === "summaryTableInvesting") {
      const summaryRow = document.querySelector(`#${summaryTableId} tbody tr`);
      summaryRow.innerHTML = `
        <td>${formattedTotalCost}</td>
        <td>${formattedPotGL}</td>
        <td>${formattedCurrentValue}</td>
        <td>${formattedTotalValue}</td>
      `;
    }
  }

  function updateDate(date, elementId) {
    const dateSpan = document.getElementById(elementId);
    dateSpan.textContent = `${date || "Date N/A"}`;
  }

  function updatePortfolio(portfolio) {
    console.log(`Updating ${portfolio} portfolio...`);
    // Here you would add the logic to update the portfolio data
    // For example, sending a message to the content script to parse and save new data
  }

  function updatePopUp() {
    let currentTab;
    chrome.windows.getCurrent({ populate: true }, (currentWindow) => {
      currentTab = currentWindow.tabs.find((tab) => tab.active);
    });

    chrome.tabs.query({}, (allTabs) => {
      // Log all tabs for debugging
      console.log("All Tabs:", allTabs);
      // Find the current active tab in the current window
      let ziraatTab = allTabs.find(
        (tab) => tab.url && tab.url.startsWith(ziraatUrl)
      );
      let investingTab = allTabs.find(
        (tab) => tab.url && tab.url === portfolioUrlInvesting
      );

      if (currentTab.url === portfolioUrlZiraat) {
        UPU_ZiraatPortfolioCurrent(currentTab);
      } else if (currentTab.url.startsWith(ziraatUrl)) {
        UPU_ZiraatCurrent(currentTab);
      } else if (ziraatTab) {
        UPU_ZiraatTabExists(ziraatTab);
      } else {
        UPU_ZiraatTabNotExists();
      }

      if (currentTab.url === portfolioUrlInvesting) {
        UPU_InvestingPortfolioCurrent(currentTab);
      } else if (investingTab) {
        UPU_InvestingTabExists(investingTab);
      } else {
        UPU_InvestingTabNotExists();
      }
    });
  }

  fetchAndDisplayPortfolioData();
  updatePopUp();

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

  function UPU_ZiraatPortfolioCurrent(currentTab) {
    ziraatTab.click();
    ziraatButton1.textContent = "Update Ziraat Portfolio";
    ziraatButton1.onclick = () => {
      chrome.tabs.sendMessage(
        currentTab.id,
        { action: "parseZiraatPortfolio" },
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
      );
    };
  }

  function UPU_ZiraatCurrent(currentTab) {
    ziraatButton1.textContent = "Open Ziraat Portfolio";
    ziraatButton1.onclick = () => {
      console.log("Navigating to portfolio URL in the current tab.");
      chrome.tabs.update(currentTab.id, { url: portfolioUrlZiraat }, () => {
        console.log("Tab updated to portfolio URL.");
        // Set a timeout to ensure the page is fully loaded before updating the button
      });
    };
  }

  function UPU_ZiraatTabExists(ziraatTab) {
    ziraatButton1.textContent = "Login Ziraat";
    ziraatButton1.onclick = () => {
      console.log(
        "Found a matching tab. Switching to this tab:",
        ziraatTab.url
      );
      chrome.tabs.update(ziraatTab.id, { active: true }, () => {
        chrome.windows.update(ziraatTab.windowId, { focused: true });
      });
    };
  }

  function UPU_ZiraatTabNotExists() {
    ziraatButton1.textContent = "Login Ziraat";
    ziraatButton1.onclick = () => {
      console.log("No matching tab found. Opening portfolio URL in a new tab.");
      chrome.tabs.create({ url: portfolioUrlZiraat }, (newTab) => {
        chrome.tabs.update(newTab.id, { active: true });
        chrome.windows.update(newTab.windowId, { focused: true });
        // Re-check the URL and update the button
        setTimeout(() => {
          // Re-check the URL and update the button
          updatePopUp();
        }, 1000);
      });
    };
  }

  function UPU_InvestingTabExists(investingTab) {
    investingButton1.textContent = "Login Investing";
    investingButton1.onclick = () => {
      console.log(
        "Found a matching tab. Switching to this tab:",
        investingTab.url
      );
      chrome.tabs.update(investingTab.id, { active: true }, () => {
        chrome.windows.update(investingTab.windowId, { focused: true });
      });
    };
  }

  function UPU_InvestingPortfolioCurrent(currentTab) {
    investingTab.click();
    investingButton1.textContent = "Update Investing Portfolio";
    investingButton1.onclick = () => {
      chrome.tabs.sendMessage(
        currentTab.id,
        { action: "parseInvestingPortfolio" },
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
      );
    };
  }

  function UPU_InvestingTabNotExists() {
    investingButton1.textContent = "Login Investing.Com";
    investingButton1.onclick = () => {
      console.log("No matching tab found. Opening portfolio URL in a new tab.");
      chrome.tabs.create({ url: portfolioUrlInvesting }, (newTab) => {
        chrome.tabs.update(newTab.id, { active: true });
        chrome.windows.update(newTab.windowId, { focused: true });
        // Re-check the URL and update the button
        setTimeout(() => {
          // Re-check the URL and update the button
          updatePopUp();
        }, 1000);
      });
    };
  }

  // Add event listeners to sortable columns
  document.querySelectorAll(".sortable").forEach((header) => {
    header.addEventListener("click", () => {
      const tableId = header.getAttribute("data-table");
      const columnIndex = parseInt(header.getAttribute("data-column"));
      const currentDirection =
        header.getAttribute("data-sort-direction") || "asc";
      const newDirection = currentDirection === "asc" ? "desc" : "asc";

      // Remove sorted classes from all headers
      document.querySelectorAll(".sortable").forEach((header) => {
        header.classList.remove("sorted-asc", "sorted-desc");
        header.removeAttribute("data-sort-direction");
      });

      // Add sorted class and direction to the clicked header
      header.classList.add(
        newDirection === "asc" ? "sorted-asc" : "sorted-desc"
      );
      header.setAttribute("data-sort-direction", newDirection);

      sortTable(tableId, columnIndex, newDirection);
    });
  });

  function sortTable(tableId, columnIndex, direction) {
    let table = document.getElementById(tableId);
    let rows = Array.from(table.rows).slice(1); // Get all rows except the header
    let isNumeric = !isNaN(rows[0].cells[columnIndex].textContent.trim());

    rows.sort((rowA, rowB) => {
      let cellA = rowA.cells[columnIndex].textContent.trim();
      let cellB = rowB.cells[columnIndex].textContent.trim();

      if (isNumeric) {
        return direction === "asc"
          ? parseFloat(cellA) - parseFloat(cellB)
          : parseFloat(cellB) - parseFloat(cellA);
      } else {
        return direction === "asc"
          ? cellA.localeCompare(cellB)
          : cellB.localeCompare(cellA);
      }
    });

    // Re-insert sorted rows into the table
    let tbody = table.tBodies[0];
    rows.forEach((row) => tbody.appendChild(row));
  }
});
