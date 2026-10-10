// Store graphics are vector artwork; app screenshots must come from the app.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.WOL_SHARP_PATH || 'sharp');
const out = __dirname;
const symbol = `<g fill="none" stroke="#00efd0" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"><rect x="190" y="130" width="132" height="86" rx="14"/><path d="M235 216v22h42v-22M256 288v34M230 306a44 44 0 1 0 52 0"/></g>`;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#102c3c"/><stop offset="1" stop-color="#0b1220"/></linearGradient></defs><rect width="512" height="512" fill="url(#bg)"/>${symbol}</svg>`;
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#102d3e"/><stop offset="1" stop-color="#13243a"/></linearGradient><radialGradient id="glow"><stop stop-color="#00efd0" stop-opacity=".15"/><stop offset="1" stop-color="#00efd0" stop-opacity="0"/></radialGradient></defs>
<rect width="1024" height="500" fill="url(#bg)"/><circle cx="790" cy="245" r="275" fill="url(#glow)"/>
<g fill="none" stroke="#245166" stroke-width="1"><circle cx="790" cy="250" r="170"/><circle cx="790" cy="250" r="210"/><path d="M565 250h58M958 250h66M790 0v40M790 460v40"/></g>
<g font-family="Segoe UI,Arial,sans-serif"><text x="76" y="104" fill="#67e8f9" font-size="24" font-weight="600" letter-spacing="3">WoL Pro</text><text x="72" y="210" fill="#f8fafc" font-size="66" font-weight="700">Tu PC.</text><text x="72" y="282" fill="#f8fafc" font-size="66" font-weight="700">Donde estés.</text><text x="76" y="352" fill="#cbd5e1" font-size="24">Aplicaciones y acciones</text><text x="76" y="387" fill="#cbd5e1" font-size="24">desde tu móvil.</text></g>
<g transform="translate(534 2)">${symbol}</g><circle cx="790" cy="82" r="6" fill="#00efd0"/><circle cx="956" cy="250" r="6" fill="#00efd0"/><circle cx="790" cy="420" r="6" fill="#00efd0"/>
</svg>`;
(async () => {
  fs.writeFileSync(path.join(out, 'icon.svg'), icon);
  fs.writeFileSync(path.join(out, 'feature-graphic.svg'), feature);
  await sharp(Buffer.from(icon)).ensureAlpha().png().toFile(path.join(out,'icon-512.png'));
  await sharp(Buffer.from(feature)).removeAlpha().png().toFile(path.join(out,'feature-graphic-1024x500.png'));
  for (const file of ['icon-512.png','feature-graphic-1024x500.png']) {
    const m = await sharp(path.join(out,file)).metadata();
    console.log(`${file}: ${m.width}x${m.height}, ${m.channels} channels, ${fs.statSync(path.join(out,file)).size} bytes`);
  }
})();
