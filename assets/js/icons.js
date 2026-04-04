class FaIcon extends HTMLElement {
  static faClass = "";

  connectedCallback() {
    const inButton = this.closest(".pf-v6-c-button__icon") !== null;
    const faClass = this.constructor.faClass || this.dataset.icon;
    const icon = document.createElement("i");
    icon.className = faClass;
    icon.setAttribute("aria-hidden", "true");

    if (inButton) {
      this.replaceChildren(icon);
    } else {
      this.style.display = "inline";
      this.style.whiteSpace = "nowrap";
      icon.classList.add("pf-v6-u-ml-xs");
      this.replaceChildren("\u2060", icon);
    }
  }
}

const icons = {
  "icon-discourse": "fa-brands fa-discourse",
  "icon-signal": "fa-brands fa-signal-messenger",
  "icon-mastodon": "fa-brands fa-mastodon",
  "icon-bluesky": "fa-brands fa-bluesky",
  "icon-linkedin": "fa-brands fa-linkedin",
  "icon-paypal": "fa-brands fa-paypal",
  "icon-github": "fa-brands fa-github",
  "icon-globe": "fa-solid fa-globe",
  "icon-external": "fa-solid fa-arrow-up-right-from-square",
  "icon-email": "fa-solid fa-envelope",
};

for (const [tag, cls] of Object.entries(icons)) {
  customElements.define(
    tag,
    class extends FaIcon {
      static faClass = cls;
    },
  );
}

customElements.define("icon-custom", FaIcon);
