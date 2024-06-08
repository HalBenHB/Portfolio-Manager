export function getPortfolios() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get("extensionData", (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError); // Reject the promise if there's an error
            } else {
                console.log("Retrieved extensionData from storage:", result);
                const portfolios = result.extensionData.portfolios || [];
                resolve(portfolios); // Resolve the promise with the portfolios data
            }
        });
    });
}


export function getPortfoliosAndAddToDOM(){

}