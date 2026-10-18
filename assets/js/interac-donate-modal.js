const modalTemplate = document.createElement("template");
modalTemplate.innerHTML = `
  <dialog class="pf-v6-c-modal-box pf-m-md" closedby="any"
          aria-labelledby="interac-donate-title">
    <form method="dialog" class="pf-v6-c-modal-box__close">
      <button class="pf-v6-c-button pf-m-plain" type="submit" aria-label="Close" autofocus>
        <span class="pf-v6-c-button__icon">
          <i class="fas fa-times" aria-hidden="true"></i>
        </span>
      </button>
    </form>
    <header class="pf-v6-c-modal-box__header">
      <div class="pf-v6-c-modal-box__header-main">
        <h1 class="pf-v6-c-modal-box__title" id="interac-donate-title" data-slot="title"></h1>
      </div>
    </header>
    <div class="pf-v6-c-modal-box__body" data-slot="body"></div>
    <footer class="pf-v6-c-modal-box__footer">
      <form method="dialog">
        <button type="submit" class="pf-v6-c-button pf-m-secondary">Close</button>
      </form>
    </footer>
  </dialog>`;

customElements.define(
  "interac-donate-modal",
  class extends HTMLElement {
    connectedCallback() {
      const content = [...this.childNodes];
      this.append(modalTemplate.content.cloneNode(true));

      this._dialog = this.querySelector("dialog");
      this._$ = (s) => this.querySelector(`[data-slot="${s}"]`);

      this._$("title").textContent = this.getAttribute("title") ?? "";
      this._$("body").append(...content);

      this._email = this.querySelector("[data-interac-email]");
      this._copyButton = this.querySelector("[data-interac-copy]");
      this._copyLabel = this._copyButton.querySelector(
        ".pf-v6-c-button__text",
      );
      this._label = this._copyLabel.textContent;
      this._copiedLabel = this._copyButton.dataset.interacCopiedLabel;
      this._status = this.querySelector("[data-interac-status]");

      this._copyButton.addEventListener("click", () => this._copy());
    }

    open() {
      clearTimeout(this._timer);
      this._copyLabel.textContent = this._label;
      this._status.textContent = "";

      if (!this._dialog.open) this._dialog.showModal();
    }

    async _copy() {
      try {
        await navigator.clipboard.writeText(this._email.textContent.trim());
        this._copyLabel.textContent = this._copiedLabel;
        this._status.textContent = "Recipient address copied to the clipboard.";
        clearTimeout(this._timer);
        this._timer = setTimeout(() => {
          this._copyLabel.textContent = this._label;
          this._status.textContent = "";
        }, 2000);
      } catch {
        this._status.textContent =
          "Could not copy the address. Select the address and copy it.";
      }
    }
  },
);

for (const trigger of document.querySelectorAll(
  "[data-interac-donate-open]",
)) {
  trigger.addEventListener("click", () => {
    document.querySelector("interac-donate-modal").open();
  });
}
