{
  const applyTheme = () =>
    document.documentElement.classList.toggle(
      "pf-v6-theme-dark",
      matchMedia("(prefers-color-scheme: dark)").matches,
    );
  applyTheme();
  matchMedia("(prefers-color-scheme: dark)").addEventListener(
    "change",
    applyTheme,
  );

  const sidebar = document.getElementById("page-sidebar");
  const toggle = document.getElementById("nav-toggle");
  const xlBreakpoint = matchMedia("(min-width: 75rem)");

  const setSidebarState = (expanded) => {
    sidebar.classList.toggle("pf-m-expanded", expanded);
    sidebar.classList.toggle("pf-m-collapsed", !expanded);
    toggle.setAttribute("aria-expanded", expanded);
  };

  toggle.addEventListener("click", () =>
    setSidebarState(!sidebar.classList.contains("pf-m-expanded")),
  );

  xlBreakpoint.addEventListener("change", (e) => setSidebarState(e.matches));
  setSidebarState(xlBreakpoint.matches);

  for (const link of sidebar.querySelectorAll(".pf-v6-c-nav__link")) {
    link.addEventListener("click", () => {
      if (!xlBreakpoint.matches) setSidebarState(false);
    });
  }

  {
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
  }

  const eventTemplate = document.getElementById("next-event-template");

  const formatEvent = (evt) => {
    const start = new Date(evt.start_at);
    const days = Math.ceil((start - new Date()) / 86400000);
    return {
      name: evt.name || "VanLUG Meeting",
      date: start.toLocaleDateString("en-CA", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      time: start.toLocaleTimeString("en-CA", {
        hour: "numeric",
        minute: "2-digit",
      }),
      relative:
        days <= 0
          ? "(today!)"
          : days === 1
            ? "(tomorrow)"
            : days < 7
              ? "(this week)"
              : days < 14
                ? "(next week)"
                : `(in ${Math.round(days / 7)} weeks)`,
      lumaUrl: evt.url
        ? `https://luma.com/${encodeURI(evt.url)}`
        : "https://luma.com/vanlug",
      location: evt.location || "",
      coverUrl: evt.cover_url,
    };
  };

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

  const makeCoverImg = (coverUrl, alt) => {
    if (!coverUrl) return null;
    const img = document.createElement("img");
    img.src = coverUrl;
    img.alt = alt;
    img.style.cssText =
      "width: 4rem; height: 4rem; object-fit: cover; border-radius: var(--pf-t--global--border--radius--medium);";
    return img;
  };

  const makeCell = (className, ...children) => {
    const td = document.createElement("td");
    td.className = className;
    td.setAttribute("role", "cell");
    td.style.verticalAlign = "middle";
    for (const child of children) {
      if (child) td.append(child);
    }
    return td;
  };

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
            this.textContent =
              "No upcoming events right now. Check back soon!";
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
            this.textContent =
              "No upcoming events right now. Check back soon!";
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
          .then((r) => r.json())
          .then(({ entries }) => {
            if (!entries || entries.length === 0) {
              this.textContent =
                "No upcoming events right now. Check back soon!";
              return;
            }

            this.replaceChildren();
            const container = document.createElement("div");
            container.className = "pf-v6-l-flex pf-m-column pf-m-gap-md";

            for (const evt of entries) {
              container.appendChild(renderEventCard(evt));
            }

            this.appendChild(container);
          })
          .catch(() => {
            this.textContent = "Could not load upcoming events. ";
            const a = document.createElement("a");
            a.href = "https://luma.com/vanlug";
            a.target = "_blank";
            a.rel = "noopener";
            a.textContent = "View on Luma instead.";
            this.append(a);
          });
      }
    },
  );
}
