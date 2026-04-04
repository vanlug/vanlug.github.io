import { formatEvent } from "./events.js";

const template = document.createElement("template");
template.innerHTML = `
  <div class="pf-v6-c-card pf-m-compact pf-m-flat">
    <div class="pf-v6-c-card__header">
      <div class="pf-v6-c-card__header-main">
        <div class="pf-v6-l-flex pf-m-gap-lg pf-m-align-items-center pf-m-nowrap">
          <div class="pf-v6-l-flex pf-m-gap-lg pf-m-align-items-center pf-m-justify-content-center">
            <img data-slot="cover" alt=""
              style="width: 4rem; height: 4rem; object-fit: cover;
                     border-radius: var(--pf-t--global--border--radius--medium); flex-shrink: 0;" />
            <div class="pf-v6-l-flex pf-m-column pf-m-align-items-center pf-m-gap-xs">
              <span class="pf-v6-c-label pf-m-green pf-m-outline">
                <span class="pf-v6-c-label__content">
                  <span class="pf-v6-c-label__text" data-slot="date"></span>
                </span>
              </span>
              <span class="pf-v6-u-font-size-xs" data-slot="relative"></span>
            </div>
          </div>
          <div class="pf-v6-l-flex pf-m-column pf-m-gap-sm">
            <div class="pf-v6-c-content">
              <h4 data-slot="name"></h4>
              <p><small data-slot="detail"></small></p>
            </div>
            <div class="pf-v6-l-flex pf-m-gap-sm pf-m-align-items-center">
              <button data-slot="details" type="button"
                class="pf-v6-c-button pf-m-control pf-m-small">
                <span class="pf-v6-c-button__text">View details</span>
              </button>
              <span class="pf-v6-u-text-color-subtle pf-v6-u-font-size-sm">or</span>
              <a data-slot="rsvp" target="_blank" rel="noopener"
                class="pf-v6-c-button pf-m-link pf-m-inline">
                <span class="pf-v6-c-button__text">RSVP on Luma</span>
                <span class="pf-v6-c-button__icon pf-m-end"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

const renderEventCard = (evt, api) => {
  const { apiId, name, date, time, relative, lumaUrl, location, coverUrl } =
    formatEvent(evt, api);
  const clone = template.content.cloneNode(true);
  const $ = (s) => clone.querySelector(`[data-slot="${s}"]`);
  const cover = $("cover");
  if (coverUrl) {
    cover.src = coverUrl;
    cover.alt = name;
  } else {
    cover.remove();
  }
  $("date").textContent = date;
  $("relative").textContent = relative;
  $("name").textContent = name;
  $("detail").textContent = location ? `${location} \u00b7 ${time}` : time;
  $("rsvp").href = lumaUrl;
  $("details").addEventListener("click", () => {
    document.querySelector("event-detail-modal").open(apiId, api);
  });
  return clone;
};

customElements.define(
  "luma-next-event",
  class extends HTMLElement {
    async connectedCallback() {
      const cal = this.getAttribute("calendar");
      const api = this.getAttribute("api");
      try {
        const { entries } = await fetch(
          `${api}/next-event?calendar=${encodeURIComponent(cal)}`,
        ).then((r) => r.json());
        const evt = entries?.[0];
        if (!evt) {
          this.textContent = "No upcoming events right now. Check back soon!";
          return;
        }
        this.replaceChildren(renderEventCard(evt, api));
      } catch {
        this.textContent = "Could not load the next event. ";
        const a = document.createElement("a");
        a.href = "/events/";
        a.textContent = "See all events.";
        this.append(a);
      }
    }
  },
);
