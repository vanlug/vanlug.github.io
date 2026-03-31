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

  const renderEventCard = (evt) => {
    const start = new Date(evt.start_at);
    const now = new Date();
    const days = Math.ceil((start - now) / 86400000);
    const relative =
      days <= 0
        ? "(today!)"
        : days === 1
          ? "(tomorrow)"
          : days < 7
            ? "(this week)"
            : days < 14
              ? "(next week)"
              : `(in ${Math.round(days / 7)} weeks)`;
    const time = start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const clone = eventTemplate.content.cloneNode(true);
    const $ = (s) => clone.querySelector(`[data-slot="${s}"]`);
    const cover = $("cover");
    if (evt.cover_url) {
      cover.src = evt.cover_url;
      cover.alt = evt.name || "Event cover";
    } else {
      cover.remove();
    }
    $("date").textContent = start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    $("relative").textContent = relative;
    $("name").textContent = evt.name || "VanLUG Meeting";
    $("detail").textContent = evt.location
      ? `${evt.location} \u00b7 ${time}`
      : time;
    const link = $("rsvp");
    link.href = evt.url
      ? `https://luma.com/${evt.url}`
      : "https://luma.com/vanlug";
    return clone;
  };

  customElements.define(
    "luma-next-event",
    class extends HTMLElement {
      connectedCallback() {
        const cal = this.getAttribute("calendar");
        const proxy = this.getAttribute("proxy");
        fetch(`${proxy}/next-event?calendar=${encodeURIComponent(cal)}`)
          .then((r) => r.json())
          .then(({ entries }) => {
            const evt = entries?.[0];
            if (!evt) {
              this.textContent =
                "No upcoming events right now. Check back soon!";
              return;
            }

            this.replaceChildren();
            this.append(renderEventCard(evt));
          })
          .catch(() => {
            this.textContent = "Could not load the next event. ";
            const a = document.createElement("a");
            a.href = "/events/";
            a.textContent = "See all events.";
            this.append(a);
          });
      }
    },
  );

  customElements.define(
    "luma-upcoming-events",
    class extends HTMLElement {
      connectedCallback() {
        const cal = this.getAttribute("calendar");
        const proxy = this.getAttribute("proxy");
        fetch(`${proxy}/events?calendar=${encodeURIComponent(cal)}`)
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
