document.querySelectorAll("form[data-confirm]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    if (!window.confirm(form.dataset.confirm)) event.preventDefault();
  });
});

// Signup: only show the landlord code field when "Landlord" is picked
const roleSelect = document.querySelector('select[name="role"]');
const landlordField = document.getElementById("landlord-code-field");

if (roleSelect && landlordField) {
  const syncLandlordField = () => {
    landlordField.hidden = roleSelect.value !== "landlord";
  };
  roleSelect.addEventListener("change", syncLandlordField);
  syncLandlordField();
}

// Dashboard: apply the urgency filter as soon as it changes (no Apply click needed)
document.querySelectorAll("select[data-autosubmit]").forEach((select) => {
  select.addEventListener("change", () => select.form.requestSubmit());
  select.form.querySelector(".js-hide")?.setAttribute("hidden", "");
});
