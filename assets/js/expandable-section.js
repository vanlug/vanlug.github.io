for (const section of document.querySelectorAll(
  ".pf-v6-c-expandable-section",
)) {
  const toggle = section.querySelector(
    ".pf-v6-c-expandable-section__toggle button",
  );
  const content = section.querySelector(".pf-v6-c-expandable-section__content");
  const textEl = toggle.querySelector(".pf-v6-c-button__text");

  // Invert the default visibility if JS is available and add corresponding ARIA tags
  // If no JS is available, everything is visible and the ARIA attributes aren't necessary
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", toggle.dataset.controls);
  content.setAttribute("role", "region");
  content.setAttribute("aria-labelledby", toggle.id);

  content.hidden = true;

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    const nowExpanded = !expanded;
    toggle.setAttribute("aria-expanded", nowExpanded);
    content.hidden = !nowExpanded;
    section.classList.toggle("pf-m-expanded", nowExpanded);

    if (textEl) {
      const key = nowExpanded ? "textExpanded" : "textCollapsed";
      const newText = toggle.dataset[key];
      if (newText) textEl.textContent = newText;
    }
  });
}
