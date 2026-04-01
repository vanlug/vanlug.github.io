export const formatEvent = (evt) => {
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

export const makeCoverImg = (coverUrl, alt) => {
  if (!coverUrl) return null;
  const img = document.createElement("img");
  img.src = coverUrl;
  img.alt = alt;
  img.style.cssText =
    "width: 4rem; height: 4rem; object-fit: cover; border-radius: var(--pf-t--global--border--radius--medium);";
  return img;
};