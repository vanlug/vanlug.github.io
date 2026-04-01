import { formatEvent } from "./events.js";

const eventTemplate = document.getElementById("next-event-template");

const renderEventCard = (evt) => {
  const { name, date, time, relative, lumaUrl, location, coverUrl } =
    formatEvent(evt);
  const clone = eventTemplate.content.cloneNode(true);
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
