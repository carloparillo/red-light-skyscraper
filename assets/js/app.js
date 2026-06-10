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
  updatePressKitVisibility();
  renderDynamic();
}


function updatePressKitVisibility() {
  $$(".presskit-en").forEach(el => {
    el.hidden = state.lang !== "en";
    el.setAttribute("aria-hidden", state.lang !== "en" ? "true" : "false");
  });
  $$(".presskit-it").forEach(el => {
    el.hidden = state.lang !== "it";
    el.setAttribute("aria-hidden", state.lang !== "it" ? "true" : "false");
  });
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
        ${track.album ? `<span class="track-album">${track.album}</span>` : ""}
        <span>${[releaseKind(track.kind), track.year].filter(Boolean).join(" · ")}</span>
      </div>
      <a href="${track.spotifyUrl || state.site.links.spotify}" target="_blank" rel="noopener">Listen</a>
    </article>
  `).join("");
}

function releaseCard(rel) {
  const spotifyUrl = rel.spotifyUrl || state.site.links.spotify;
  return `
    <a class="release-card reveal" href="${spotifyUrl}" target="_blank" rel="noopener" aria-label="${t("openSpotify")}: ${rel.title}">
      <img src="${rel.artwork}" alt="${rel.title} artwork" loading="lazy">
      <h4>${rel.title}</h4>
      <p>${releaseKind(rel.kind)}${rel.year ? ` · ${rel.year}` : ""}</p>
    </a>
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
  const videoCards = state.site.videos.map(video => {
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

  const channelCard = `
    <article class="video-card video-channel-card reveal">
      <div class="video-frame video-channel-frame">
        <div class="video-channel-content">
          <p class="section-kicker">${t("videoChannelKicker")}</p>
          <h3>${t("videoChannelTitle")}</h3>
          <p>${t("videoChannelText")}</p>
          <a class="btn" href="https://www.youtube.com/c/redlightskyscraper" target="_blank" rel="noopener">${t("videoChannelButton")}</a>
        </div>
      </div>
      <div class="video-meta">
        <h3>YouTube</h3>
        <p>${t("videoChannelKicker")}</p>
      </div>
    </article>
  `;

  grid.innerHTML = videoCards + channelCard;

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


function buildPhotoFormUrl(concert) {
  const base = state.lang === "it" ? state.site.links.photoFormIt : state.site.links.photoFormEn;
  const params = new URLSearchParams({
    date: concert.date || "",
    city: concert.city || "",
    event: concert.venue || "",
    region: concert.region || ""
  });
  return `${base}?${params.toString()}`;
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
      <td><a class="archive-action" href="${buildPhotoFormUrl(c)}" target="_blank" rel="noopener">${t("sharePhotos")}</a></td>
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


const GA_MEASUREMENT_ID = "G-HC2148DWPW";
const COOKIE_CHOICE_KEY = "rls-cookie-analytics";
let analyticsLoaded = false;

function loadGoogleAnalytics() {
  if (analyticsLoaded || !GA_MEASUREMENT_ID) return;
  analyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true });
}

function showCookieBanner(force = false) {
  const banner = $("#cookie-banner");
  if (!banner) return;
  const choice = localStorage.getItem(COOKIE_CHOICE_KEY);
  banner.hidden = !force && (choice === "accepted" || choice === "rejected");
}

function hideCookieBanner() {
  const banner = $("#cookie-banner");
  if (banner) banner.hidden = true;
}

function acceptAnalyticsCookies() {
  localStorage.setItem(COOKIE_CHOICE_KEY, "accepted");
  hideCookieBanner();
  loadGoogleAnalytics();
}

function rejectAnalyticsCookies() {
  localStorage.setItem(COOKIE_CHOICE_KEY, "rejected");
  hideCookieBanner();
}

function setupCookieConsent() {
  $$('[data-cookie-accept]').forEach(btn => btn.addEventListener("click", acceptAnalyticsCookies));
  $$('[data-cookie-reject]').forEach(btn => btn.addEventListener("click", rejectAnalyticsCookies));
  $$('[data-cookie-settings]').forEach(btn => btn.addEventListener("click", () => showCookieBanner(true)));
  if (localStorage.getItem(COOKIE_CHOICE_KEY) === "accepted") {
    loadGoogleAnalytics();
  }
  showCookieBanner();
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
  setupCookieConsent();
  setLanguage(state.lang);
}

init().catch(err => {
  console.error("Website initialization failed:", err);
});
