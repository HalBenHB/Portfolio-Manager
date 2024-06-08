document.addEventListener("DOMContentLoaded", () => {
    const saveSettingsButton = document.getElementById("saveSettings");
    const addNewPortfolioButton = document.getElementById("addNewPortfolio");
    const portfolioList = document.getElementById("portfolioList");
    const portfolioSource = document.getElementById("portfolioSource")
    const portfolioName = document.getElementById("portfolioName");
    const portfolioURL = document.getElementById("portfolioURL");

    function updateForm(){
        portfolioName.value=portfolioSource.value;

        if (portfolioSource.value==="Ziraat"){
            portfolioURL.value="https://esube1.ziraatyatirim.com.tr/sanalsube/tr/Portfolio";
        } else if(portfolioSource.value==="Investing"){
            portfolioURL.value="https://www.investing.com/portfolio/?portfolioID=*";
        }
    }
    updateForm();
    chrome.storage.local.get(
        ["investingDecimalSetting", "ziraatDecimalSetting", "extensionData"],
        (result) => {
            if (result.investingDecimalSetting !== undefined) {
                document.getElementById("investingDecimalSetting").value =
                    result.investingDecimalSetting;
            }
            if (result.ziraatDecimalSetting !== undefined) {
                document.getElementById("ziraatDecimalSetting").value =
                    result.ziraatDecimalSetting;
            }
            if (result.extensionData && result.extensionData.portfolios) {
                result.extensionData.portfolios.forEach((portfolio, index) => {
                    addPortfolioToDOM(portfolio, index);
                });
            }
        }
    );

    addNewPortfolioButton.addEventListener("click", () => {
        const portfolioSourceValue = portfolioSource.value;
        const portfolioNameValue = portfolioName.value;
        const portfolioURLValue = portfolioURL.value;

        if (portfolioNameValue && portfolioSourceValue && (portfolioSourceValue === "Ziraat" || portfolioURLValue)) {
            chrome.storage.local.get("extensionData", (result) => {
                const portfolios = result.extensionData.portfolios || [];
                const newPortfolio = {
                    id: `${portfolioNameValue}-${portfolios.length}`, // Generate ID based on name and index
                    name: portfolioNameValue,
                    source: portfolioSourceValue,
                    url: portfolioURLValue,
                    data: [],
                    updateDate: null,
                };
                portfolios.push(newPortfolio);
                chrome.storage.local.set({ extensionData: { portfolios } }, () => {
                    addPortfolioToDOM(newPortfolio, portfolios.length - 1);
                });
            });
        }
    });

    portfolioSource.addEventListener("change", ()=>{
        updateForm();
    });

    saveSettingsButton.addEventListener("click", () => {
        const investingDecimalSetting = document.getElementById("investingDecimalSetting").value;
        const ziraatDecimalSetting = document.getElementById("ziraatDecimalSetting").value;

        chrome.storage.local.set(
            {
                investingDecimalSetting: investingDecimalSetting,
                ziraatDecimalSetting: ziraatDecimalSetting,
            },
            () => {
                alert("Settings saved");
            }
        );
    });

    function addPortfolioToDOM(portfolio, index) {
        const portfolioDiv = document.createElement("div");
        portfolioDiv.classList.add("form-group");
        portfolioDiv.innerHTML = `
      <input type="text" value="${portfolio.name}" data-index="${index}" class="portfolio-name" />
      <button data-index="${index}" class="delete-portfolio">Delete</button>
    `;
        portfolioList.appendChild(portfolioDiv);

        portfolioDiv.querySelector(".delete-portfolio").addEventListener("click", (event) => {
            const index = event.target.getAttribute("data-index");
            chrome.storage.local.get("extensionData", (result) => {
                const portfolios = result.extensionData.portfolios || [];
                portfolios.splice(index, 1);
                chrome.storage.local.set({ extensionData: { portfolios } }, () => {
                    portfolioList.removeChild(portfolioDiv);
                });
            });
        });

        portfolioDiv.querySelector(".portfolio-name").addEventListener("input", (event) => {
            const index = event.target.getAttribute("data-index");
            const newName = event.target.value;
            chrome.storage.local.get("extensionData", (result) => {
                const portfolios = result.extensionData.portfolios || [];
                portfolios[index].name = newName;
                portfolios[index].id = `${newName}-${index}`; // Update ID when name changes
                chrome.storage.local.set({ extensionData: { portfolios } });
            });
        });
    }
});
