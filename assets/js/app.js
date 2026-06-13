const state = {
  site: null,
  concerts: [],
  lang: localStorage.getItem("rls-lang") || "en"
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const liveCarouselImages = [
  "assets/images/live/carousel/2019-UK-Tour-Bristol-London.jpg.jpg",
  "assets/images/live/carousel/2022-Concretion-Festival-Aquileia.jpg.jpg",
  "assets/images/live/carousel/2022-Calibro-35-Morricone-Siena.jpg.jpg",
  "assets/images/live/carousel/2022-Arezzo-Wave-Final-Teatro-Comunale.jpg.png",
  "assets/images/live/carousel/2025-Corte-dei-Miracoli-Siena.jpg.jpg"
];
let liveCarouselIndex = 0;
let liveCarouselTimer = null;


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


function cleanImageStem(path) {
  return path.split("/").pop().replace(/\.(jpg|jpeg|png|webp)$/i, "").replace(/\.(jpg|jpeg|png|webp)$/i, "");
}

function titleFromTokens(tokens) {
  const lowerWords = new Set(["a", "an", "and", "the", "of", "dei", "del", "della", "di", "da", "in"]);
  return tokens.map((token, index) => {
    if (/^\d+$/.test(token)) return token;
    if (token.toUpperCase() === "UK") return "UK";
    const lower = token.toLowerCase();
    if (index > 0 && lowerWords.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

function parseLivePhoto(path) {
  const parts = cleanImageStem(path).split("-").filter(Boolean);
  const year = parts.shift() || "";
  let placeTokens = parts.slice(-1);
  let eventTokens = parts.slice(0, -1);

  const lastTwo = parts.slice(-2).join("-").toLowerCase();
  if (lastTwo === "bristol-london" || lastTwo === "teatro-comunale") {
    placeTokens = parts.slice(-2);
    eventTokens = parts.slice(0, -2);
  }

  return {
    year,
    event: titleFromTokens(eventTokens),
    place: placeTokens.map(token => token.toUpperCase() === "UK" ? "UK" : titleFromTokens([token])).join(lastTwo === "bristol-london" ? " / " : " ")
  };
}

function setLiveCarouselSlide(index) {
  const track = $("#live-carousel-track");
  if (!track) return;
  liveCarouselIndex = (index + liveCarouselImages.length) % liveCarouselImages.length;
  track.style.transform = `translateX(-${liveCarouselIndex * 100}%)`;
  $$(".live-carousel-dot").forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === liveCarouselIndex);
  });
}

function startLiveCarousel() {
  clearInterval(liveCarouselTimer);
  liveCarouselTimer = setInterval(() => setLiveCarouselSlide(liveCarouselIndex + 1), 5200);
}

function renderLiveCarousel() {
  const carousel = $("#live-carousel");
  const track = $("#live-carousel-track");
  const dots = $("#live-carousel-dots");
  if (!carousel || !track || !dots) return;

  track.innerHTML = liveCarouselImages.map((src, index) => {
    const meta = parseLivePhoto(src);
    return `
      <figure class="live-carousel-slide">
        <img src="${src}" alt="${meta.event} live performance, ${meta.place}, ${meta.year}" loading="${index === 0 ? "eager" : "lazy"}">
        <figcaption class="live-carousel-overlay">
          <strong>${meta.event}</strong>
          <span>${[meta.place, meta.year].filter(Boolean).join(" · ")}</span>
        </figcaption>
      </figure>
    `;
  }).join("");

  dots.innerHTML = liveCarouselImages.map((_, index) => `
    <button class="live-carousel-dot" type="button" aria-label="Show live photo ${index + 1}"></button>
  `).join("");

  $(".live-carousel-prev", carousel)?.addEventListener("click", () => {
    setLiveCarouselSlide(liveCarouselIndex - 1);
    startLiveCarousel();
  });
  $(".live-carousel-next", carousel)?.addEventListener("click", () => {
    setLiveCarouselSlide(liveCarouselIndex + 1);
    startLiveCarousel();
  });
  $$(".live-carousel-dot", carousel).forEach((dot, index) => {
    dot.addEventListener("click", () => {
      setLiveCarouselSlide(index);
      startLiveCarousel();
    });
  });
  carousel.addEventListener("mouseenter", () => clearInterval(liveCarouselTimer));
  carousel.addEventListener("mouseleave", startLiveCarousel);
  carousel.addEventListener("focusin", () => clearInterval(liveCarouselTimer));
  carousel.addEventListener("focusout", startLiveCarousel);

  setLiveCarouselSlide(liveCarouselIndex);
  startLiveCarousel();
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
  renderLiveCarousel();
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
  const shouldShow = force || !(choice === "accepted" || choice === "rejected");
  banner.classList.toggle("is-visible", shouldShow);
  banner.setAttribute("aria-hidden", shouldShow ? "false" : "true");
}

function hideCookieBanner() {
  const banner = $("#cookie-banner");
  if (!banner) return;
  banner.classList.remove("is-visible");
  banner.setAttribute("aria-hidden", "true");
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
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-cookie-accept], [data-cookie-reject], [data-cookie-settings]");
    if (!target) return;
    if (target.matches("[data-cookie-accept]")) acceptAnalyticsCookies();
    if (target.matches("[data-cookie-reject]")) rejectAnalyticsCookies();
    if (target.matches("[data-cookie-settings]")) showCookieBanner(true);
  });
  window.RLSCookies = {
    open: () => showCookieBanner(true),
    accept: acceptAnalyticsCookies,
    reject: rejectAnalyticsCookies
  };
  if (localStorage.getItem(COOKIE_CHOICE_KEY) === "accepted") {
    loadGoogleAnalytics();
  }
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
  setupCookieConsent();
  showCookieBanner();
}

init().catch(err => {
  console.error("Website initialization failed:", err);
});
