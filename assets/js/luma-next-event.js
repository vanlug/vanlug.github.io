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
            <a data-slot="rsvp" target="_blank" rel="noopener"
              class="pf-v6-c-button pf-m-link pf-m-inline">
              <span class="pf-v6-c-button__text">RSVP on Luma</span>
              <span class="pf-v6-c-button__icon pf-m-end"><icon-external></icon-external></span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>`;

const renderEventCard = (evt) => {
  const { name, date, time, relative, lumaUrl, location, coverUrl } =
    formatEvent(evt);
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
  return clone;
};

customElements.define(
  "luma-next-event",
  class extends HTMLElement {
    async connectedCallback() {
      const cal = this.getAttribute("calendar");
      const proxy = this.getAttribute("proxy");
      try {
        const { entries } = await fetch(
          `${proxy}/next-event?calendar=${encodeURIComponent(cal)}`,
        ).then((r) => r.json());
        const evt = entries?.[0];
        if (!evt) {
          this.textContent = "No upcoming events right now. Check back soon!";
          return;
        }
        this.replaceChildren(renderEventCard(evt));
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
