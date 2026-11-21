# WebLuxe Foods — Kitchen & Takeaway

A concept site by WebLuxe: a takeaway-only ordering site for a chic, European-styled snack kitchen in Grand Baie, built around
**Q-Skip** — order ahead on your phone, skip the queue and collect at the counter.

It is a static site (HTML, SCSS, vanilla JS, canvas), so it runs on GitHub Pages with no backend.
Orders are sent to the restaurant as a ready-written **WhatsApp message**.

## What's in it

- **Intro** (three.js, `js/stage.js`): the wordmark punches in, a wok fire lights up the bottom of the screen
  and real 3D ingredients (chillies, coriander, star anise, peppercorns, cinnamon, lime) are tossed into the
  air. Time slows at the top of the toss, the camera pushes through and the screen burns away onto the site.
  Tap to skip.
- **Tab transitions**: the ink burns in from where you tapped (a few ingredients fly off your finger), the
  page name slams in, and the ink burns away onto the new page. Without WebGL it falls back to a circular wipe.
- **Home** (kept short on purpose): hero slider with a canvas ember effect and parallax, one statement line,
  four signature dishes, and a three-step "order ahead" band.
- **Menu**: five sections (Starters, Burgers, Noodles & Rice from the wok, Desserts, Drinks) laid out as
  refined text-led rows with a small photo, a sticky category bar with a sliding underline, and search.
- **Item options**: every dish opens a sheet before it is added — required and optional choices
  (protein, heat, sauces with a limit, extras, "leave out" items, make-it-a-menu, portions, flavours),
  quantity, special instructions and a live rolling price. On phones the sheet can be dragged down to close.
- **Cart and checkout** (takeaway only): edit quantities or re-open a line's options, name and mobile
  number, ASAP or a pickup slot, payment method at the counter, totals with 15% VAT.
- **Order by WhatsApp**: placing the order opens WhatsApp with the full order written out, addressed to
  the restaurant's number. The customer presses send.
- **Q-Skip ticket**: order number, pickup code, status tracker and confetti.
- **Receipt** with a QR code: print / save as PDF, or save as an image.
- **My Orders**: order history on the device, with "order again".
- Small touches: haptic ticks on Android, add-to-cart fly
  animation, scroll progress bar. Respects `prefers-reduced-motion`.

## What is and isn't real

- Orders **are** delivered: the WhatsApp message goes to the number in `js/data.js` once the customer sends it.
- Orders are also saved in the browser's `localStorage` so the ticket and receipt can be reopened.
- The **status tracker is a preview**: it advances on a timer (about 45 seconds to "ready"). A real
  tracker needs a backend the kitchen can update.
- No payment is taken online; customers pay at the counter.
- The address, VAT number, prices and opening hours in `js/data.js` are placeholders.

## Run it locally

```bash
npm install
npm start        # serves the folder at http://localhost:5173
```

Any static file server works; nothing needs to be built to run the site.

## Editing

| What | Where |
|---|---|
| Restaurant name, phone, WhatsApp number, hours, VAT rate | `js/data.js` → `brand` |
| Menus, dishes, prices, option groups | `js/data.js` → `categories`, `items` |
| Photos | `img/` — each dish has `name.webp` (800px wide) and `name-sm.webp` (420px) |
| Styles | `scss/` — then run `npm run build` to regenerate `css/main.css` |
| Behaviour | `js/app.js` (app), `js/fx.js` (canvas effects) |

```bash
npm run build    # compile SCSS once
npm run watch    # recompile on save
```

`css/main.css` is committed so the site works on GitHub Pages without a build step.

## Credits

- Photos from [Unsplash](https://unsplash.com) (Unsplash License). Some dishes use the closest
  available stock photo rather than a photo of the exact dish; replace them with your own.
- QR codes by [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT).
- Fonts: Cormorant Garamond, Manrope and JetBrains Mono via Google Fonts.
