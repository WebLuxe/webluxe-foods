/* Kot Nou — single-page app: tabs, menu, item options, cart, Q-Skip checkout, order tracker, receipt.
   Everything runs in the browser (orders are kept in localStorage); there is no backend. */
(() => {
  'use strict';

  const { brand: B, categories: CATS, items: ITEMS } = window.MENU;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rs = (n) => 'Rs ' + Math.round(n).toLocaleString('en-US');
  const byId = (id) => ITEMS.find((i) => i.id === id);
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const hm = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  const clock = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  const store = {
    get(k, d) { try { const v = localStorage.getItem('kn:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('kn:' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  /* Demo kitchen: the order moves through the stages on a timer so the whole flow can be seen in a minute. */
  const SIM = { received: 7000, ready: 45000 };
  const STAGES = ['received', 'preparing', 'ready', 'collected'];
  const STAGE_TEXT = {
    received: ['Order received', 'The kitchen has your ticket.'],
    preparing: ['On the fire', 'Your food is being cooked right now.'],
    ready: ['Ready to collect!', 'Walk past the queue and show this screen at the Q-Skip counter.'],
    collected: ['Collected', 'Bon apeti! Mersi, nou trouv twa talere.'],
  };

  const S = {
    cart: store.get('cart', []).filter((l) => byId(l.id)),
    orders: store.get('orders', []),
    details: store.get('details', { name: '', phone: '' }),
    note: '', pay: 'counter', slot: 'asap',
    view: null, arg: null, step: 0, sheet: null, query: '', menuCat: 'all',
    cleanup: [], navToken: 0, errors: {},
  };

  /* ------------------------------------------------------------------ icons */
  const ICON = {
    home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    menu: '<path d="M4 3v8a3 3 0 0 0 3 3v7M7 3v8M10 3v8a3 3 0 0 1-3 3M17 21V3c-2.5 1-4 4-4 8h4"/>',
    orders: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    about: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
    bag: '<path d="M5 8h14l-1.200 12.100a1 1 0 0 1-1 .9H7.200a1 1 0 0 1-1-.9z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
    leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15zM5 19l8-8"/>',
    star: '<path d="M12 3l2.700 5.600 6.100.900-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.900z"/>',
  };
  const ic = (name) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;
  const LOGO = '<span class="logo__mark"><i></i><i></i><i></i><i></i></span><span class="logo__text">KOT NOU</span>';

  const TABS = [['home', 'Home'], ['menu', 'Menu'], ['orders', 'My Orders'], ['about', 'Find Us']];

  /* ------------------------------------------------------------ cart maths */
  function unitPrice(item, sel) {
    let p = item.price;
    for (const g of item.groups || []) {
      for (const oid of sel[g.id] || []) {
        const o = g.options.find((x) => x.id === oid);
        if (o) p += o.price || 0;
      }
    }
    return p;
  }
  /* Human-readable list of what was picked, skipping the plain defaults that add nothing. */
  function selSummary(item, sel) {
    const out = [];
    for (const g of item.groups || []) {
      const names = (sel[g.id] || []).map((id) => g.options.find((o) => o.id === id)).filter(Boolean)
        .map((o) => o.name + (o.price ? ` (+${rs(o.price)})` : ''));
      if (names.length) out.push(`${g.name}: ${names.join(', ')}`);
    }
    return out;
  }
  const defaultSel = (item) => {
    const sel = {};
    for (const g of item.groups || []) sel[g.id] = g.type === 'single' && g.default ? [g.default] : [];
    return sel;
  };
  const lineKey = (id, sel, note) => `${id}|${JSON.stringify(sel)}|${note}`;
  const cartCount = () => S.cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = () => S.cart.reduce((s, l) => s + l.unit * l.qty, 0);
  const vatOf = (total) => Math.round(total - total / (1 + B.vatRate));
  const prepMinutes = () => Math.min(30, 10 + Math.ceil(cartCount() * 1.5));
  S.cart.forEach((l) => { l.unit = unitPrice(byId(l.id), l.sel); });

  function saveCart() {
    store.set('cart', S.cart);
    const n = cartCount();
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = n;
      el.classList.toggle('is-empty', n === 0);
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    });
    const pill = $('#cartPill');
    if (pill) {
      pill.classList.toggle('show', n > 0);
      $('#pillText').textContent = `${n} item${n === 1 ? '' : 's'} · ${rs(cartTotal())}`;
    }
  }

  /* ----------------------------------------------------------------- utils */
  function toast(msg, icon = 'check') {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${ic(icon)}<span>${esc(msg)}</span>`;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2800);
  }

  function openDialog(d) { if (!d.open) { d.classList.remove('closing'); d.showModal(); } }
  async function closeDialog(d) {
    if (!d.open) return;
    d.classList.add('closing');
    await wait(REDUCED ? 0 : 280);
    d.classList.remove('closing');
    d.close();
  }

  function openState() {
    let mins;
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Indian/Mauritius', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      mins = (+parts.find((p) => p.type === 'hour').value % 24) * 60 + +parts.find((p) => p.type === 'minute').value;
    } catch { const d = new Date(); mins = d.getHours() * 60 + d.getMinutes(); }
    const [o, c] = B.hours;
    const open = mins >= o && mins < c;
    return { open, text: open ? `Open now · until ${hm(c)}` : `Closed · opens ${hm(o)}` };
  }

  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.dataset.count) countUp(e.target);
      revealer.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  function observe(root = document) { $$('.reveal, [data-count]', root).forEach((el) => revealer.observe(el)); }

  function countUp(el) {
    const target = Number(el.dataset.count);
    if (REDUCED) { el.textContent = target; return; }
    const t0 = performance.now();
    (function step(t) {
      const p = Math.min(1, (t - t0) / 1300);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  function flyToCart(fromEl) {
    const target = $$('[data-action="open-cart"]').find((b) => b.offsetParent !== null);
    if (REDUCED || !fromEl || !target) return;
    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const ghost = fromEl.cloneNode(true);
    ghost.className = 'fly-ghost';
    Object.assign(ghost.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    document.body.appendChild(ghost);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    ghost.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1, borderRadius: '18px' },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(.45)`, opacity: 0.95, borderRadius: '50%', offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.06)`, opacity: 0.2, borderRadius: '50%' },
    ], { duration: 700, easing: 'cubic-bezier(.5,0,.2,1)' }).onfinish = () => ghost.remove();
  }

  /* ------------------------------------------------------------ item cards */
  const TAGS = {
    best: ['Bestseller', 'star'], veg: ['Veg', 'leaf'], spicy: ['Spicy', 'flame'], new: ['New', 'plus'],
  };
  const tagHtml = (t) => (TAGS[t] ? `<span class="tag tag--${t}">${ic(TAGS[t][1])}${TAGS[t][0]}</span>` : '');
  function card(i, n = 0) {
    return `
    <article class="card reveal" style="--i:${n % 8}" data-action="open-item" data-id="${i.id}" tabindex="0" role="button" aria-label="${esc(i.name)}, ${rs(i.price)}. Choose options">
      <div class="card__media">
        <img src="img/${i.img}.jpg" alt="${esc(i.name)}" loading="lazy" width="900" height="675">
        <div class="card__tags">${(i.tags || []).map(tagHtml).join('')}</div>
      </div>
      <div class="card__body">
        <h3 class="card__name">${esc(i.name)}</h3>
        <p class="card__desc">${esc(i.desc)}</p>
        <div class="card__foot">
          <span class="price"><small>from</small> ${rs(i.price)}</span>
          <span class="card__add">${ic('plus')}<span>Add</span></span>
        </div>
      </div>
    </article>`;
  }

  /* ------------------------------------------------------------------ chrome */
  function renderChrome() {
    const st = openState();
    $('#header').innerHTML = `
      <div class="site-header__in">
        <a class="logo" href="#/home" aria-label="Kot Nou home">${LOGO}</a>
        <nav class="nav" aria-label="Main">
          ${TABS.map(([id, label]) => `<a href="#/${id}" data-tab="${id}">${label}</a>`).join('')}
        </nav>
        <div class="site-header__right">
          <span class="status ${st.open ? 'is-open' : 'is-closed'}"><i></i>${st.text}</span>
          <a class="btn btn--red btn--sm hide-sm" href="#/menu">Order now</a>
          <button class="cart-btn" data-action="open-cart" aria-label="Open your order">
            ${ic('bag')}<span class="cart-btn__count is-empty" data-cart-count>0</span>
          </button>
        </div>
      </div>`;

    $('#tabbar').innerHTML = TABS.map(([id, label]) =>
      `<a href="#/${id}" data-tab="${id}">${ic(id)}<span>${label.replace('My ', '')}</span></a>`).join('')
      + `<button data-action="open-cart" aria-label="Open your order">${ic('bag')}<span>Cart</span><b class="cart-btn__count is-empty" data-cart-count>0</b></button>`;

    $('#footer').innerHTML = `
      <div class="stripes stripes--flat"><i></i><i></i><i></i><i></i></div>
      <div class="wrap site-footer__grid">
        <div>
          <div class="logo logo--lg">${LOGO}</div>
          <p class="site-footer__tag">${esc(B.tagline)}. Cooked fresh, collected fast.</p>
        </div>
        <div>
          <h4>Directly to</h4>
          <a href="#/menu">The menu</a><a href="#/orders">My orders</a><a href="#/about">Find us</a>
        </div>
        <div>
          <h4>Kot nou</h4>
          <p>${esc(B.address)}</p>
          <p>${hm(B.hours[0])} – ${hm(B.hours[1])}, every day</p>
          <a href="tel:${B.phone.replace(/\s/g, '')}">${esc(B.phone)}</a>
        </div>
        <div>
          <h4>Good to know</h4>
          <p>Takeaway only. Prices in Mauritian rupees, VAT included.</p>
          <p class="muted">Demo ordering: no payment is taken and no kitchen receives the order.</p>
        </div>
      </div>
      <div class="wrap site-footer__base">
        <span>© ${new Date().getFullYear()} Kot Nou</span>
        <span>Photos from <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a></span>
      </div>`;

    const pill = document.createElement('button');
    pill.className = 'cart-pill';
    pill.id = 'cartPill';
    pill.dataset.action = 'open-cart';
    pill.innerHTML = `<span id="pillText"></span><span class="cart-pill__go">View order ${ic('arrow')}</span>`;
    document.body.appendChild(pill);
  }

  /* -------------------------------------------------------------------- HOME */
  const HERO = [
    { img: 'hero-wok', kicker: 'Lakwizinn morisien · Grand Baie', lines: ['Mine Frite.', 'Zero Queue.'] },
    { img: 'hero-lagoon', kicker: 'From our island to your hands', lines: ['Island', 'Flavour.'] },
    { img: 'hero-palms', kicker: 'Order ahead with Q-Skip', lines: ['Skip the', 'Line.'] },
  ];

  function viewHome() {
    const best = ITEMS.filter((i) => (i.tags || []).includes('best'));
    return `
    <section class="hero" id="hero">
      <div class="hero__slides">
        ${HERO.map((s, n) => `<div class="hero__slide${n === 0 ? ' is-on' : ''}" style="background-image:url(img/${s.img}.jpg)"></div>`).join('')}
      </div>
      <canvas class="hero__fx" id="heroFx" aria-hidden="true"></canvas>
      <div class="hero__inner wrap">
        <p class="kicker" id="heroKicker">${HERO[0].kicker}</p>
        <h1 class="hero__title" id="heroTitle">${HERO[0].lines.map((l, n) => `<span class="line"><span style="--d:${n}">${l}</span></span>`).join('')}</h1>
        <p class="hero__sub">Order on your phone, walk straight past the line and collect your takeaway hot from the Q-Skip counter.</p>
        <div class="hero__cta">
          <a class="btn btn--red btn--lg" href="#/menu">Order now ${ic('arrow')}</a>
          <a class="btn btn--ghost btn--lg" href="#qskip" data-action="scroll-to" data-target="#qskip">How Q-Skip works</a>
        </div>
      </div>
      <div class="hero__dots" id="heroDots">${HERO.map((_, n) => `<button class="${n === 0 ? 'is-on' : ''}" data-action="hero-go" data-n="${n}" aria-label="Slide ${n + 1}"><i></i></button>`).join('')}</div>
      <div class="stripes stripes--hero" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </section>

    <div class="ticker" aria-hidden="true"><div class="ticker__track">
      ${Array(2).fill(['Dholl Puri', 'Mine Frite', 'Boulettes', 'Briani', 'Gato Pima', 'Alouda', 'Rougaille', 'Napolitaine', 'Bol Renversé', 'Farata']
        .map((w) => `<span>${w}</span><b></b>`).join('')).join('')}
    </div></div>

    <section class="sec sec--crave">
      <div class="wrap sec__head">
        <div><p class="script reveal">Ou fin?</p><h2 class="display reveal">Got a craving?</h2></div>
        <a class="link-arrow reveal" href="#/menu">See the full menu ${ic('arrow')}</a>
      </div>
      <div class="rail" id="rail">
        ${best.map((i, n) => `
        <article class="rail-card reveal" style="--i:${n}" data-action="open-item" data-id="${i.id}" tabindex="0" role="button" aria-label="${esc(i.name)}, ${rs(i.price)}">
          <div class="rail-card__img"><img src="img/${i.img}.jpg" alt="${esc(i.name)}" loading="lazy" width="900" height="675"></div>
          <div class="rail-card__body">
            <h3>${esc(i.name)}</h3>
            <div class="rail-card__foot"><span class="price">${rs(i.price)}</span><span class="btn btn--red btn--sm">Order</span></div>
          </div>
        </article>`).join('')}
      </div>
    </section>

    <section class="sec sec--cats">
      <div class="wrap">
        <div class="sec__head"><div><p class="script reveal">Nou meni</p><h2 class="display reveal">Discover our menu</h2></div></div>
        <div class="cats">
          ${CATS.map((c, n) => `
          <a class="cat reveal" style="--i:${n}" href="#/menu/${c.id}">
            <img src="img/${c.img}.jpg" alt="" loading="lazy" width="900" height="675">
            <span class="cat__no">${pad(n + 1)}</span>
            <span class="cat__txt"><b>${esc(c.en)}</b><em>${esc(c.name)} · ${ITEMS.filter((i) => i.cat === c.id).length} dishes</em></span>
          </a>`).join('')}
        </div>
      </div>
    </section>

    <section class="sec sec--qskip" id="qskip">
      <div class="wrap qskip">
        <div class="qskip__copy">
          <p class="script reveal">Pa bizin fer lake</p>
          <h2 class="display reveal">Your Kot Nou,<br>your way: <span class="hl">Q-Skip</span></h2>
          <ol class="steps">
            <li class="reveal" style="--i:0"><span>1</span><div><b>Build your order</b><p>Pick your dishes and tune every one: spice level, sauces, extras, the lot.</p></div></li>
            <li class="reveal" style="--i:1"><span>2</span><div><b>Get your ticket</b><p>You receive an order number, a pickup code and a receipt on your phone.</p></div></li>
            <li class="reveal" style="--i:2"><span>3</span><div><b>Skip the queue</b><p>Watch it cook live, then walk to the Q-Skip counter and collect.</p></div></li>
          </ol>
          <a class="btn btn--yellow btn--lg reveal" href="#/menu">Start my order ${ic('arrow')}</a>
        </div>
        <div class="qskip__ticket reveal" aria-hidden="true">
          <div class="mock">
            <div class="mock__top"><span>Q-SKIP</span><span>Takeaway</span></div>
            <div class="mock__no">Q-027</div>
            <div class="mock__bar"><i></i></div>
            <div class="mock__rows"><span>Mine Frite · Spesial</span><span>Gato Pima x6</span><span>Alouda · Vanilla</span></div>
            <div class="mock__code"><small>Pickup code</small><b>4 8 2 1</b></div>
          </div>
        </div>
      </div>
    </section>

    <section class="sec sec--story">
      <div class="wrap story">
        <div class="story__img reveal"><img src="img/kiosk.jpg" alt="A colourful Mauritian street food kiosk" loading="lazy" width="1200" height="800"></div>
        <div class="story__copy">
          <p class="script reveal">Nou zistwar</p>
          <h2 class="display reveal">More than good food</h2>
          <p class="reveal">Kot Nou means “our place”. We cook the food Mauritians queue for at the tabagie and the bazaar: dholl puri rolled by hand, noodles tossed over a roaring flame, curries that take all morning.</p>
          <div class="stats">
            <div class="reveal" style="--i:0"><b data-count="${ITEMS.length}">0</b><span>dishes on the menu</span></div>
            <div class="reveal" style="--i:1"><b data-count="${CATS.length}">0</b><span>menus to explore</span></div>
            <div class="reveal" style="--i:2"><b data-count="15">0</b><span>minutes, typical pickup</span></div>
            <div class="reveal" style="--i:3"><b data-count="0">0</b><span>minutes in the queue</span></div>
          </div>
          <a class="link-arrow reveal" href="#/about">Find us in Grand Baie ${ic('arrow')}</a>
        </div>
      </div>
    </section>`;
  }

  function mountHome() {
    const fx = window.FX.embers($('#heroFx'));
    S.cleanup.push(() => fx.stop());

    let cur = 0, timer = 0;
    const slides = $$('.hero__slide'), dots = $$('#heroDots button');
    function show(n) {
      if (n === cur) return;
      cur = n;
      slides.forEach((s, i) => s.classList.toggle('is-on', i === n));
      dots.forEach((d, i) => d.classList.toggle('is-on', i === n));
      const title = $('#heroTitle');
      title.classList.add('swap');
      setTimeout(() => {
        $('#heroKicker').textContent = HERO[n].kicker;
        title.innerHTML = HERO[n].lines.map((l, k) => `<span class="line"><span style="--d:${k}">${l}</span></span>`).join('');
        title.classList.remove('swap');
      }, REDUCED ? 0 : 380);
    }
    const start = () => { clearInterval(timer); timer = setInterval(() => show((cur + 1) % HERO.length), 6500); };
    start();
    S.heroGo = (n) => { show(n); start(); };
    S.cleanup.push(() => clearInterval(timer));
  }

  /* -------------------------------------------------------------------- MENU */
  function viewMenu() {
    return `
    <section class="page-head">
      <div class="wrap">
        <p class="script">Nou meni</p>
        <h1 class="display">The Menu</h1>
        <p class="page-head__sub">Tap any dish to choose your options before it goes in your order.</p>
        <label class="search">
          ${ic('search')}
          <input id="q" type="search" placeholder="Search mine frite, dholl puri, alouda…" value="${esc(S.query)}" autocomplete="off" aria-label="Search the menu">
        </label>
      </div>
      <div class="stripes stripes--head" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </section>
    <div class="chips-bar" id="chipsBar">
      <div class="wrap">
        <div class="chips" id="chips" role="tablist" aria-label="Menu categories">
          <span class="chips__ink" id="chipsInk"></span>
          <button role="tab" data-action="menu-cat" data-cat="all">All</button>
          ${CATS.map((c) => `<button role="tab" data-action="menu-cat" data-cat="${c.id}">${esc(c.en)}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="wrap menu-body" id="menuBody"></div>`;
  }

  function menuSection(c, n) {
    const list = ITEMS.filter((i) => i.cat === c.id);
    return `
    <section class="menu-sec" id="sec-${c.id}">
      <header class="menu-sec__head reveal">
        <span class="menu-sec__no">${pad(n + 1)}</span>
        <div><h2 class="display">${esc(c.en)} <em>${esc(c.name)}</em></h2><p>${esc(c.sub)}</p></div>
        <span class="menu-sec__count">${list.length} dishes</span>
      </header>
      <div class="grid">${list.map(card).join('')}</div>
    </section>`;
  }

  function renderMenuBody() {
    const body = $('#menuBody');
    if (!body) return;
    const q = S.query.trim().toLowerCase();
    let html;
    if (q) {
      const hits = ITEMS.filter((i) => `${i.name} ${i.desc} ${CATS.find((c) => c.id === i.cat).en}`.toLowerCase().includes(q));
      html = hits.length
        ? `<section class="menu-sec"><header class="menu-sec__head"><div><h2 class="display">Results</h2><p>${hits.length} dish${hits.length === 1 ? '' : 'es'} for “${esc(S.query)}”</p></div></header><div class="grid">${hits.map(card).join('')}</div></section>`
        : `<div class="empty"><h3 class="display">Nothing for “${esc(S.query)}”</h3><p>Try “mine”, “kari” or “gato”.</p><button class="btn btn--dark" data-action="clear-search">Clear search</button></div>`;
    } else if (S.menuCat === 'all') {
      html = CATS.map(menuSection).join('');
    } else {
      const idx = CATS.findIndex((c) => c.id === S.menuCat);
      html = menuSection(CATS[idx], idx);
    }
    body.innerHTML = html;
    observe(body);

    const active = q ? null : S.menuCat;
    $$('#chips button').forEach((b) => {
      const on = b.dataset.cat === active;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on);
    });
    moveInk();
  }
  function moveInk() {
    const ink = $('#chipsInk'), on = $('#chips .is-on');
    if (!ink) return;
    if (!on) { ink.style.opacity = 0; return; }
    ink.style.opacity = 1;
    ink.style.width = on.offsetWidth + 'px';
    ink.style.transform = `translateX(${on.offsetLeft}px)`;
    on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
  }

  function mountMenu() {
    S.menuCat = CATS.some((c) => c.id === S.arg) ? S.arg : 'all';
    renderMenuBody();
    const q = $('#q');
    q.addEventListener('input', () => { S.query = q.value; renderMenuBody(); });
    const onResize = () => moveInk();
    window.addEventListener('resize', onResize);
    S.cleanup.push(() => window.removeEventListener('resize', onResize));
    if (document.fonts?.ready) document.fonts.ready.then(moveInk);
  }

  /* ------------------------------------------------------------- ITEM SHEET */
  function groupHint(g) {
    if (g.type === 'single') return 'Required · choose 1';
    return g.max ? `Optional · up to ${g.max}` : 'Optional';
  }

  function openItem(id, editKey = null) {
    const item = byId(id);
    if (!item) return;
    const line = editKey ? S.cart.find((l) => l.key === editKey) : null;
    S.sheet = {
      item, editKey,
      sel: line ? JSON.parse(JSON.stringify(line.sel)) : defaultSel(item),
      qty: line ? line.qty : 1,
      note: line ? line.note : '',
    };
    const sh = S.sheet;
    $('#sheet').innerHTML = `
      <form class="sheet__in" method="dialog" id="sheetForm">
        <button type="button" class="icon-btn sheet__close" data-action="close-sheet" aria-label="Close">${ic('close')}</button>
        <div class="sheet__media" id="sheetMedia">
          <img src="img/${item.img}.jpg" alt="${esc(item.name)}" width="900" height="675">
          <div class="card__tags">${(item.tags || []).map(tagHtml).join('')}</div>
        </div>
        <div class="sheet__scroll" tabindex="-1" autofocus>
          <header class="sheet__head">
            <h2 class="display">${esc(item.name)}</h2>
            <span class="price">${rs(item.price)}</span>
            <p>${esc(item.desc)}</p>
          </header>
          ${(item.groups || []).map((g) => `
          <fieldset class="og" data-g="${g.id}">
            <legend><span>${esc(g.name)}</span><em class="${g.type === 'single' ? 'req' : ''}">${groupHint(g)}</em></legend>
            ${g.options.map((o) => `
            <label class="opt">
              <input type="${g.type === 'single' ? 'radio' : 'checkbox'}" name="g-${g.id}" value="${o.id}" ${sh.sel[g.id].includes(o.id) ? 'checked' : ''}>
              <span class="opt__box">${ic('check')}</span>
              <span class="opt__name">${esc(o.name)}</span>
              <span class="opt__price">${o.price ? '+ ' + rs(o.price) : ''}</span>
            </label>`).join('')}
          </fieldset>`).join('')}
          <fieldset class="og">
            <legend><span>Special instructions</span><em>Optional</em></legend>
            <textarea id="sheetNote" rows="2" maxlength="140" placeholder="Allergies, sauce on the side…">${esc(sh.note)}</textarea>
          </fieldset>
        </div>
        <footer class="sheet__foot">
          <div class="qty" role="group" aria-label="Quantity">
            <button type="button" data-action="sheet-qty" data-d="-1" aria-label="Fewer">${ic('minus')}</button>
            <output id="sheetQty">${sh.qty}</output>
            <button type="button" data-action="sheet-qty" data-d="1" aria-label="More">${ic('plus')}</button>
          </div>
          <button type="button" class="btn btn--red btn--lg sheet__add" data-action="sheet-add">
            <span>${editKey ? 'Update order' : 'Add to order'}</span><b id="sheetTotal"></b>
          </button>
        </footer>
      </form>`;
    syncSheet();
    openDialog($('#sheet'));
    $('.sheet__scroll').scrollTop = 0;
  }

  /* Reads the form into state, enforces "up to N" limits and refreshes the price button. */
  function syncSheet() {
    const sh = S.sheet;
    if (!sh) return;
    for (const g of sh.item.groups || []) {
      const inputs = $$(`#sheet input[name="g-${g.id}"]`);
      sh.sel[g.id] = inputs.filter((i) => i.checked).map((i) => i.value);
      if (g.type === 'multi' && g.max) {
        const full = sh.sel[g.id].length >= g.max;
        inputs.forEach((i) => { i.disabled = full && !i.checked; i.closest('.opt').classList.toggle('is-off', i.disabled); });
      }
    }
    sh.note = ($('#sheetNote')?.value || '').trim();
    $('#sheetQty').textContent = sh.qty;
    $('#sheetTotal').textContent = rs(unitPrice(sh.item, sh.sel) * sh.qty);
  }

  function addFromSheet() {
    const sh = S.sheet;
    syncSheet();
    const unit = unitPrice(sh.item, sh.sel);
    const key = lineKey(sh.item.id, sh.sel, sh.note);
    if (sh.editKey) {
      const idx = S.cart.findIndex((l) => l.key === sh.editKey);
      if (idx > -1) S.cart.splice(idx, 1);
    }
    const same = S.cart.find((l) => l.key === key);
    if (same) same.qty = Math.min(20, same.qty + sh.qty);
    else S.cart.push({ key, id: sh.item.id, qty: sh.qty, sel: sh.sel, note: sh.note, unit });
    flyToCart(sh.editKey ? null : $('#sheetMedia img'));
    saveCart();
    toast(sh.editKey ? `${sh.item.name} updated` : `${sh.qty} × ${sh.item.name} added to your order`);
    const wasEdit = sh.editKey;
    closeDialog($('#sheet')).then(() => { if (wasEdit) { renderCart(); } });
    S.sheet = null;
  }

  /* --------------------------------------------------------- CART / CHECKOUT */
  function slots() {
    const prep = prepMinutes();
    const first = new Date(Date.now() + (prep + 10) * 60000);
    first.setMinutes(Math.ceil(first.getMinutes() / 15) * 15, 0, 0);
    return Array.from({ length: 5 }, (_, n) => first.getTime() + n * 15 * 60000);
  }

  function cartLineHtml(l) {
    const item = byId(l.id);
    const opts = selSummary(item, l.sel);
    return `
    <li class="line">
      <img src="img/${item.img}.jpg" alt="" width="72" height="72">
      <div class="line__main">
        <div class="line__top"><b>${esc(item.name)}</b><span>${rs(l.unit * l.qty)}</span></div>
        ${opts.length ? `<ul class="line__opts">${opts.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
        ${l.note ? `<p class="line__note">“${esc(l.note)}”</p>` : ''}
        <div class="line__ctl">
          <div class="qty qty--sm">
            <button data-action="line-qty" data-key="${esc(l.key)}" data-d="-1" aria-label="Fewer">${ic(l.qty === 1 ? 'trash' : 'minus')}</button>
            <output>${l.qty}</output>
            <button data-action="line-qty" data-key="${esc(l.key)}" data-d="1" aria-label="More">${ic('plus')}</button>
          </div>
          <button class="text-btn" data-action="line-edit" data-key="${esc(l.key)}">${ic('edit')} Edit options</button>
        </div>
      </div>
    </li>`;
  }

  function renderCart() {
    const d = $('#cart');
    const total = cartTotal(), empty = S.cart.length === 0;
    if (empty) S.step = 0;
    const prep = prepMinutes();
    const stepNames = ['Order', 'Details', 'Confirm'];
    const err = (k) => (S.errors[k] ? `<small class="field__err">${esc(S.errors[k])}</small>` : '');

    d.innerHTML = `
    <div class="drawer__in">
      <header class="drawer__head">
        <button class="icon-btn" data-action="${S.step === 0 ? 'close-cart' : 'cart-back'}" aria-label="${S.step === 0 ? 'Close' : 'Back'}">${ic(S.step === 0 ? 'close' : 'back')}</button>
        <ol class="stepper">${stepNames.map((n, i) => `<li class="${i === S.step ? 'is-on' : i < S.step ? 'is-done' : ''}"><span>${i < S.step ? ic('check') : i + 1}</span>${n}</li>`).join('')}</ol>
      </header>

      <div class="drawer__view"><div class="drawer__track" style="transform:translateX(-${S.step * 100}%)">

        <section class="drawer__step" ${S.step !== 0 ? 'inert' : ''}>
          <h2 class="display">Your order</h2>
          <p class="pillnote">${ic('bag')} Takeaway · Q-Skip collection</p>
          ${empty ? `
          <div class="empty empty--cart">
            <div class="empty__art">${ic('bag')}</div>
            <h3>Your bag is empty</h3><p>Add a mine frite. You know you want to.</p>
            <a class="btn btn--red" href="#/menu" data-action="close-cart">Browse the menu</a>
          </div>` : `
          <ul class="lines">${S.cart.map(cartLineHtml).join('')}</ul>
          <button class="text-btn text-btn--add" data-action="close-cart-menu">${ic('plus')} Add more items</button>`}
        </section>

        <section class="drawer__step" ${S.step !== 1 ? 'inert' : ''}>
          <h2 class="display">Who's collecting?</h2>
          <p class="muted">We call your order number, and text only if there's a problem.</p>
          <label class="field ${S.errors.name ? 'has-err' : ''}"><span>Your name</span>
            <input id="fName" maxlength="40" autocomplete="given-name" value="${esc(S.details.name)}" placeholder="e.g. Darsh">${err('name')}</label>
          <label class="field ${S.errors.phone ? 'has-err' : ''}"><span>Mobile number</span>
            <input id="fPhone" type="tel" inputmode="tel" maxlength="16" autocomplete="tel" value="${esc(S.details.phone)}" placeholder="5xxx xxxx">${err('phone')}</label>

          <h3 class="drawer__sub">${ic('clock')} Pickup time</h3>
          <div class="choice choice--wrap" role="radiogroup" aria-label="Pickup time">
            <label><input type="radio" name="slot" value="asap" ${S.slot === 'asap' ? 'checked' : ''}><span><b>ASAP</b><small>about ${prep} min</small></span></label>
            ${slots().map((t) => `<label><input type="radio" name="slot" value="${t}" ${String(S.slot) === String(t) ? 'checked' : ''}><span><b>${clock(t)}</b><small>today</small></span></label>`).join('')}
          </div>

          <label class="field"><span>Note for the kitchen <em>(optional)</em></span>
            <textarea id="fNote" rows="2" maxlength="160" placeholder="Anything we should know?">${esc(S.note)}</textarea></label>
        </section>

        <section class="drawer__step" ${S.step !== 2 ? 'inert' : ''}>
          <h2 class="display">Confirm & pay</h2>
          <div class="summary">
            <div><span>Collecting</span><b>${esc(S.details.name || '—')} · ${esc(S.details.phone || '—')}</b></div>
            <div><span>Pickup</span><b>${S.slot === 'asap' ? `ASAP, about ${prep} min` : 'Today at ' + clock(+S.slot)}</b></div>
            <div><span>Items</span><b>${cartCount()}</b></div>
          </div>
          <h3 class="drawer__sub">How would you like to pay?</h3>
          <div class="choice choice--stack" role="radiogroup" aria-label="Payment">
            <label><input type="radio" name="pay" value="counter" ${S.pay === 'counter' ? 'checked' : ''}><span><b>Pay at the counter</b><small>Cash, card or mobile money when you collect</small></span></label>
            <label><input type="radio" name="pay" value="card" ${S.pay === 'card' ? 'checked' : ''}><span><b>Pay now by card</b><small>Demo only: no card is charged</small></span></label>
          </div>
          <dl class="totals">
            <div><dt>Subtotal (excl. VAT)</dt><dd>${rs(total - vatOf(total))}</dd></div>
            <div><dt>VAT ${Math.round(B.vatRate * 100)}%</dt><dd>${rs(vatOf(total))}</dd></div>
            <div class="totals__big"><dt>Total</dt><dd>${rs(total)}</dd></div>
          </dl>
          <p class="demo-note">This is a demo site. Placing the order creates a ticket and receipt in your browser only.</p>
        </section>
      </div></div>

      ${empty ? '' : `
      <footer class="drawer__foot">
        <div class="drawer__total"><span>Total <small>VAT incl.</small></span><b>${rs(total)}</b></div>
        <button class="btn btn--red btn--lg btn--block" data-action="cart-next">
          ${['Continue to details', 'Review order', `Place order · ${rs(total)}`][S.step]} ${ic('arrow')}
        </button>
      </footer>`}
    </div>`;
  }

  function readCartForm() {
    const n = $('#fName'), p = $('#fPhone'), note = $('#fNote');
    if (n) S.details.name = n.value.trim();
    if (p) S.details.phone = p.value.trim();
    if (note) S.note = note.value.trim();
    const slot = $('#cart input[name="slot"]:checked'); if (slot) S.slot = slot.value;
    const pay = $('#cart input[name="pay"]:checked'); if (pay) S.pay = pay.value;
    store.set('details', S.details);
  }

  function validateDetails() {
    S.errors = {};
    if (S.details.name.length < 2) S.errors.name = 'Please enter your name so we can call your order.';
    const digits = S.details.phone.replace(/\D/g, '').replace(/^230/, '');
    if (digits.length < 7 || digits.length > 8) S.errors.phone = 'Enter a valid Mauritian number, e.g. 5712 3456.';
    return Object.keys(S.errors).length === 0;
  }

  function nextNumber() {
    const day = new Date().toDateString();
    const c = store.get('counter', { day, n: 0 });
    const n = c.day === day ? c.n + 1 : 1;
    store.set('counter', { day, n });
    return 'Q-' + pad(n, 3);
  }

  async function placeOrder() {
    if (!S.cart.length) return;
    const total = cartTotal();
    const ov = $('#overlay');
    $('#ovTitle').textContent = S.pay === 'card' ? 'Authorising payment (demo)…' : 'Sending to the kitchen…';
    $('#ovMsg').textContent = 'Hold tight, we are printing your ticket.';
    ov.hidden = false;
    await wait(REDUCED ? 300 : 1700);

    const order = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      number: nextNumber(),
      code: String(1000 + Math.floor(Math.random() * 9000)),
      createdAt: Date.now(),
      prep: prepMinutes(),
      slot: S.slot === 'asap' ? null : +S.slot,
      customer: { ...S.details },
      note: S.note,
      pay: S.pay,
      lines: S.cart.map((l) => {
        const item = byId(l.id);
        return { id: l.id, name: item.name, img: item.img, qty: l.qty, unit: l.unit, opts: selSummary(item, l.sel), note: l.note, sel: l.sel };
      }),
      total, vat: vatOf(total),
    };
    S.orders.unshift(order);
    S.orders = S.orders.slice(0, 30);
    store.set('orders', S.orders);
    S.cart = []; S.step = 0; S.note = ''; S.slot = 'asap';
    saveCart();

    await closeDialog($('#cart'));
    ov.hidden = true;
    S.celebrate = order.id;
    location.hash = '#/order/' + order.id;
  }

  /* ------------------------------------------------------------------ ORDERS */
  function stageOf(o) {
    if (o.collectedAt) return 'collected';
    const t = Date.now() - o.createdAt;
    if (t < SIM.received) return 'received';
    if (t < SIM.ready) return 'preparing';
    return 'ready';
  }
  const payText = (o) => (o.pay === 'card' ? 'Card (demo, not charged)' : 'Pay at counter');
  const pickupText = (o) => (o.slot ? 'Today at ' + clock(o.slot) : 'Around ' + clock(o.createdAt + o.prep * 60000));
  const dateText = (ts) => new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  function viewOrders() {
    return `
    <section class="page-head">
      <div class="wrap"><p class="script">Mo komann</p><h1 class="display">My Orders</h1>
        <p class="page-head__sub">Orders placed on this device. Open one to track it or get the receipt.</p></div>
      <div class="stripes stripes--head" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </section>
    <div class="wrap orders">
      ${S.orders.length ? S.orders.map((o, n) => {
        const st = stageOf(o);
        return `
        <article class="ocard reveal" style="--i:${n % 6}">
          <a class="ocard__main" href="#/order/${o.id}">
            <div class="ocard__no">${o.number}</div>
            <div class="ocard__info">
              <span class="chip chip--${st}">${STAGE_TEXT[st][0]}</span>
              <p>${o.lines.map((l) => `${l.qty}× ${esc(l.name)}`).join(', ')}</p>
              <small>${dateText(o.createdAt)}</small>
            </div>
            <div class="ocard__total">${rs(o.total)}</div>
          </a>
          <div class="ocard__acts">
            <a class="text-btn" href="#/order/${o.id}">${ic('orders')} Track & receipt</a>
            <button class="text-btn" data-action="reorder" data-id="${o.id}">${ic('plus')} Order again</button>
          </div>
        </article>`;
      }).join('') : `
      <div class="empty">
        <div class="empty__art">${ic('orders')}</div>
        <h3 class="display">No orders yet</h3>
        <p>Your Q-Skip tickets and receipts will show up here.</p>
        <a class="btn btn--red btn--lg" href="#/menu">Start an order ${ic('arrow')}</a>
      </div>`}
    </div>`;
  }

  function qrSvg(text) {
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(text); qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    } catch { return ''; }
  }
  const qrText = (o) => `KOTNOU|${o.number}|${o.code}|${o.total}`;

  function trackerHtml(o) {
    const st = stageOf(o), idx = STAGES.indexOf(st);
    const t = Date.now() - o.createdAt;
    const cook = Math.max(0, Math.min(1, (t - SIM.received) / (SIM.ready - SIM.received)));
    const fill = st === 'received' ? 6 : st === 'preparing' ? 33 + cook * 33 : st === 'ready' ? 67 : 100;
    return `
      <div class="ticket__status ticket__status--${st}">
        <span class="chip chip--${st}">${st === 'preparing' ? ic('flame') : ic(st === 'received' ? 'clock' : 'check')}${STAGE_TEXT[st][0]}</span>
        <h2 class="display">${STAGE_TEXT[st][0]}</h2>
        <p>${STAGE_TEXT[st][1]}</p>
      </div>
      <div class="track" style="--fill:${fill}%">
        <div class="track__bar"><i></i></div>
        <ol>${STAGES.map((s, i) => `<li class="${i < idx ? 'is-done' : i === idx ? 'is-on' : ''}"><span>${i < idx || st === 'collected' ? ic('check') : i + 1}</span>${STAGE_TEXT[s][0].replace('Order ', '').replace(' to collect!', '')}</li>`).join('')}</ol>
      </div>
      ${st === 'ready' ? `<button class="btn btn--yellow btn--lg btn--block" data-action="collect" data-id="${o.id}">${ic('check')} I've collected my order</button>` : ''}
      ${st === 'received' || st === 'preparing' ? `<p class="ticket__eta">${ic('clock')} Pickup: <b>${pickupText(o)}</b></p>` : ''}`;
  }

  function receiptHtml(o) {
    return `
    <div class="receipt" id="receipt">
      <div class="receipt__brand">KOT NOU</div>
      <p class="receipt__c">${esc(B.tagline)}<br>${esc(B.address)}<br>${esc(B.phone)} · ${esc(B.vatNo)}</p>
      <div class="receipt__rule"></div>
      <div class="receipt__row"><span>Order</span><b>${o.number}</b></div>
      <div class="receipt__row"><span>Date</span><span>${dateText(o.createdAt)}</span></div>
      <div class="receipt__row"><span>Type</span><span>Takeaway · Q-Skip</span></div>
      <div class="receipt__row"><span>Name</span><span>${esc(o.customer.name)}</span></div>
      <div class="receipt__rule"></div>
      ${o.lines.map((l) => `
        <div class="receipt__row receipt__row--item"><span>${l.qty} × ${esc(l.name)}</span><span>${rs(l.unit * l.qty)}</span></div>
        ${l.opts.map((x) => `<div class="receipt__opt">${esc(x)}</div>`).join('')}
        ${l.note ? `<div class="receipt__opt">Note: ${esc(l.note)}</div>` : ''}`).join('')}
      <div class="receipt__rule"></div>
      <div class="receipt__row"><span>Subtotal excl. VAT</span><span>${rs(o.total - o.vat)}</span></div>
      <div class="receipt__row"><span>VAT ${Math.round(B.vatRate * 100)}%</span><span>${rs(o.vat)}</span></div>
      <div class="receipt__row receipt__row--total"><span>TOTAL</span><span>${rs(o.total)}</span></div>
      <div class="receipt__row"><span>Payment</span><span>${payText(o)}</span></div>
      ${o.note ? `<div class="receipt__opt">Kitchen note: ${esc(o.note)}</div>` : ''}
      <div class="receipt__rule"></div>
      <div class="receipt__qr">${qrSvg(qrText(o))}</div>
      <p class="receipt__c">Pickup code <b class="receipt__code">${o.code}</b></p>
      <p class="receipt__c receipt__thanks">Mersi! Nou trouv twa talere.</p>
      <p class="receipt__c receipt__demo">Demo receipt · not a tax invoice</p>
    </div>`;
  }

  function viewOrder() {
    const o = S.orders.find((x) => x.id === S.arg);
    if (!o) {
      return `<section class="page-head"><div class="wrap"><h1 class="display">Order not found</h1><p class="page-head__sub">This ticket isn't saved on this device.</p><a class="btn btn--red" href="#/orders">My orders</a></div></section>`;
    }
    return `
    <section class="page-head page-head--slim">
      <div class="wrap"><a class="link-arrow link-arrow--back" href="#/orders">${ic('back')} All orders</a></div>
      <div class="stripes stripes--head" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </section>
    <div class="wrap order">
      <div class="ticket">
        <div class="ticket__top">
          <div><small>Q-Skip order</small><div class="ticket__no">${o.number}</div></div>
          <div class="ticket__codebox"><small>Pickup code</small><b>${o.code.split('').join(' ')}</b></div>
        </div>
        <div class="ticket__tear"></div>
        <div id="tracker">${trackerHtml(o)}</div>
        <p class="demo-note demo-note--dark">Demo kitchen: stages advance on a timer so you can see the full flow in under a minute.</p>
      </div>

      <div class="order__side">
        ${receiptHtml(o)}
        <div class="order__acts">
          <button class="btn btn--dark" data-action="print-receipt">${ic('print')} Print / save PDF</button>
          <button class="btn btn--line" data-action="download-receipt" data-id="${o.id}">${ic('download')} Download image</button>
        </div>
        <button class="text-btn" data-action="reorder" data-id="${o.id}">${ic('plus')} Order the same again</button>
      </div>
    </div>`;
  }

  function mountOrder() {
    const o = S.orders.find((x) => x.id === S.arg);
    if (!o) return;
    let last = stageOf(o);
    if (S.celebrate === o.id) {
      S.celebrate = null;
      setTimeout(() => { window.FX.confetti(); toast(`Order ${o.number} placed. Mersi, ${o.customer.name}!`); }, 700);
    }
    const tick = setInterval(() => {
      const st = stageOf(o);
      const tr = $('#tracker');
      if (!tr) return;
      if (st !== last) {
        last = st;
        tr.innerHTML = trackerHtml(o);
        if (st === 'ready') { window.FX.confetti(); toast(`${o.number} is ready to collect!`, 'flame'); document.title = `Ready! ${o.number} · Kot Nou`; }
      } else if (st === 'preparing') {
        const cook = Math.min(1, (Date.now() - o.createdAt - SIM.received) / (SIM.ready - SIM.received));
        $('.track', tr)?.style.setProperty('--fill', 33 + cook * 33 + '%');
      }
    }, 1000);
    S.cleanup.push(() => { clearInterval(tick); document.title = 'Kot Nou — Mauritian Street Kitchen · Q-Skip Takeaway'; });
  }

  function reorder(id) {
    const o = S.orders.find((x) => x.id === id);
    if (!o) return;
    let added = 0;
    for (const l of o.lines) {
      const item = byId(l.id);
      if (!item) continue;
      const key = lineKey(l.id, l.sel, l.note || '');
      const same = S.cart.find((c) => c.key === key);
      if (same) same.qty = Math.min(20, same.qty + l.qty);
      else S.cart.push({ key, id: l.id, qty: l.qty, sel: l.sel, note: l.note || '', unit: unitPrice(item, l.sel) });
      added += l.qty;
    }
    saveCart();
    toast(`${added} item${added === 1 ? '' : 's'} added from ${o.number}`);
    S.step = 0; renderCart(); openDialog($('#cart'));
  }

  /* Draws the receipt on a canvas so it can be saved as a PNG. */
  function downloadReceipt(id) {
    const o = S.orders.find((x) => x.id === id);
    if (!o) return;
    const W = 420, P = 26, LH = 20, mono = '13px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
    const rows = [];
    const row = (l, r = '', style = '') => rows.push({ l, r, style });
    const rule = () => rows.push({ rule: true });
    row('Order', o.number, 'b'); row('Date', dateText(o.createdAt)); row('Type', 'Takeaway · Q-Skip'); row('Name', o.customer.name); rule();
    const m = document.createElement('canvas').getContext('2d'); m.font = mono;
    const wrap = (text, max) => {
      const out = []; let cur = '';
      for (const w of text.split(' ')) {
        if (m.measureText(cur + ' ' + w).width > max && cur) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
      }
      if (cur) out.push(cur);
      return out;
    };
    for (const l of o.lines) {
      row(`${l.qty} x ${l.name}`, rs(l.unit * l.qty), 'b');
      [...l.opts, ...(l.note ? ['Note: ' + l.note] : [])].forEach((x) => wrap(x, W - P * 2 - 16).forEach((ln) => row('  ' + ln, '', 'dim')));
    }
    rule();
    row('Subtotal excl. VAT', rs(o.total - o.vat)); row(`VAT ${Math.round(B.vatRate * 100)}%`, rs(o.vat));
    row('TOTAL', rs(o.total), 'big'); row('Payment', payText(o));
    if (o.note) wrap('Kitchen note: ' + o.note, W - P * 2).forEach((ln) => row(ln, '', 'dim'));
    rule();

    const QR = 150, headH = 128;
    const bodyH = rows.reduce((h, r) => h + (r.rule ? 16 : r.style === 'big' ? 30 : LH), 0);
    const H = headH + bodyH + QR + 120;
    const dpr = 2, c = document.createElement('canvas');
    c.width = W * dpr; c.height = H * dpr;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    x.fillStyle = '#fffdf7'; x.fillRect(0, 0, W, H);
    window.FX.FLAG.forEach((col, i) => { x.fillStyle = col; x.fillRect((W / 4) * i, 0, W / 4, 8); });
    x.fillStyle = '#15110e'; x.textAlign = 'center';
    x.font = '36px Anton, Impact, sans-serif'; x.fillText('KOT NOU', W / 2, 58);
    x.font = mono; x.fillStyle = '#6b6259';
    x.fillText(B.tagline, W / 2, 80); x.fillText(B.address, W / 2, 98); x.fillText(`${B.phone} · ${B.vatNo}`, W / 2, 116);
    let y = headH;
    const dash = (yy) => { x.strokeStyle = '#b9b0a4'; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(P, yy); x.lineTo(W - P, yy); x.stroke(); x.setLineDash([]); };
    dash(y - 6); y += 12;
    for (const r of rows) {
      if (r.rule) { dash(y - 4); y += 16; continue; }
      const big = r.style === 'big';
      x.font = big ? 'bold 18px "JetBrains Mono", ui-monospace, monospace' : (r.style === 'b' ? 'bold ' : '') + mono;
      x.fillStyle = r.style === 'dim' ? '#6b6259' : '#15110e';
      if (big) y += 6;
      x.textAlign = 'left'; x.fillText(r.l, P, y);
      x.textAlign = 'right'; x.fillText(r.r, W - P, y);
      y += big ? 24 : LH;
    }
    try {
      const qr = window.qrcode(0, 'M'); qr.addData(qrText(o)); qr.make();
      const n = qr.getModuleCount(), cell = QR / n, ox = (W - QR) / 2;
      x.fillStyle = '#15110e';
      for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) if (qr.isDark(r, q)) x.fillRect(ox + q * cell, y + r * cell, Math.ceil(cell), Math.ceil(cell));
    } catch { /* QR is a nice-to-have */ }
    y += QR + 28;
    x.textAlign = 'center'; x.fillStyle = '#15110e';
    x.font = mono; x.fillText('Pickup code', W / 2, y);
    x.font = 'bold 26px "JetBrains Mono", ui-monospace, monospace'; x.fillText(o.code.split('').join(' '), W / 2, y + 30);
    x.font = mono; x.fillStyle = '#6b6259';
    x.fillText('Mersi! Nou trouv twa talere.', W / 2, y + 56);
    x.fillText('Demo receipt · not a tax invoice', W / 2, y + 74);

    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `kot-nou-receipt-${o.number}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Receipt image downloaded', 'download');
    }, 'image/png');
  }

  /* ------------------------------------------------------------------- ABOUT */
  function viewAbout() {
    const st = openState();
    return `
    <section class="page-head">
      <div class="wrap"><p class="script">Vinn get nou</p><h1 class="display">Find Us</h1>
        <p class="page-head__sub">One kitchen, one counter, zero queue. Takeaway only.</p></div>
      <div class="stripes stripes--head" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </section>
    <div class="wrap about">
      <div class="about__img reveal"><img src="img/hero-morne.jpg" alt="Aerial view of the Mauritian coast" loading="lazy" width="1920" height="1080"></div>
      <div class="about__cards">
        <div class="info reveal" style="--i:0">${ic('about')}<h3>Where</h3><p>${esc(B.address)}</p>
          <a class="link-arrow" href="${B.maps}" target="_blank" rel="noopener">Open in Maps ${ic('arrow')}</a></div>
        <div class="info reveal" style="--i:1">${ic('clock')}<h3>When</h3>
          <p>Every day, ${hm(B.hours[0])} – ${hm(B.hours[1])}</p>
          <span class="status status--solid ${st.open ? 'is-open' : 'is-closed'}"><i></i>${st.text}</span></div>
        <div class="info reveal" style="--i:2">${ic('phone')}<h3>Talk to us</h3>
          <p><a href="tel:${B.phone.replace(/\s/g, '')}">${esc(B.phone)}</a><br>${esc(B.email)}</p></div>
        <div class="info info--dark reveal" style="--i:3">${ic('bag')}<h3>Q-Skip counter</h3>
          <p>Ordered online? Don't join the line. The Q-Skip counter is on the right as you walk in. Show your order number and pickup code.</p>
          <a class="btn btn--yellow" href="#/menu">Order now ${ic('arrow')}</a></div>
      </div>
      <div class="about__gallery">
        <figure class="reveal" style="--i:0"><img src="img/market.jpg" alt="A fruit seller at a Mauritian market" loading="lazy" width="900" height="1100"><figcaption>Produce from the bazaar, every morning</figcaption></figure>
        <figure class="reveal" style="--i:1"><img src="img/hero-wok.jpg" alt="A chef tossing food in a flaming wok" loading="lazy" width="1920" height="1080"><figcaption>Cooked to order over a real flame</figcaption></figure>
        <figure class="reveal" style="--i:2"><img src="img/hero-lagoon.jpg" alt="A turquoise lagoon in Mauritius" loading="lazy" width="1920" height="1080"><figcaption>Take it to the beach. We won't tell.</figcaption></figure>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ ROUTER */
  const VIEWS = {
    home: [viewHome, mountHome], menu: [viewMenu, mountMenu], orders: [viewOrders, null],
    order: [viewOrder, mountOrder], about: [viewAbout, null],
  };
  function parseHash() {
    const [view = 'home', arg = null] = location.hash.replace(/^#\/?/, '').split('/');
    return VIEWS[view] ? { view, arg } : { view: 'home', arg: null };
  }

  function draw({ view, arg }) {
    S.cleanup.splice(0).forEach((fn) => fn());
    S.view = view; S.arg = arg;
    const [render, mount] = VIEWS[view];
    document.body.dataset.view = view;
    $('#view').innerHTML = render();
    const tab = view === 'order' ? 'orders' : view;
    $$('[data-tab]').forEach((a) => a.classList.toggle('is-on', a.dataset.tab === tab));
    if (mount) mount();
    observe($('#view'));
    window.scrollTo(0, 0);
    onScroll();
  }

  async function navigate(first = false) {
    const r = parseHash();
    if (!first && r.view === 'menu' && S.view === 'menu') {
      S.arg = r.arg;
      S.menuCat = CATS.some((c) => c.id === r.arg) ? r.arg : 'all';
      S.query = ''; const q = $('#q'); if (q) q.value = '';
      renderMenuBody();
      return;
    }
    const token = ++S.navToken;
    const cur = $('#curtain');
    if (first || REDUCED) { draw(r); return; }
    cur.className = 'curtain is-in';
    await wait(560);
    if (token !== S.navToken) return;
    draw(r);
    cur.className = 'curtain is-out';
    await wait(620);
    if (token === S.navToken) cur.className = 'curtain';
  }

  function onScroll() {
    $('#header').classList.toggle('is-solid', window.scrollY > 24);
  }

  /* ----------------------------------------------------------------- ACTIONS */
  const ACTIONS = {
    'open-item': (el) => openItem(el.dataset.id),
    'close-sheet': () => closeDialog($('#sheet')),
    'sheet-qty': (el) => { S.sheet.qty = Math.max(1, Math.min(20, S.sheet.qty + Number(el.dataset.d))); syncSheet(); },
    'sheet-add': () => addFromSheet(),
    'open-cart': () => { S.step = 0; S.errors = {}; renderCart(); openDialog($('#cart')); },
    'close-cart': () => closeDialog($('#cart')),
    'close-cart-menu': () => { closeDialog($('#cart')); if (S.view !== 'menu') location.hash = '#/menu'; },
    'cart-back': () => { readCartForm(); S.step = Math.max(0, S.step - 1); renderCart(); },
    'cart-next': () => {
      readCartForm();
      if (S.step === 0) { S.step = 1; renderCart(); setTimeout(() => $('#fName')?.focus({ preventScroll: true }), 420); return; }
      if (S.step === 1) {
        if (!validateDetails()) { renderCart(); $('#cart .has-err input')?.focus(); return; }
        S.step = 2; renderCart(); return;
      }
      placeOrder();
    },
    'line-qty': (el) => {
      const l = S.cart.find((x) => x.key === el.dataset.key);
      if (!l) return;
      l.qty += Number(el.dataset.d);
      if (l.qty <= 0) S.cart = S.cart.filter((x) => x !== l);
      else l.qty = Math.min(20, l.qty);
      saveCart(); renderCart();
    },
    'line-edit': (el) => { const l = S.cart.find((x) => x.key === el.dataset.key); if (l) openItem(l.id, l.key); },
    'menu-cat': (el) => {
      const cat = el.dataset.cat;
      const target = cat === 'all' ? '#/menu' : '#/menu/' + cat;
      if (location.hash === target) { S.query = ''; $('#q').value = ''; S.menuCat = cat; renderMenuBody(); } else location.hash = target;
      const bar = $('#chipsBar');
      if (bar && bar.getBoundingClientRect().top <= 80) window.scrollTo({ top: $('#menuBody').offsetTop - 150, behavior: REDUCED ? 'auto' : 'smooth' });
    },
    'clear-search': () => { S.query = ''; $('#q').value = ''; renderMenuBody(); },
    'hero-go': (el) => S.heroGo?.(Number(el.dataset.n)),
    'scroll-to': (el, e) => { e.preventDefault(); $(el.dataset.target)?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); },
    collect: (el) => {
      const o = S.orders.find((x) => x.id === el.dataset.id);
      if (!o) return;
      o.collectedAt = Date.now(); store.set('orders', S.orders);
      $('#tracker').innerHTML = trackerHtml(o);
      toast('Bon apeti!', 'star');
    },
    reorder: (el) => reorder(el.dataset.id),
    'print-receipt': () => window.print(),
    'download-receipt': (el) => downloadReceipt(el.dataset.id),
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el) { ACTIONS[el.dataset.action]?.(el, e); return; }
    // Click on the dimmed backdrop closes a dialog.
    if (e.target instanceof HTMLDialogElement) closeDialog(e.target);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[role="button"][data-action]')) {
      e.preventDefault(); e.target.click();
    }
  });
  // Animate Esc-to-close instead of snapping shut.
  $$('dialog').forEach((d) => d.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(d); }));
  $('#sheet').addEventListener('change', syncSheet);
  $('#sheet').addEventListener('input', (e) => { if (e.target.id === 'sheetNote') S.sheet.note = e.target.value.trim(); });
  $('#sheet').addEventListener('submit', (e) => { e.preventDefault(); addFromSheet(); });
  $('#cart').addEventListener('change', readCartForm);
  window.addEventListener('hashchange', () => navigate());
  window.addEventListener('scroll', onScroll, { passive: true });

  /* -------------------------------------------------------------------- BOOT */
  async function boot() {
    renderChrome();
    saveCart();
    navigate(true);

    const loaderEl = $('#loader');
    const fx = window.FX.loader($('#loaderFx'));
    const msgs = ['Pe sof lapoel…', 'Pe koup legim…', 'Pe roul dholl puri…', 'Preske pare!'];
    const bar = $('#loaderBar'), pct = $('#loaderPct'), msg = $('#loaderMsg');
    let done = 0;
    const assets = ['hero-wok', 'hero-lagoon', 'hero-palms', 'mine-frite', 'dholl-puri', 'gato-pima'];
    const total = assets.length + 1;
    const step = () => {
      done++;
      const p = done / total;
      fx.set(p);
      bar.style.transform = `scaleX(${p})`;
      pct.textContent = Math.round(p * 100);
      msg.textContent = msgs[Math.min(msgs.length - 1, Math.floor(p * msgs.length))];
    };
    const load = (name) => new Promise((res) => { const im = new Image(); im.onload = im.onerror = res; im.src = `img/${name}.jpg`; }).then(step);
    const fonts = (document.fonts?.ready || Promise.resolve()).then(step);
    const minTime = wait(REDUCED ? 0 : 2200);
    await Promise.race([Promise.all([...assets.map(load), fonts, minTime]), wait(6000)]);
    fx.set(1); bar.style.transform = 'scaleX(1)'; pct.textContent = '100';
    await wait(REDUCED ? 0 : 450);

    loaderEl.classList.add('is-done');
    document.body.classList.remove('is-loading');
    setTimeout(() => { fx.stop(); loaderEl.remove(); }, 1100);
  }
  boot();
})();
