import { addSortableEventListeners } from "../eventHandler.js";

document.addEventListener('DOMContentLoaded', () => {
    const tableHTML = localStorage.getItem('comparisonTableHTML');

    if (tableHTML) {
        document.getElementById('comparisonTableContainer').innerHTML = tableHTML;
        addSortableEventListeners(document);
    } else {
        console.error("No comparison table data found.");
    }
});
