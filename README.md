# Red Light Skyscraper — GitHub Pages Website

Static bilingual website for Red Light Skyscraper.

## Structure

- `index.html` — main page
- `assets/css/style.css` — visual design
- `assets/js/app.js` — language switch, archive filtering, lazy YouTube/Spotify loading
- `assets/images/` — optimized WebP images
- `assets/docs/` — downloadable press kits
- `data/site.json` — editable site content, links, releases, video IDs, highlights
- `data/concerts.json` — complete live archive

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload all files in this folder to the repository root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, select:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Save.
6. GitHub will generate a Pages URL.

## Updating content

Edit `data/site.json` for:
- bilingual copy
- social links
- highlighted tracks
- videos
- live highlights
- press kit paths

Edit `data/concerts.json` for:
- live archive entries

Replace images inside `assets/images/`, keeping the same filenames if you do not want to edit paths.

## Google Analytics

Google Analytics is not currently loaded.
When ready, add the Google tag only after adding cookie consent logic.

Recommended future implementation:
- cookie banner with Accept / Reject
- localStorage preference
- load GA only after consent
- footer link: Cookie settings

## Custom domain

When the final domain is purchased:
1. Add a `CNAME` file in the repository root containing only the domain, for example:
   `redlightskyscraper.com`
2. Configure DNS records according to GitHub Pages instructions.
3. Set the domain in **Settings → Pages → Custom domain**.


## Update notes
- Hero logo changed to visible white/red version.
- Added Yugen YouTube video.
- Added visual merch/shop section linking to Bandcamp.
- Added and prioritized Prog quote in Press & Booking.


## Version 4 updates
- Shop section uses one merch image and links directly to Bandcamp merch.
- Live archive includes a Share photos action for each concert.
- Share links route to the EN/IT Google Forms with concert context in URL parameters.

Note: Google Forms true field prefill requires the form-specific `entry.xxxxx` IDs. Current links pass contextual URL parameters; replace `buildPhotoFormUrl()` in `assets/js/app.js` with the official pre-filled URL pattern if exact field prefill is required.
