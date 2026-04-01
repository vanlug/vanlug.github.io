import { formatEvent, makeCoverImg, makeCell } from "./events.js";

const renderEventRow = (evt) => {
  const { name, date, time, relative, lumaUrl, location, coverUrl } =
    formatEvent(evt);

  const tr = document.createElement("tr");
  tr.className = "pf-v6-c-table__tr";
  tr.setAttribute("role", "row");

  tr.append(
    makeCell(
      "pf-v6-c-table__td pf-v6-u-display-none pf-v6-u-display-table-cell-on-md",
      makeCoverImg(coverUrl, name),
    ),
  );

  const mobileCover = document.createElement("span");
  mobileCover.className =
    "pf-v6-u-display-inline-block pf-v6-u-display-none-on-md";
  const mobileCoverImg = makeCoverImg(coverUrl, name);
  if (mobileCoverImg) mobileCover.append(mobileCoverImg);

  const mobileName = document.createElement("div");
  mobileName.className =
    "pf-v6-u-font-weight-bold pf-v6-u-display-block pf-v6-u-display-none-on-md";
  mobileName.textContent = name;

  const relativeSpan = document.createElement("span");
  relativeSpan.className = "pf-v6-u-font-size-xs";
  relativeSpan.textContent = relative;

  const dateLine = document.createElement("div");
  dateLine.append(`${date} `, relativeSpan);

  const timeLine = document.createElement("small");
  timeLine.className = "pf-v6-u-text-color-subtle";
  timeLine.textContent = time;

  const textBlock = document.createElement("div");
  textBlock.append(mobileName, dateLine, timeLine);

  const flex = document.createElement("div");
  flex.className = "pf-v6-l-flex pf-m-gap-md pf-m-align-items-center";
  flex.append(mobileCover, textBlock);

  tr.append(makeCell("pf-v6-c-table__td", flex));

  const nameCell = makeCell(
    "pf-v6-c-table__td pf-v6-u-display-none pf-v6-u-display-table-cell-on-md",
  );
  nameCell.textContent = name;
  tr.append(nameCell);

  const locCell = makeCell("pf-v6-c-table__td");
  locCell.textContent = location;
  tr.append(locCell);

  const rsvpLink = document.createElement("a");
  rsvpLink.href = lumaUrl;
  rsvpLink.target = "_blank";
  rsvpLink.rel = "noopener";
  rsvpLink.className = "pf-v6-c-button pf-m-link pf-m-inline pf-m-small";
  rsvpLink.append("RSVP", document.createElement("icon-external"));
  tr.append(makeCell("pf-v6-c-table__td", rsvpLink));

  return tr;
};

customElements.define(
  "luma-upcoming-events",
  class extends HTMLElement {
    async connectedCallback() {
      const cal = this.getAttribute("calendar");
      const proxy = this.getAttribute("proxy");
      try {
        const { entries } = await fetch(
          `${proxy}/events?calendar=${encodeURIComponent(cal)}`,
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
