document.addEventListener("DOMContentLoaded", () => {
  const saveSettingsButton = document.getElementById("saveSettings");

  chrome.storage.local.get(
    ["investingDecimalSetting", "ziraatDecimalSetting"],
    (result) => {
      if (result.investingDecimalSetting !== undefined) {
        document.getElementById("investingDecimalSetting").value =
          result.investingDecimalSetting;
      }
      if (result.ziraatDecimalSetting !== undefined) {
        document.getElementById("ziraatDecimalSetting").value =
          result.ziraatDecimalSetting;
      }
    }
  );

  saveSettingsButton.addEventListener("click", () => {
    const investingDecimalSetting = document.getElementById(
      "investingDecimalSetting"
    ).value;
    const ziraatDecimalSetting = document.getElementById(
      "ziraatDecimalSetting"
    ).value;

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
});
