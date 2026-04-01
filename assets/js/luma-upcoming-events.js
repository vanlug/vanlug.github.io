import { formatEvent, makeCoverImg } from "./events.js";

const rowTemplate = document.createElement("template");
rowTemplate.innerHTML = `
  <tr class="pf-v6-c-table__tr" role="row">
    <td class="pf-v6-c-table__td pf-v6-u-display-none pf-v6-u-display-table-cell-on-md" role="cell" style="vertical-align: middle;" data-slot="cover-desktop"></td>
    <td class="pf-v6-c-table__td" role="cell" style="vertical-align: middle;">
      <div class="pf-v6-l-flex pf-m-gap-md pf-m-align-items-center">
        <span class="pf-v6-u-display-inline-block pf-v6-u-display-none-on-md" data-slot="cover-mobile"></span>
        <div>
          <div class="pf-v6-u-font-weight-bold pf-v6-u-display-block pf-v6-u-display-none-on-md" data-slot="name-mobile"></div>
          <div><span data-slot="date"></span> <span class="pf-v6-u-font-size-xs" data-slot="relative"></span></div>
          <small class="pf-v6-u-text-color-subtle" data-slot="time"></small>
        </div>
      </div>
    </td>
    <td class="pf-v6-c-table__td pf-v6-u-display-none pf-v6-u-display-table-cell-on-md" role="cell" style="vertical-align: middle;" data-slot="name-desktop"></td>
    <td class="pf-v6-c-table__td" role="cell" style="vertical-align: middle;" data-slot="location"></td>
    <td class="pf-v6-c-table__td" role="cell" style="vertical-align: middle;">
      <a data-slot="rsvp" target="_blank" rel="noopener" class="pf-v6-c-button pf-m-link pf-m-inline pf-m-small">
        RSVP<span class="pf-v6-c-button__icon pf-m-end"><icon-external></icon-external></span>
      </a>
    </td>
  </tr>`;

const renderEventRow = (evt) => {
  const { name, date, time, relative, lumaUrl, location, coverUrl } =
    formatEvent(evt);
  const clone = rowTemplate.content.cloneNode(true);
  const $ = (s) => clone.querySelector(`[data-slot="${s}"]`);

  const desktopCover = makeCoverImg(coverUrl, name);
  if (desktopCover) $("cover-desktop").append(desktopCover);

  const mobileCover = makeCoverImg(coverUrl, name);
  if (mobileCover) $("cover-mobile").append(mobileCover);

  $("name-mobile").textContent = name;
  $("date").textContent = date;
  $("relative").textContent = relative;
  $("time").textContent = time;
  $("name-desktop").textContent = name;
  $("location").textContent = location;
  $("rsvp").href = lumaUrl;

  return clone;
};

customElements.define(
  "luma-upcoming-events",
  class extends HTMLElement {
    async connectedCallback() {
      const cal = this.getAttribute("calendar");
      const api = this.getAttribute("api");
      try {
        const { entries } = await fetch(
          `${api}/events?calendar=${encodeURIComponent(cal)}`,
        ).then((r) => r.json());
        if (!entries?.length) {
          this.textContent = "No upcoming events right now. Check back soon!";
          return;
        }

        const table = document.createElement("table");
        table.className = "pf-v6-c-table pf-m-grid-md pf-m-compact";
        table.setAttribute("role", "grid");
        table.setAttribute("aria-label", "Upcoming events");

        const thead = document.createElement("thead");
        thead.className = "pf-v6-c-table__thead";
        const headRow = document.createElement("tr");
        headRow.className = "pf-v6-c-table__tr";
        headRow.setAttribute("role", "row");
        for (const label of ["", "Date", "Event", "Location", ""]) {
          const th = document.createElement("th");
          th.className = "pf-v6-c-table__th";
          th.setAttribute("role", "columnheader");
          th.setAttribute("scope", "col");
          th.textContent = label;
          headRow.append(th);
        }
        thead.append(headRow);
        table.append(thead);

        const tbody = document.createElement("tbody");
        tbody.className = "pf-v6-c-table__tbody";
        tbody.setAttribute("role", "rowgroup");
        for (const evt of entries) {
          tbody.append(renderEventRow(evt));
        }
        table.append(tbody);

        this.replaceChildren(table);
      } catch {
        this.textContent = "Could not load upcoming events. ";
        const a = document.createElement("a");
        a.href = "https://luma.com/vanlug";
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "View on Luma instead.";
        this.append(a);
      }
    }
  },
);
