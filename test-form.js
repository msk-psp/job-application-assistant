document.getElementById("clear-form").addEventListener("click", () => {
  for (const field of document.querySelectorAll("input, textarea")) {
    field.value = "";
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
