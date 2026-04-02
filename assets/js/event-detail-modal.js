import DOMPurify from "dompurify";
import { proxyImageUrl } from "./events.js";

const backdropClass = "pf-v6-c-backdrop";

const modalTemplate = document.createElement("template");
modalTemplate.innerHTML = `
  <div class="${backdropClass}" style="display: none;">
    <div class="pf-v6-l-bullseye">
    <div class="pf-v6-c-modal-box pf-m-md" role="dialog" aria-modal="true"
         aria-labelledby="event-detail-title" aria-describedby="event-detail-body">
      <div class="pf-v6-c-modal-box__close">
        <button class="pf-v6-c-button pf-m-plain" type="button" aria-label="Close" data-slot="close">
          <span class="pf-v6-c-button__icon">
            <i class="fas fa-times" aria-hidden="true"></i>
          </span>
        </button>
      </div>
      <header class="pf-v6-c-modal-box__header">
        <div class="pf-v6-c-modal-box__header-main">
          <h1 class="pf-v6-c-modal-box__title" id="event-detail-title" data-slot="title"></h1>
        </div>
      </header>
      <div class="pf-v6-c-modal-box__body" id="event-detail-body" tabindex="0" data-slot="body">
        <div data-slot="content">
          <div class="pf-v6-c-skeleton pf-v6-u-mb-md" style="--pf-v6-c-skeleton--Height: 10rem; border-radius: var(--pf-t--global--border--radius--medium);"></div>
          <div class="pf-v6-c-skeleton pf-m-text-sm pf-m-width-75 pf-v6-u-mb-sm"></div>
          <div class="pf-v6-c-skeleton pf-m-text-sm pf-m-width-50 pf-v6-u-mb-sm"></div>
          <div class="pf-v6-c-skeleton pf-m-text-sm pf-m-width-75 pf-v6-u-mb-sm"></div>
          <div class="pf-v6-c-skeleton pf-m-text-sm pf-m-width-50 pf-v6-u-mb-md"></div>
          <div class="pf-v6-c-skeleton pf-m-text-sm pf-v6-u-mb-sm"></div>
          <div class="pf-v6-c-skeleton pf-m-text-sm pf-m-width-75 pf-v6-u-mb-sm"></div>
          <div class="pf-v6-c-skeleton pf-m-text-sm pf-m-width-50"></div>
        </div>
      </div>
      <footer class="pf-v6-c-modal-box__footer">
        <a data-slot="rsvp" target="_blank" rel="noopener"
           class="pf-v6-c-button pf-m-primary">RSVP on Luma</a>
        <button data-slot="cancel" type="button"
                class="pf-v6-c-button pf-m-link">Close</button>
      </footer>
    </div>
    </div>
  </div>`;

const detailTemplate = document.createElement("template");
detailTemplate.innerHTML = `
  <div>
    <img data-slot="cover" alt="" style="width: 100%; max-height: 16rem; object-fit: cover;
         border-radius: var(--pf-t--global--border--radius--medium); margin-bottom: 1rem;" />
    <div class="pf-v6-c-description-list pf-m-horizontal pf-m-compact">
      <div class="pf-v6-c-description-list__group" data-slot="date-group">
        <dt class="pf-v6-c-description-list__term"><span class="pf-v6-c-description-list__text">Date</span></dt>
        <dd class="pf-v6-c-description-list__description"><div class="pf-v6-c-description-list__text" data-slot="date"></div></dd>
      </div>
      <div class="pf-v6-c-description-list__group" data-slot="time-group">
        <dt class="pf-v6-c-description-list__term"><span class="pf-v6-c-description-list__text">Time</span></dt>
        <dd class="pf-v6-c-description-list__description"><div class="pf-v6-c-description-list__text" data-slot="time"></div></dd>
      </div>
      <div class="pf-v6-c-description-list__group" data-slot="venue-group">
        <dt class="pf-v6-c-description-list__term"><span class="pf-v6-c-description-list__text">Venue</span></dt>
        <dd class="pf-v6-c-description-list__description"><div class="pf-v6-c-description-list__text"><span data-slot="venue"></span><br data-slot="map-br" /><span data-slot="map-link"></span></div></dd>
      </div>
      <div class="pf-v6-c-description-list__group" data-slot="hosts-group">
        <dt class="pf-v6-c-description-list__term"><span class="pf-v6-c-description-list__text">Hosted by</span></dt>
        <dd class="pf-v6-c-description-list__description"><div class="pf-v6-c-description-list__text" data-slot="hosts"></div></dd>
      </div>
      <div class="pf-v6-c-description-list__group" data-slot="admission-group">
        <dt class="pf-v6-c-description-list__term"><span class="pf-v6-c-description-list__text">Admission</span></dt>
        <dd class="pf-v6-c-description-list__description"><div class="pf-v6-c-description-list__text" data-slot="admission"></div></dd>
      </div>
    </div>
    <hr class="pf-v6-u-mt-md pf-v6-u-mb-md" data-slot="desc-divider" />
    <div class="pf-v6-c-content" data-slot="description"></div>
  </div>`;

customElements.define(
  "event-detail-modal",
  class extends HTMLElement {
    connectedCallback() {
      this.append(modalTemplate.content.cloneNode(true));
      this._backdrop = this.querySelector(`.${backdropClass}`);
      this._$ = (s) => this.querySelector(`[data-slot="${s}"]`);

      this._$("close").addEventListener("click", () => this.close());
      this._$("cancel").addEventListener("click", () => this.close());
      this._backdrop.addEventListener("click", (e) => {
        if (e.target === this._backdrop) this.close();
      });
      this._keyHandler = (e) => {
        if (e.key === "Escape") this.close();
      };
    }

    async open(eventApiId, api) {
      this._backdrop.style.display = "";
      document.documentElement.style.overflow = "hidden";
      document.addEventListener("keydown", this._keyHandler);

      this._$("title").innerHTML = '<div class="pf-v6-c-skeleton pf-m-text-lg pf-m-width-50"></div>';
      const content = this._$("content");
      content.innerHTML = `
        <div class="pf-v6-c-skeleton pf-v6-u-mb-md" style="--pf-v6-c-skeleton--Height: 10rem; border-radius: var(--pf-t--global--border--radius--medium);"></div>
        <div class="pf-v6-c-skeleton pf-m-text-sm pf-m-width-75 pf-v6-u-mb-sm"></div>
        <div class="pf-v6-c-skeleton pf-m-text-sm pf-m-width-50 pf-v6-u-mb-sm"></div>
        <div class="pf-v6-c-skeleton pf-m-text-sm pf-m-width-75 pf-v6-u-mb-sm"></div>
        <div class="pf-v6-c-skeleton pf-m-text-sm pf-m-width-50 pf-v6-u-mb-md"></div>
        <div class="pf-v6-c-skeleton pf-m-text-sm pf-v6-u-mb-sm"></div>
        <div class="pf-v6-c-skeleton pf-m-text-sm pf-m-width-75 pf-v6-u-mb-sm"></div>
        <div class="pf-v6-c-skeleton pf-m-text-sm pf-m-width-50"></div>`;
      this._$("rsvp").style.display = "none";

      try {
        const data = await fetch(
          `${api}/events/detail?event_api_id=${encodeURIComponent(eventApiId)}`,
        ).then((r) => r.json());

        this._$("title").textContent = data.name;
        this._$("rsvp").href = data.link;
        this._$("rsvp").style.display = "";

        const detail = detailTemplate.content.cloneNode(true);
        const $ = (s) => detail.querySelector(`[data-slot="${s}"]`);

        const cover = $("cover");
        if (data.cover_url) {
          cover.src = proxyImageUrl(data.cover_url, api);
          cover.alt = data.name;
        } else {
          cover.remove();
        }

        const start = new Date(data.start_at);
        const dateOpts = {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: data.timezone || undefined,
        };
        $("date").textContent = start.toLocaleDateString(undefined, dateOpts);

        const timeOpts = {
          hour: "numeric",
          minute: "2-digit",
          timeZone: data.timezone || undefined,
          timeZoneName: data.timezone ? "short" : undefined,
        };
        let timeText = start.toLocaleTimeString(undefined, timeOpts);
        if (data.end_at) {
          const end = new Date(data.end_at);
          timeText += " – " + end.toLocaleTimeString(undefined, timeOpts);
        }
        $("time").textContent = timeText;

        if (data.location) {
          const venueText = data.full_address
            ? `${data.location} — ${data.full_address}`
            : data.location;
          $("venue").textContent = venueText;

          if (data.map_url) {
            const mapLink = document.createElement("a");
            mapLink.href = data.map_url;
            mapLink.target = "_blank";
            mapLink.rel = "noopener";
            mapLink.className = "pf-v6-c-button pf-m-link pf-m-inline pf-m-small";
            mapLink.innerHTML =
              'View on map <span class="pf-v6-c-button__icon pf-m-end"><icon-external></icon-external></span>';
            $("map-link").append(mapLink);
          } else {
            $("map-br").remove();
            $("map-link").remove();
          }
        } else {
          $("venue-group").remove();
        }

        if (data.hosts) {
          $("hosts").textContent = data.hosts;
        } else {
          $("hosts-group").remove();
        }

        if (data.admission) {
          $("admission").textContent = data.admission;
        } else {
          $("admission-group").remove();
        }

        if (data.description) {
          $("description").innerHTML = DOMPurify.sanitize(data.description);
        } else {
          $("desc-divider").remove();
          $("description").remove();
        }

        content.replaceChildren(detail);
      } catch {
        content.innerHTML =
          "<p>Could not load event details. Please try again later.</p>";
      }
    }

    close() {
      this._backdrop.style.display = "none";
      document.documentElement.style.overflow = "";
      document.removeEventListener("keydown", this._keyHandler);
    }
  },
);
