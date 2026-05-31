const state = {
  site: null,
  concerts: [],
  lang: localStorage.getItem("rls-lang") || "en"
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function getNested(obj, path) {
  return path.split(".").reduce((acc, key) => acc && acc[key], obj);
}

function t(path) {
  return getNested(state.site.i18n[state.lang], path) || getNested(state.site.i18n.en, path) || path;
}

function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem("rls-lang", lang);
  document.documentElement.lang = lang;
  document.title = state.site.i18n[lang].metaTitle;
  const meta = $('meta[name="description"]');
  if (meta) meta.setAttribute("content", state.site.i18n[lang].metaDescription);

  $$("[data-i18n]").forEach(el => {
    const value = t(el.dataset.i18n);
    if (value) el.textContent = value;
  });

  $$("[data-i18n-placeholder]").forEach(el => {
    const value = t(el.dataset.i18nPlaceholder);
    if (value) el.setAttribute("placeholder", value);
  });

  $$(".lang-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.lang === lang));
  renderDynamic();
}

function releaseKind(kind) {
  if (state.lang === "it") {
    if (kind === "album") return "Album";
    if (kind === "single") return "Singolo";
    if (kind === "featured") return "In evidenza";
  }
  if (kind === "album") return "Album";
  if (kind === "single") return "Single";
  if (kind === "featured") return "Featured";
  return kind;
}

function renderFeaturedTracks() {
  const wrap = $("#featured-tracks");
  if (!wrap) return;
  const tracks = state.site.releases.filter(r => r.highlight);
  wrap.innerHTML = tracks.map(track => `
    <article class="track">
      <img src="${track.artwork}" alt="${track.title} artwork" loading="lazy">
      <div>
        <h4>${track.title}</h4>
        <span>${[releaseKind(track.kind), track.year].filter(Boolean).join(" · ")}</span>
      </div>
      <a href="${state.site.links.bandcamp}" target="_blank" rel="noopener">Listen</a>
    </article>
  `).join("");
}

function releaseCard(rel) {
  return `
    <article class="release-card reveal">
      <img src="${rel.artwork}" alt="${rel.title} artwork" loading="lazy">
      <h4>${rel.title}</h4>
      <p>${releaseKind(rel.kind)}${rel.year ? ` · ${rel.year}` : ""}</p>
    </article>
  `;
}

function renderDiscography() {
  const albumGrid = $("#album-grid");
  const singlesGrid = $("#singles-grid");
  if (albumGrid) {
    albumGrid.innerHTML = state.site.releases
      .filter(r => r.kind === "album")
      .map(releaseCard)
      .join("");
  }
  if (singlesGrid) {
    singlesGrid.innerHTML = state.site.releases
      .filter(r => r.kind === "single")
      .map(releaseCard)
      .join("");
  }
}

function renderVideos() {
  const grid = $("#video-grid");
  if (!grid) return;
  grid.innerHTML = state.site.videos.map(video => {
    const thumb = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
    return `
      <article class="video-card reveal">
        <div class="video-frame">
          <button type="button" class="video-load" style="--thumb:url('${thumb}')" data-youtube="${video.youtubeId}" aria-label="Load ${video.title} video">
            ▶ ${video.title}
          </button>
        </div>
        <div class="video-meta">
          <h3>${video.title}</h3>
          <p>${video.type[state.lang]}</p>
        </div>
      </article>
    `;
  }).join("");

  $$(".video-load").forEach(button => {
    button.addEventListener("click", () => {
      stopSpotifyPlayer();
      const id = button.dataset.youtube;
      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      frame.title = "YouTube video player";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      button.replaceWith(frame);
    });
  });
}

function renderHighlights() {
  const grid = $("#live-highlights");
  if (!grid) return;
  grid.innerHTML = state.site.highlights.map(item => `
    <article class="highlight-card reveal">
      <strong>${item.year}</strong>
      <h4>${item.title[state.lang]}</h4>
      <p>${item.text[state.lang]}</p>
    </article>
  `).join("");
}

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(state.lang === "it" ? "it-IT" : "en-GB", { year:"numeric", month:"short", day:"2-digit" });
}

function renderConcertTable() {
  const tbody = $("#concert-table");
  if (!tbody) return;
  const query = ($("#archive-filter")?.value || "").toLowerCase().trim();

  const rows = state.concerts
    .slice()
    .sort((a,b) => b.date.localeCompare(a.date))
    .filter(c => {
      if (!query) return true;
      return [c.date, c.venue, c.city, c.region, c.lineup].join(" ").toLowerCase().includes(query);
    });

  tbody.innerHTML = rows.map(c => `
    <tr>
      <td>${formatDate(c.date)}</td>
      <td>${c.venue}</td>
      <td>${c.city}</td>
      <td>${c.region}</td>
    </tr>
  `).join("");
}

function renderDynamic() {
  renderFeaturedTracks();
  renderDiscography();
  renderVideos();
  renderHighlights();
  renderConcertTable();
  observeReveals();
}

function setupNav() {
  const toggle = $(".nav-toggle");
  const nav = $("#site-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  $$("#site-nav a").forEach(a => {
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function createSpotifyButton() {
  const button = document.createElement("button");
  button.className = "btn small";
  button.id = "load-spotify";
  button.type = "button";
  button.textContent = "Load Spotify player";
  button.addEventListener("click", loadSpotifyPlayer);
  return button;
}

function loadSpotifyPlayer() {
  const btn = $("#load-spotify");
  const mount = $("#spotify-embed");
  if (!mount) return;
  mount.innerHTML = `<iframe loading="lazy" src="https://open.spotify.com/embed/artist/5ToVVNQTLFd3Tqo6Dfzh6M?utm_source=generator" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
  if (btn) btn.remove();
}

function stopSpotifyPlayer() {
  const mount = $("#spotify-embed");
  const existingButton = $("#load-spotify");
  if (!mount || (!mount.querySelector("iframe") && existingButton)) return;
  mount.innerHTML = "";
  if (!existingButton) {
    mount.insertAdjacentElement("beforebegin", createSpotifyButton());
  }
}

function setupSpotify() {
  const btn = $("#load-spotify");
  if (!btn) return;
  btn.addEventListener("click", loadSpotifyPlayer);
}

function setupArchiveFilter() {
  const input = $("#archive-filter");
  if (!input) return;
  input.addEventListener("input", renderConcertTable);
}

function setupLanguageButtons() {
  $$(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
  });
}

function observeReveals() {
  const items = $$(".reveal:not(.visible)");
  if (!("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(el => io.observe(el));
}

async function init() {
  const [siteRes, concertsRes] = await Promise.all([
    fetch("data/site.json"),
    fetch("data/concerts.json")
  ]);
  state.site = await siteRes.json();
  state.concerts = await concertsRes.json();

  // Force English as default unless the visitor has already chosen a language.
  if (!localStorage.getItem("rls-lang")) state.lang = state.site.defaultLang || "en";

  $("#year").textContent = new Date().getFullYear();
  setupNav();
  setupSpotify();
  setupArchiveFilter();
  setupLanguageButtons();
  setLanguage(state.lang);
}

init().catch(err => {
  console.error("Website initialization failed:", err);
});
