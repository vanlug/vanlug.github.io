const inButton = (el) => el.closest(".pf-v6-c-button__icon") !== null;
const renderFaIcon = (el, faClasses) => {
  const i = `<i class="${faClasses}" aria-hidden="true"></i>`;
  if (inButton(el)) {
    el.innerHTML = i;
  } else {
    el.style.display = "inline";
    el.style.whiteSpace = "nowrap";
    el.innerHTML = "\u2060" + i;
    el.querySelector("i").classList.add("pf-v6-u-ml-xs");
  }
};
const brandIcons = {
  "icon-discourse": "fa-brands fa-discourse",
  "icon-signal": "fa-brands fa-signal-messenger",
  "icon-mastodon": "fa-brands fa-mastodon",
  "icon-bluesky": "fa-brands fa-bluesky",
  "icon-linkedin": "fa-brands fa-linkedin",
  "icon-paypal": "fa-brands fa-paypal",
};
for (const [tag, cls] of Object.entries(brandIcons)) {
  customElements.define(
    tag,
    class extends HTMLElement {
      connectedCallback() {
        renderFaIcon(this, cls);
      }
    },
  );
}
customElements.define(
  "icon-external",
  class extends HTMLElement {
    connectedCallback() {
      renderFaIcon(this, "fa-solid fa-arrow-up-right-from-square");
    }
  },
);
customElements.define(
  "icon-email",
  class extends HTMLElement {
    connectedCallback() {
      renderFaIcon(this, "fa-solid fa-envelope");
    }
  },
);
customElements.define(
  "icon-custom",
  class extends HTMLElement {
    connectedCallback() {
      renderFaIcon(this, this.dataset.icon);
    }
  },
);
