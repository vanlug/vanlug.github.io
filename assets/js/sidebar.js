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
