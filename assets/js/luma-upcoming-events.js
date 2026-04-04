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
      <div class="pf-v6-l-flex pf-m-gap-sm">
        <button data-slot="details" type="button" class="pf-v6-c-button pf-m-control pf-m-small">
          Details
        </button>
        <a data-slot="rsvp" target="_blank" rel="noopener" class="pf-v6-c-button pf-m-link pf-m-inline pf-m-small">
          RSVP<span class="pf-v6-c-button__icon pf-m-end"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></span>
        </a>
      </div>
    </td>
  </tr>`;

const renderEventRow = (evt, api) => {
  const { apiId, name, date, time, relative, lumaUrl, location, coverUrl } =
    formatEvent(evt, api);
  const clone = rowTemplate.content.cloneNode(true);
  const $ = (s) => clone.querySelector(`[data-slot="${s}"]`);

  const desktopCover = makeCoverImg(coverUrl, name);
  desktopCover && $("cover-desktop").append(desktopCover);

  const mobileCover = makeCoverImg(coverUrl, name);
  mobileCover && $("cover-mobile").append(mobileCover);

  $("name-mobile").textContent = name;
  $("date").textContent = date;
  $("relative").textContent = relative;
  $("time").textContent = time;
  $("name-desktop").textContent = name;
  $("location").textContent = location;
  $("rsvp").href = lumaUrl;
  $("details").addEventListener("click", () =>
    document.querySelector("event-detail-modal").open(apiId, api),
  );

  clone.querySelector("tr").dataset.eventName = name;

  return clone;
};

const makeEmptyState = (html) => {
  const el = document.createElement("div");
  el.className = "pf-v6-c-empty-state pf-m-xs";
  el.innerHTML = `
    <div class="pf-v6-c-empty-state__content">
      <div class="pf-v6-c-empty-state__header">
        <div class="pf-v6-c-empty-state__icon pf-v6-u-font-size-xl pf-v6-u-mb-sm">
          <i class="fas fa-calendar" aria-hidden="true"></i>
        </div>
        <div class="pf-v6-c-empty-state__title">
          <p class="pf-v6-c-empty-state__title-text pf-v6-u-font-size-sm">${html}</p>
        </div>
      </div>
    </div>`;
  return el;
};

customElements.define(
  "luma-upcoming-events",
  class extends HTMLElement {
    async connectedCallback() {
      const cal = this.getAttribute("calendar");
      const api = this.getAttribute("api");
      const lumaUrl = this.getAttribute("luma") ?? "https://luma.com/vanlug";
      const rssUrl = `${api}/events/feed?calendar=${encodeURIComponent(cal)}`;
      const subscribeLinks = `<br>Stay updated via <a href="${lumaUrl}" target="_blank" rel="noopener">Luma<span style="display: inline; white-space: nowrap;">&#8288;<i class="fa-solid fa-arrow-up-right-from-square pf-v6-u-ml-xs" aria-hidden="true"></i></span></a> or <a href="${rssUrl}" target="_blank" rel="noopener">RSS<span style="display: inline; white-space: nowrap;">&#8288;<i class="fa-solid fa-rss pf-v6-u-ml-xs" aria-hidden="true"></i></span></a>.`;

      try {
        const { entries } = await fetch(
          `${api}/events?calendar=${encodeURIComponent(cal)}`,
        ).then((r) => r.json());

        if (!entries?.length) {
          this.replaceChildren(
            makeEmptyState(`No upcoming events right now.${subscribeLinks}`),
          );
          return;
        }

        const table = Object.assign(document.createElement("table"), {
          className: "pf-v6-c-table pf-m-grid-md pf-m-compact",
        });
        table.setAttribute("role", "grid");
        table.setAttribute("aria-label", "Upcoming events");

        const thead = Object.assign(document.createElement("thead"), {
          className: "pf-v6-c-table__thead",
        });
        const headRow = Object.assign(document.createElement("tr"), {
          className: "pf-v6-c-table__tr",
        });
        headRow.setAttribute("role", "row");
        for (const label of ["", "Date", "Event", "Location", ""]) {
          const th = Object.assign(document.createElement("th"), {
            className: "pf-v6-c-table__th",
            textContent: label,
          });
          th.setAttribute("role", "columnheader");
          th.setAttribute("scope", "col");
          headRow.append(th);
        }
        thead.append(headRow);
        table.append(thead);

        const tbody = Object.assign(document.createElement("tbody"), {
          className: "pf-v6-c-table__tbody",
        });
        tbody.setAttribute("role", "rowgroup");
        for (const evt of entries) tbody.append(renderEventRow(evt, api));
        table.append(tbody);

        const emptyState = makeEmptyState("");
        emptyState.style.display = "none";
        const emptyText = emptyState.querySelector(
          ".pf-v6-c-empty-state__title-text",
        );

        this.replaceChildren(table, emptyState);

        const tabsEl = document.getElementById("event-type-tabs");
        if (!tabsEl) return;

        const tabs = tabsEl.querySelectorAll(".pf-v6-c-tabs__link");
        const rows = () =>
          table.querySelectorAll("tbody tr[data-event-name]");

        const activate = (tab) => {
          for (const t of tabs) {
            const isCurrent = t === tab;
            t.setAttribute("aria-selected", isCurrent);
            t.closest(".pf-v6-c-tabs__item").classList.toggle(
              "pf-m-current",
              isCurrent,
            );
            document.getElementById(
              t.getAttribute("aria-controls"),
            ).hidden = !isCurrent;
          }

          const activePanel = document.getElementById(
            tab.getAttribute("aria-controls"),
          );
          let body = activePanel.querySelector(".pf-v6-c-tab-content__body");
          if (!body) {
            body = Object.assign(document.createElement("div"), {
              className: "pf-v6-c-tab-content__body",
            });
            activePanel.append(body);
          }
          body.append(table, emptyState);

          const regex = tab.dataset.regex;
          let visibleCount = 0;
          for (const row of rows()) {
            const visible =
              !regex || new RegExp(regex, "i").test(row.dataset.eventName);
            row.style.display = visible ? "" : "none";
            if (visible) visibleCount++;
          }

          if (visibleCount === 0) {
            emptyText.innerHTML =
              (tab.dataset.empty ?? "No upcoming events right now.") +
              subscribeLinks;
            table.style.display = "none";
            emptyState.style.display = "";
          } else {
            table.style.display = "";
            emptyState.style.display = "none";
          }
        };

        activate(
          tabsEl.querySelector(".pf-v6-c-tabs__link[aria-selected='true']"),
        );

        tabsEl.addEventListener("click", (e) => {
          const tab = e.target.closest(".pf-v6-c-tabs__link");
          if (tab) activate(tab);
        });

        tabsEl.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          const tab = e.target.closest(".pf-v6-c-tabs__link");
          if (!tab) return;
          e.preventDefault();
          activate(tab);
        });
      } catch {
        this.replaceChildren();
        const a = Object.assign(document.createElement("a"), {
          href: "https://luma.com/vanlug",
          target: "_blank",
          rel: "noopener",
          textContent: "View on Luma instead.",
        });
        this.append("Could not load upcoming events. ", a);
      }
    }
  },
);
