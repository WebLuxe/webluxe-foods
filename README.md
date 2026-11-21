# Kot Nou — Mauritian Street Kitchen

A takeaway-only ordering site for a Mauritian restaurant, built around **Q-Skip**: order ahead on your
phone, skip the queue and collect at the counter.

It is a static site (HTML, SCSS, vanilla JS, canvas). There is no backend, so it can be hosted on
GitHub Pages as-is.

## What's in it

- **Intro loading screen** with canvas-drawn flag ribbons and a progress counter.
- **Home**: hero slider with a canvas ember effect, dish ticker, bestseller rail, menu category tiles,
  a "how Q-Skip works" section and a story block with animated counters.
- **Menu**: seven menus (Starters, Street Classics, Noodles & Rice, Curries & Mains, Burgers & Sides,
  Desserts, Drinks), a sticky category bar with a sliding indicator, and search.
- **Item options**: every dish opens a sheet before it is added, with required and optional choices
  (protein, spice level, sauces with a limit, extras, "remove" items, make-it-a-meal, sizes),
  a quantity stepper, special instructions and a live price.
- **Cart and checkout** (takeaway only): edit quantities or re-open a line's options, enter name and
  mobile number, choose ASAP or a pickup slot, pick a payment method, review totals with 15% VAT.
- **Q-Skip ticket**: order number, pickup code, live status tracker
  (Received → On the fire → Ready → Collected) and confetti when it is ready.
- **Receipt**: thermal-style receipt with a QR code. Print / save as PDF, or download as a PNG.
- **My Orders**: order history on the device, with "order again".
- **Tab transitions**: a four-stripe curtain wipes between sections.
- Responsive, keyboard accessible, and respects `prefers-reduced-motion`.

## Important: this is a demo ordering flow

Orders are stored in the browser's `localStorage` only. **No kitchen receives the order and no payment
is taken.** The status tracker advances on a timer (about 45 seconds to "ready") so the whole flow can
be seen quickly. To take real orders the site needs a backend (order API, kitchen screen, payments).

The restaurant name, address, phone number and VAT number in `js/data.js` are placeholders.

## Run it locally

```bash
npm install
npm start        # serves the folder at http://localhost:5173
```

Any static file server works; nothing needs to be built to run the site.

## Editing

| What | Where |
|---|---|
| Restaurant details, opening hours, VAT rate | `js/data.js` → `brand` |
| Menus, dishes, prices, option groups | `js/data.js` → `categories`, `items` |
| Photos | `img/` (one `.jpg` per dish, named by the dish's `img` field) |
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
- Fonts: Anton, Plus Jakarta Sans, Caveat Brush and JetBrains Mono via Google Fonts.
