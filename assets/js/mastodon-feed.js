import DOMPurify from "dompurify";

const tootTemplate = document.createElement("template");
tootTemplate.innerHTML = `
  <a target="_blank" rel="noopener" style="text-decoration: none;">
    <div class="pf-v6-c-content pf-v6-u-font-size-sm" data-slot="body"></div>
    <div data-slot="media"></div>
    <div class="pf-v6-l-flex pf-m-gap-sm pf-m-align-items-center pf-v6-u-font-size-xs pf-v6-u-text-color-subtle">
      <img data-slot="avatar" style="width: 1rem; height: 1rem; border-radius: 50%;" />
      <span data-slot="timestamp"></span>
      <span data-slot="stats"></span>
    </div>
  </a>`;

const renderToot = (toot, data, { isFirst, isLast, inDrawer, profile }) => {
  const clone = tootTemplate.content.cloneNode(true);
  const $ = (s) => clone.querySelector(`[data-slot="${s}"]`);
  const item = clone.querySelector("a");

  item.href = toot.url || profile;
  item.className = [
    "pf-v6-l-flex pf-m-column pf-m-gap-xs pf-v6-u-pt-sm pf-v6-u-text-color-regular",
    isLast ? "pf-v6-u-pb-0" : "pf-v6-u-pb-sm",
    inDrawer ? "pf-v6-u-px-md" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!isFirst) {
    item.style.borderTop =
      "var(--pf-t--global--border--width--divider--default) solid var(--pf-t--global--border--color--default)";
  }

  const body = $("body");
  body.innerHTML = DOMPurify.sanitize(toot.body); // In the future, we want to use https://developer.mozilla.org/en-US/docs/Web/API/Element/setHTML for this

  const mediaSlot = $("media");
  for (const m of toot.media?.slice(0, 1) ?? []) {
    const el = document.createElement(m.isVideo ? "video" : "img");
    el.src = m.url;
    if (m.isVideo) el.controls = true;
    else el.alt = m.altText || "";
    el.className = "pf-v6-u-w-100";
    el.style.maxHeight = "10rem";
    el.style.objectFit = "cover";
    el.style.borderRadius = "var(--pf-t--global--border--radius--medium)";
    mediaSlot.append(el);
  }
  if (!mediaSlot.children.length) mediaSlot.remove();

  const avatar = $("avatar");
  avatar.src = data.userProfilePictureURL;
  avatar.alt = data.userDisplayName;

  $("timestamp").textContent = new Date(toot.timestamp).toLocaleDateString(
    "en-CA",
    { month: "short", day: "numeric" },
  );

  const statsSlot = $("stats");
  for (const [icon, count] of [
    ["fa-heart", toot.favoritesCount],
    ["fa-retweet", toot.reblogsCount],
  ]) {
    if (count > 0) {
      const i = document.createElement("i");
      i.className = `fas ${icon}`;
      i.setAttribute("aria-hidden", "true");

      const stat = document.createElement("span");
      stat.className = "pf-v6-l-flex pf-m-align-items-center pf-m-gap-xs";
      stat.append(i, String(count));
      statsSlot.append(stat);
    }
  }
  if (!statsSlot.children.length) statsSlot.remove();

  return clone;
};

customElements.define(
  "mastodon-feed",
  class extends HTMLElement {
    async connectedCallback() {
      const username = this.getAttribute("username");
      const api = this.getAttribute("api");
      const profile = this.getAttribute("profile");
      try {
        const data = await fetch(
          `${api}/mastodon?username=${encodeURIComponent(username)}`,
        ).then((r) => r.json());
        if (!data.toots?.length) {
          this.textContent = "No posts yet.";
          return;
        }

        const inDrawer = this.closest(".pf-v6-c-drawer__panel") !== null;
        const container = document.createElement("div");
        container.className = "pf-v6-l-flex pf-m-column";

        for (const [i, toot] of data.toots.entries()) {
          container.append(
            renderToot(toot, data, {
              isFirst: i === 0,
              isLast: i === data.toots.length - 1,
              inDrawer,
              profile,
            }),
          );
        }

        this.replaceChildren(container);
      } catch {
        this.textContent = "Could not load feed. ";
        const a = document.createElement("a");
        a.href = profile;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "View on Mastodon.";
        this.append(a);
      }
    }
  },
);
