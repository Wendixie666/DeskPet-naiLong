const card = document.querySelector<HTMLElement>("#reminder-card")!;
const text = document.querySelector<HTMLElement>("#reminder-text")!;

window.desktopReminderOverlay.onShow((todoText) => {
  text.textContent = `你「${todoText}」了吗？`;
  card.hidden = false;
});
window.desktopReminderOverlay.onHide(() => {
  card.hidden = true;
});
card.addEventListener("click", () => window.desktopReminderOverlay.click());
card.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    window.desktopReminderOverlay.click();
  }
});
card.hidden = true;
