/* WebLuxe Foods — single-page app: tabs, menu, item options, cart, Q-Skip checkout, order ticket, receipt.
   Runs entirely in the browser. Orders are saved in localStorage and sent to the restaurant by WhatsApp. */
(() => {
  'use strict';

  const { brand: B, categories: CATS, items: ITEMS } = window.MENU;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rs = (n) => 'Rs ' + Math.round(n).toLocaleString('en-US');
  const byId = (id) => ITEMS.find((i) => i.id === id);
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const hm = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  const clock = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const buzz = (ms = 10) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };
  const TITLE = document.title;
  const TEL = 'tel:' + B.phone.replace(/\s/g, '');

  const store = {
    get(k, d) { try { const v = localStorage.getItem('wl:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('wl:' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  /* Demo kitchen: the ticket moves through its stages on a timer so the whole flow can be seen in a minute. */
  const SIM = { received: 7000, ready: 45000 };
  const STAGES = ['received', 'preparing', 'ready', 'collected'];
  const STAGE_TEXT = {
    received: ['Order received', 'The kitchen has your ticket.'],
    preparing: ['On the fire', 'Your food is being cooked right now.'],
    ready: ['Ready to collect!', 'Walk past the queue and show this screen at the Q-Skip counter.'],
    collected: ['Collected', 'Bon apeti! Mersi, nou trouv twa talere.'],
  };
  const PAY = { cash: 'Cash at the counter', card: 'Card at the counter', juice: 'Juice / mobile money' };

  const S = {
    cart: store.get('cart', []).filter((l) => byId(l.id)),
    orders: store.get('orders', []),
    details: store.get('details', { name: '', phone: '' }),
    note: '', pay: 'cash', slot: 'asap',
    view: null, arg: null, step: 0, sheet: null, query: '', menuCat: 'all',
    cleanup: [], navToken: 0, errors: {}, px: null, py: null,
  };

  /* ------------------------------------------------------------------ icons */
  const ICON = {
    home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    menu: '<path d="M4 3v8a3 3 0 0 0 3 3v7M7 3v8M10 3v8a3 3 0 0 1-3 3M17 21V3c-2.5 1-4 4-4 8h4"/>',
    orders: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    about: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    bag: '<path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    chat: '<path d="M4 20l1.4-4.2A8 8 0 1 1 8.6 19z"/><path d="M9 10.5c.5 2 2 3.5 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
    leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15zM5 19l8-8"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  };
  const ic = (name) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;
  const LOGO = '<img class="logo__mark" src="img/mark.svg" alt="" width="40" height="40"><span class="logo__text">WebLuxe<em>Foods</em></span>';

  /* Responsive WebP: a small file for phones/cards, a larger one for big slots. */
  function pic(name, alt, sizes, opt = {}) {
    const [s, l] = opt.wide ? [820, 1600] : [420, 800];
    return `<img src="img/${name}-sm.webp" srcset="img/${name}-sm.webp ${s}w, img/${name}.webp ${l}w" sizes="${sizes}" alt="${esc(alt)}" decoding="async" ${opt.eager ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
  }

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

  function saveCart(bump = true) {
    store.set('cart', S.cart);
    const n = cartCount();
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = n;
      el.classList.toggle('is-empty', n === 0);
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    const pill = $('#cartPill');
    if (pill) {
      pill.classList.toggle('show', n > 0);
      $('#pillText').textContent = `${n} item${n === 1 ? '' : 's'} · ${rs(cartTotal())}`;
    }
  }

  /* ----------------------------------------------------------------- utils */
  function toast(msg, icon = 'check') {
    const box = $('#toasts');
    while (box.children.length > 1) box.firstChild.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${ic(icon)}<span>${esc(msg)}</span>`;
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2600);
  }

  /* Blur first: when a dialog closes the browser hands focus back to whatever had it and scrolls that into
     view, which made the page jump under the sheet. With nothing focused there is nothing to scroll to. */
  function openDialog(d) {
    if (d.open) return;
    document.activeElement?.blur?.();
    d.classList.remove('closing'); d.style.transform = '';
    d.showModal();
  }
  async function closeDialog(d) {
    if (!d.open || d.classList.contains('closing')) return;
    d.classList.add('closing');
    await wait(REDUCED ? 0 : 260);
    d.close();
    d.classList.remove('closing');
    d.style.transform = '';
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
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  function observe(root = document) { $$('.reveal, [data-count]', root).forEach((el) => revealer.observe(el)); }

  function tween(from, to, ms, fn) {
    if (REDUCED || from === to) { fn(to); return; }
    const t0 = performance.now();
    (function step(t) {
      const p = Math.min(1, Math.max(0, (t - t0) / ms));
      fn(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  const countUp = (el) => tween(0, Number(el.dataset.count), 1300, (v) => { el.textContent = Math.round(v); });

  function flyToCart(fromEl) {
    const target = $$('[data-action="open-cart"]').find((b) => b.offsetParent !== null);
    if (REDUCED || !fromEl || !target) return;
    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const size = Math.min(a.width, a.height, 150);
    const ghost = document.createElement('img');
    ghost.src = fromEl.currentSrc || fromEl.src;
    ghost.className = 'fly-ghost';
    const x0 = a.left + a.width / 2 - size / 2, y0 = a.top + a.height / 2 - size / 2;
    Object.assign(ghost.style, { left: x0 + 'px', top: y0 + 'px', width: size + 'px', height: size + 'px' });
    document.body.appendChild(ghost);
    const dx = b.left + b.width / 2 - (x0 + size / 2);
    const dy = b.top + b.height / 2 - (y0 + size / 2);
    ghost.animate([
      { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
      { transform: `translate3d(${dx * 0.45}px, ${Math.min(dy * 0.5, -40) - 40}px, 0) scale(.6)`, opacity: 1, offset: 0.5 },
      { transform: `translate3d(${dx}px, ${dy}px, 0) scale(.12)`, opacity: 0.3 },
    ], { duration: 650, easing: 'cubic-bezier(.5,0,.2,1)' }).onfinish = () => ghost.remove();
  }

  /* ------------------------------------------------------------ item cards */
  const TAGS = { best: ['Bestseller', 'star'], veg: ['Veg', 'leaf'], spicy: ['Spicy', 'flame'], new: ['New', 'plus'] };
  const tagHtml = (t) => (TAGS[t] ? `<span class="tag tag--${t}">${ic(TAGS[t][1])}${TAGS[t][0]}</span>` : '');
  function card(i, n = 0) {
    return `
    <article class="card reveal" style="--i:${n % 6}" data-action="open-item" data-id="${i.id}" tabindex="0" role="button" aria-label="${esc(i.name)}, ${rs(i.price)}. Choose options">
      <div class="card__media">
        ${pic(i.img, i.name, '(max-width: 560px) 130px, (max-width: 1100px) 46vw, 380px')}
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
        <a class="logo" href="#/home" aria-label="WebLuxe Foods home">${LOGO}</a>
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
      <div class="wrap site-footer__grid">
        <div>
          <div class="logo logo--lg">${LOGO}</div>
          <p class="site-footer__tag">${esc(B.tagline)}. Cooked fresh, collected fast.</p>
          <a class="btn btn--wa btn--sm" href="https://wa.me/${B.whatsapp}" target="_blank" rel="noopener">${ic('chat')} Chat on WhatsApp</a>
        </div>
        <div>
          <h4>Directly to</h4>
          <a href="#/menu">The menu</a><a href="#/orders">My orders</a><a href="#/about">Find us</a>
        </div>
        <div>
          <h4>Visit</h4>
          <p>${esc(B.address)}</p>
          <p>${hm(B.hours[0])} – ${hm(B.hours[1])}, every day</p>
          <a href="${TEL}">${esc(B.phone)}</a>
        </div>
        <div>
          <h4>Good to know</h4>
          <p>Takeaway only. Prices in Mauritian rupees, VAT included.</p>
          <p class="muted">Concept site by WebLuxe. Orders are sent by WhatsApp; the live tracker is a preview.</p>
        </div>
      </div>
      <div class="wrap site-footer__base">
        <span>© ${new Date().getFullYear()} WebLuxe Foods</span>
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
    { img: 'hero-mine', kicker: 'Lakwizinn morisien · Grand Baie', lines: ['Mine Frite.', 'Zero Queue.'] },
    { img: 'hero-kari', kicker: 'Slow-cooked kari, every morning', lines: ['Real', 'Kari.'] },
    { img: 'hero-spice', kicker: 'Order ahead with Q-Skip', lines: ['Skip the', 'Line.'] },
  ];
  const titleHtml = (lines) => lines.map((l, n) => `<span class="line"><span style="--d:${n}">${l}</span></span>`).join('');

  function viewHome() {
    const best = ITEMS.filter((i) => (i.tags || []).includes('best'));
    return `
    <section class="hero" id="hero">
      <div class="hero__slides" id="heroSlides">
        ${HERO.map((s, n) => `<div class="hero__slide${n === 0 ? ' is-on' : ''}">${pic(s.img, '', '100vw', { wide: true, eager: n === 0 })}</div>`).join('')}
      </div>
      <canvas class="hero__fx" id="heroFx" aria-hidden="true"></canvas>
      <div class="hero__inner wrap">
        <p class="kicker" id="heroKicker">${HERO[0].kicker}</p>
        <h1 class="hero__title" id="heroTitle">${titleHtml(HERO[0].lines)}</h1>
        <p class="hero__sub">Order on your phone, walk straight past the line and collect your takeaway hot from the Q-Skip counter.</p>
        <div class="hero__cta">
          <a class="btn btn--red btn--lg" href="#/menu">Order now ${ic('arrow')}</a>
          <a class="btn btn--ghost btn--lg" href="#qskip" data-action="scroll-to" data-target="#qskip">How Q-Skip works</a>
        </div>
      </div>
      <div class="hero__dots" id="heroDots">${HERO.map((_, n) => `<button class="${n === 0 ? 'is-on' : ''}" data-action="hero-go" data-n="${n}" aria-label="Slide ${n + 1}"><i></i></button>`).join('')}</div>
      <div class="hero__badge" aria-hidden="true">
        <svg viewBox="0 0 120 120"><defs><path id="ring" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0"/></defs>
          <text><textPath href="#ring">ORDER AHEAD · SKIP THE QUEUE · Q-SKIP · </textPath></text></svg>
        <img src="img/mark.svg" alt="" width="44" height="44">
      </div>
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
          <div class="rail-card__img">${pic(i.img, i.name, '290px')}</div>
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
            ${pic(c.img, '', n === 0 ? '(max-width: 820px) 92vw, 600px' : '(max-width: 820px) 46vw, 300px')}
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
          <h2 class="display reveal">No queue.<br>Just <span class="hl">Q-Skip</span></h2>
          <ol class="steps">
            <li class="reveal" style="--i:0"><span>1</span><div><b>Build your order</b><p>Pick your dishes and tune every one: spice level, sauces, extras, the lot.</p></div></li>
            <li class="reveal" style="--i:1"><span>2</span><div><b>Send it in one tap</b><p>Your order lands on our kitchen WhatsApp, and you get a ticket with a pickup code.</p></div></li>
            <li class="reveal" style="--i:2"><span>3</span><div><b>Skip the queue</b><p>Walk straight to the Q-Skip counter, show your code and collect.</p></div></li>
          </ol>
          <a class="btn btn--gold btn--lg reveal" href="#/menu">Start my order ${ic('arrow')}</a>
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
        <div class="story__img reveal">${pic('kiosk', 'A colourful Mauritian street food kiosk', '(max-width: 1100px) 92vw, 580px', { wide: true })}</div>
        <div class="story__copy">
          <p class="script reveal">Nou zistwar</p>
          <h2 class="display reveal">More than good food</h2>
          <p class="reveal">WebLuxe Foods cooks what Mauritians queue for at the tabagie and the bazaar: dholl puri rolled by hand, noodles tossed over a roaring flame, curries that take all morning. The only thing we took out is the queue.</p>
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
        if (!title.isConnected) return;
        $('#heroKicker').textContent = HERO[n].kicker;
        title.innerHTML = titleHtml(HERO[n].lines);
        title.classList.remove('swap');
      }, REDUCED ? 0 : 380);
    }
    const start = () => { clearInterval(timer); timer = setInterval(() => { if (!document.hidden) show((cur + 1) % HERO.length); }, 6500); };
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
          <input id="q" type="search" placeholder="Search mine frite, dholl puri…" value="${esc(S.query)}" autocomplete="off" enterkeyhint="search" aria-label="Search the menu">
        </label>
      </div>
      <span class="page-head__ghost" aria-hidden="true">Menu</span>
    </section>
    <div class="chips-bar" id="chipsBar">
      <div class="chips" id="chips" role="tablist" aria-label="Menu categories">
        <span class="chips__ink" id="chipsInk"></span>
        <button role="tab" data-action="menu-cat" data-cat="all">All</button>
        ${CATS.map((c) => `<button role="tab" data-action="menu-cat" data-cat="${c.id}">${esc(c.en)}</button>`).join('')}
      </div>
    </div>
    <div class="wrap menu-body" id="menuBody"></div>`;
  }

  function menuSection(c, n) {
    const list = ITEMS.filter((i) => i.cat === c.id);
    return `
    <section class="menu-sec" id="sec-${c.id}">
      <header class="menu-sec__head">
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
    moveInk(true);
  }

  /* Slides the dark pill under the active chip. Only ever scrolls the chip row itself, never the page. */
  function moveInk(center = false) {
    const ink = $('#chipsInk'), row = $('#chips'), on = $('#chips .is-on');
    if (!ink || !row) return;
    if (!on) { ink.style.opacity = 0; return; }
    ink.style.opacity = 1;
    ink.style.width = on.offsetWidth + 'px';
    ink.style.transform = `translate3d(${on.offsetLeft}px,0,0)`;
    if (center) {
      const left = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2;
      row.scrollTo({ left: Math.max(0, left), behavior: REDUCED ? 'auto' : 'smooth' });
    }
  }

  /* When the category bar is pinned, jump back to the top of the list so a shorter list can't yank the page around. */
  function resetMenuScroll() {
    const body = $('#menuBody');
    if (!body) return;
    const top = body.getBoundingClientRect().top + window.scrollY - $('#header').offsetHeight - $('#chipsBar').offsetHeight;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'instant' });
  }

  function mountMenu() {
    S.menuCat = CATS.some((c) => c.id === S.arg) ? S.arg : 'all';
    renderMenuBody();
    const q = $('#q');
    let deb = 0;
    q.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(() => { S.query = q.value; renderMenuBody(); }, 140); });
    let lastW = window.innerWidth;
    const onResize = () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; moveInk(); } };
    window.addEventListener('resize', onResize);
    S.cleanup.push(() => window.removeEventListener('resize', onResize));
    if (document.fonts?.ready) document.fonts.ready.then(() => moveInk());
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
      item, editKey, shown: 0,
      sel: line ? JSON.parse(JSON.stringify(line.sel)) : defaultSel(item),
      qty: line ? line.qty : 1,
      note: line ? line.note : '',
    };
    const sh = S.sheet;
    $('#sheet').innerHTML = `
      <form class="sheet__in" method="dialog" id="sheetForm">
        <span class="sheet__grab" aria-hidden="true"></span>
        <button type="button" class="icon-btn sheet__close" data-action="close-sheet" aria-label="Close">${ic('close')}</button>
        <div class="sheet__media" id="sheetMedia">
          ${pic(item.img, item.name, '(max-width: 820px) 100vw, 430px')}
          <div class="card__tags">${(item.tags || []).map(tagHtml).join('')}</div>
        </div>
        <div class="sheet__scroll" tabindex="-1" autofocus>
          <header class="sheet__head">
            <h2 class="display">${esc(item.name)}</h2>
            <span class="price">${rs(item.price)}</span>
            <p>${esc(item.desc)}</p>
          </header>
          ${(item.groups || []).map((g, gi) => `
          <fieldset class="og" data-g="${g.id}" style="--i:${gi}">
            <legend><span>${esc(g.name)}</span><em class="${g.type === 'single' ? 'req' : ''}">${groupHint(g)}</em></legend>
            ${g.options.map((o) => `
            <label class="opt">
              <input type="${g.type === 'single' ? 'radio' : 'checkbox'}" name="g-${g.id}" value="${o.id}" ${sh.sel[g.id].includes(o.id) ? 'checked' : ''}>
              <span class="opt__box">${ic('check')}</span>
              <span class="opt__name">${esc(o.name)}</span>
              <span class="opt__price">${o.price ? '+ ' + rs(o.price) : ''}</span>
            </label>`).join('')}
          </fieldset>`).join('')}
          <fieldset class="og" style="--i:${(item.groups || []).length}">
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
            <span>${editKey ? 'Update' : 'Add to order'}</span><b id="sheetTotal"></b>
          </button>
        </footer>
      </form>`;
    syncSheet(true);
    openDialog($('#sheet'));
    $('.sheet__scroll').scrollTop = 0;
  }

  /* Reads the form into state, enforces "up to N" limits and rolls the price on the button. */
  function syncSheet(instant = false) {
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
    const total = unitPrice(sh.item, sh.sel) * sh.qty;
    const out = $('#sheetTotal');
    out.dataset.value = total;
    if (instant) out.textContent = rs(total);
    else tween(sh.shown, total, 260, (v) => { if (out.isConnected && +out.dataset.value === total) out.textContent = rs(v); });
    sh.shown = total;
  }

  function addFromSheet() {
    const sh = S.sheet;
    if (!sh) return;
    syncSheet(true);
    const unit = unitPrice(sh.item, sh.sel);
    const key = lineKey(sh.item.id, sh.sel, sh.note);
    if (sh.editKey) {
      const idx = S.cart.findIndex((l) => l.key === sh.editKey);
      if (idx > -1) S.cart.splice(idx, 1);
    }
    const same = S.cart.find((l) => l.key === key);
    if (same) same.qty = Math.min(20, same.qty + sh.qty);
    else S.cart.push({ key, id: sh.item.id, qty: sh.qty, sel: sh.sel, note: sh.note, unit });
    buzz(14);
    if (!sh.editKey) flyToCart($('#sheetMedia img'));
    saveCart();
    toast(sh.editKey ? `${sh.item.name} updated` : `${sh.qty} × ${sh.item.name} added`);
    const wasEdit = sh.editKey;
    S.sheet = null;
    closeDialog($('#sheet'));
    if (wasEdit) renderCart();
  }

  /* Phones: drag the sheet down by its photo to dismiss it. */
  function sheetDrag() {
    const sheet = $('#sheet');
    let y0 = null, dy = 0;
    sheet.addEventListener('touchstart', (e) => {
      if (window.innerWidth >= 820 || !e.target.closest('.sheet__media, .sheet__grab')) return;
      y0 = e.touches[0].clientY; dy = 0;
      sheet.style.transition = 'none';
    }, { passive: true });
    sheet.addEventListener('touchmove', (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      sheet.style.transform = `translate3d(0,${dy}px,0)`;
    }, { passive: true });
    const end = () => {
      if (y0 === null) return;
      y0 = null;
      sheet.style.transition = '';
      if (dy > 110) { closeDialog(sheet); return; }
      sheet.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1)';
      sheet.style.transform = '';
      setTimeout(() => { sheet.style.transition = ''; }, 320);
    };
    sheet.addEventListener('touchend', end);
    sheet.addEventListener('touchcancel', end);
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
    <li class="line" data-key="${esc(l.key)}">
      <img src="img/${item.img}-sm.webp" alt="" width="72" height="72" decoding="async">
      <div class="line__main">
        <div class="line__top"><b>${esc(item.name)}</b><span class="line__price">${rs(l.unit * l.qty)}</span></div>
        ${opts.length ? `<ul class="line__opts">${opts.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
        ${l.note ? `<p class="line__note">“${esc(l.note)}”</p>` : ''}
        <div class="line__ctl">
          <div class="qty qty--sm">
            <button data-action="line-qty" data-d="-1" aria-label="Fewer">${ic(l.qty === 1 ? 'trash' : 'minus')}</button>
            <output>${l.qty}</output>
            <button data-action="line-qty" data-d="1" aria-label="More">${ic('plus')}</button>
          </div>
          <button class="text-btn" data-action="line-edit">${ic('edit')} Edit options</button>
        </div>
      </div>
    </li>`;
  }

  const NEXT_LABEL = () => ['Continue to details', 'Review order', 'Place order on WhatsApp'][S.step];

  /* Builds the whole drawer. `from` is the step we are coming from, so the panel can slide instead of jumping. */
  function renderCart(from = S.step) {
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

      <div class="drawer__view"><div class="drawer__track" id="cartTrack" style="transform:translate3d(-${from * 100}%,0,0)">

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
          <p class="muted">We call your order number at the Q-Skip counter.</p>
          <label class="field ${S.errors.name ? 'has-err' : ''}"><span>Your name</span>
            <input id="fName" maxlength="40" autocomplete="given-name" autocapitalize="words" enterkeyhint="next" value="${esc(S.details.name)}" placeholder="e.g. Darsh">${err('name')}</label>
          <label class="field ${S.errors.phone ? 'has-err' : ''}"><span>Mobile number</span>
            <input id="fPhone" type="tel" inputmode="tel" maxlength="16" autocomplete="tel" enterkeyhint="done" value="${esc(S.details.phone)}" placeholder="5xxx xxxx">${err('phone')}</label>

          <h3 class="drawer__sub">${ic('clock')} Pickup time</h3>
          <div class="choice choice--wrap" role="radiogroup" aria-label="Pickup time">
            <label><input type="radio" name="slot" value="asap" ${S.slot === 'asap' ? 'checked' : ''}><span><b>ASAP</b><small>~${prep} min</small></span></label>
            ${slots().map((t) => `<label><input type="radio" name="slot" value="${t}" ${String(S.slot) === String(t) ? 'checked' : ''}><span><b>${clock(t)}</b><small>today</small></span></label>`).join('')}
          </div>

          <label class="field"><span>Note for the kitchen <em>(optional)</em></span>
            <textarea id="fNote" rows="2" maxlength="160" placeholder="Anything we should know?">${esc(S.note)}</textarea></label>
        </section>

        <section class="drawer__step" ${S.step !== 2 ? 'inert' : ''}>
          <h2 class="display">Confirm order</h2>
          <div class="summary">
            <div><span>Collecting</span><b>${esc(S.details.name || '—')} · ${esc(S.details.phone || '—')}</b></div>
            <div><span>Pickup</span><b>${S.slot === 'asap' ? `ASAP, about ${prep} min` : 'Today at ' + clock(+S.slot)}</b></div>
            <div><span>Items</span><b>${cartCount()}</b></div>
          </div>
          <h3 class="drawer__sub">Pay when you collect</h3>
          <div class="choice choice--stack" role="radiogroup" aria-label="Payment">
            ${Object.entries(PAY).map(([k, v]) => `<label><input type="radio" name="pay" value="${k}" ${S.pay === k ? 'checked' : ''}><span><b>${v}</b></span></label>`).join('')}
          </div>
          <dl class="totals">
            <div><dt>Subtotal (excl. VAT)</dt><dd>${rs(total - vatOf(total))}</dd></div>
            <div><dt>VAT ${Math.round(B.vatRate * 100)}%</dt><dd>${rs(vatOf(total))}</dd></div>
            <div class="totals__big"><dt>Total</dt><dd>${rs(total)}</dd></div>
          </dl>
          <p class="demo-note">${ic('chat')} Placing the order opens WhatsApp with your order ready to send to ${esc(B.phone)}. Just press send.</p>
        </section>
      </div></div>

      ${empty ? '' : `
      <footer class="drawer__foot">
        <div class="drawer__total"><span>Total <small>VAT incl.</small></span><b id="cartTotal">${rs(total)}</b></div>
        <button class="btn ${S.step === 2 ? 'btn--wa' : 'btn--red'} btn--lg btn--block" data-action="cart-next">
          ${S.step === 2 ? ic('chat') : ''} <span>${NEXT_LABEL()}</span> ${S.step === 2 ? '' : ic('arrow')}
        </button>
      </footer>`}
    </div>`;

    if (from !== S.step) {
      const track = $('#cartTrack');
      void track.offsetWidth;                      // commit the starting position, then slide
      track.style.transform = `translate3d(-${S.step * 100}%,0,0)`;
    }
  }
  function goStep(n) { const from = S.step; S.step = n; renderCart(from); }

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

  /* The order as a WhatsApp message for the kitchen. */
  function waText(o) {
    const L = [`*New Q-Skip order ${o.number}*`, `${B.name} · Takeaway`, '',
      `Name: ${o.customer.name}`, `Mobile: ${o.customer.phone}`, `Pickup: ${pickupText(o)}`, `Payment: ${PAY[o.pay] || o.pay}`, ''];
    for (const l of o.lines) {
      L.push(`*${l.qty} x ${l.name}* — ${rs(l.unit * l.qty)}`);
      l.opts.forEach((x) => L.push(`   • ${x}`));
      if (l.note) L.push(`   • Note: ${l.note}`);
    }
    if (o.note) L.push('', `Kitchen note: ${o.note}`);
    L.push('', `*Total: ${rs(o.total)}* (VAT incl.)`, `Pickup code: ${o.code}`);
    return L.join('\n');
  }
  const waUrl = (o) => `https://wa.me/${B.whatsapp}?text=${encodeURIComponent(waText(o))}`;

  async function placeOrder() {
    if (!S.cart.length) return;
    const total = cartTotal();
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
    // Must happen inside the tap itself, or mobile browsers block the new window.
    try { window.open(waUrl(order), '_blank', 'noopener'); } catch { /* the ticket page has a manual button */ }
    buzz(20);

    S.orders.unshift(order);
    S.orders = S.orders.slice(0, 30);
    store.set('orders', S.orders);
    S.cart = []; S.step = 0; S.note = ''; S.slot = 'asap';
    saveCart(false);

    const ov = $('#overlay');
    ov.hidden = false;
    await wait(REDUCED ? 200 : 1300);
    $('#cart').close();
    S.celebrate = order.id;
    S.px = S.py = null;
    location.hash = '#/order/' + order.id;
    await wait(500);
    ov.hidden = true;
  }

  /* ------------------------------------------------------------------ ORDERS */
  function stageOf(o) {
    if (o.collectedAt) return 'collected';
    const t = Date.now() - o.createdAt;
    if (t < SIM.received) return 'received';
    if (t < SIM.ready) return 'preparing';
    return 'ready';
  }
  function pickupText(o) { return o.slot ? 'Today at ' + clock(o.slot) : 'ASAP, around ' + clock(o.createdAt + o.prep * 60000); }
  const dateText = (ts) => new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  function viewOrders() {
    return `
    <section class="page-head">
      <div class="wrap"><p class="script">Mo komann</p><h1 class="display">My Orders</h1>
        <p class="page-head__sub">Orders placed on this device. Open one for the ticket and receipt.</p></div>
      <span class="page-head__ghost" aria-hidden="true">Orders</span>
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
            <a class="text-btn" href="#/order/${o.id}">${ic('orders')} Ticket & receipt</a>
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
  const qrText = (o) => `WEBLUXE|${o.number}|${o.code}|${o.total}`;

  function trackerHtml(o) {
    const st = stageOf(o), idx = STAGES.indexOf(st);
    const t = Date.now() - o.createdAt;
    const cook = Math.max(0, Math.min(1, (t - SIM.received) / (SIM.ready - SIM.received)));
    const fill = st === 'received' ? 0.06 : st === 'preparing' ? 0.33 + cook * 0.33 : st === 'ready' ? 0.67 : 1;
    return `
      <div class="ticket__status ticket__status--${st}">
        <span class="chip chip--${st}">${st === 'preparing' ? ic('flame') : ic(st === 'received' ? 'clock' : 'check')}${STAGE_TEXT[st][0]}</span>
        <h2 class="display">${STAGE_TEXT[st][0]}</h2>
        <p>${STAGE_TEXT[st][1]}</p>
      </div>
      <div class="track" style="--fill:${fill}">
        <div class="track__bar"><i></i></div>
        <ol>${STAGES.map((s, i) => `<li class="${i < idx ? 'is-done' : i === idx ? 'is-on' : ''}"><span>${i < idx || st === 'collected' ? ic('check') : i + 1}</span>${STAGE_TEXT[s][0].replace('Order ', '').replace(' to collect!', '')}</li>`).join('')}</ol>
      </div>
      ${st === 'ready' ? `<button class="btn btn--gold btn--lg btn--block" data-action="collect" data-id="${o.id}">${ic('check')} I've collected my order</button>` : ''}
      ${st === 'received' || st === 'preparing' ? `<p class="ticket__eta">${ic('clock')} Pickup: <b>${pickupText(o)}</b></p>` : ''}`;
  }

  function receiptHtml(o) {
    return `
    <div class="receipt" id="receipt">
      <div class="receipt__brand">WEBLUXE FOODS</div>
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
      <div class="receipt__row"><span>Payment</span><span>${esc(PAY[o.pay] || o.pay)}</span></div>
      ${o.note ? `<div class="receipt__opt">Kitchen note: ${esc(o.note)}</div>` : ''}
      <div class="receipt__rule"></div>
      <div class="receipt__qr">${qrSvg(qrText(o))}</div>
      <p class="receipt__c">Pickup code <b class="receipt__code">${o.code}</b></p>
      <p class="receipt__c receipt__thanks">Mersi! Nou trouv twa talere.</p>
      <p class="receipt__c receipt__demo">Order summary · pay at the counter</p>
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
    </section>
    <div class="wrap order">
      <div class="order__main">
        <div class="ticket">
          <div class="ticket__top">
            <div><small>Q-Skip order</small><div class="ticket__no">${o.number}</div></div>
            <div class="ticket__codebox"><small>Pickup code</small><b>${o.code.split('').join(' ')}</b></div>
          </div>
          <div class="ticket__tear"></div>
          <div id="tracker">${trackerHtml(o)}</div>
          <p class="demo-note demo-note--dark">Tracker preview: on this concept site the stages advance on a timer.</p>
        </div>
        <div class="sendbox">
          <div><b>Didn't send it yet?</b><p>Your order only reaches the kitchen once the WhatsApp message is sent.</p></div>
          <div class="sendbox__acts">
            <a class="btn btn--wa" href="${waUrl(o)}" target="_blank" rel="noopener">${ic('chat')} Send on WhatsApp</a>
            <a class="btn btn--line" href="${TEL}">${ic('phone')} Call us</a>
          </div>
        </div>
      </div>

      <div class="order__side">
        ${receiptHtml(o)}
        <div class="order__acts">
          <button class="btn btn--dark" data-action="print-receipt">${ic('print')} Print / PDF</button>
          <button class="btn btn--line" data-action="download-receipt" data-id="${o.id}">${ic('download')} Save image</button>
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
      setTimeout(() => { window.FX.confetti(); toast(`Order ${o.number} placed. Mersi, ${o.customer.name}!`); }, 900);
    }
    const tick = setInterval(() => {
      const st = stageOf(o);
      const tr = $('#tracker');
      if (!tr) return;
      if (st !== last) {
        last = st;
        tr.innerHTML = trackerHtml(o);
        if (st === 'ready') { window.FX.confetti(); buzz([30, 60, 30]); toast(`${o.number} is ready to collect!`, 'flame'); document.title = `Ready! ${o.number} · WebLuxe Foods`; }
      } else if (st === 'preparing') {
        const cook = Math.min(1, (Date.now() - o.createdAt - SIM.received) / (SIM.ready - SIM.received));
        $('.track', tr)?.style.setProperty('--fill', 0.33 + cook * 0.33);
      }
    }, 1000);
    S.cleanup.push(() => { clearInterval(tick); document.title = TITLE; });
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
    row('TOTAL', rs(o.total), 'big'); row('Payment', PAY[o.pay] || o.pay);
    if (o.note) wrap('Kitchen note: ' + o.note, W - P * 2).forEach((ln) => row(ln, '', 'dim'));
    rule();

    const QR = 150, headH = 128;
    const bodyH = rows.reduce((h, r) => h + (r.rule ? 16 : r.style === 'big' ? 30 : LH), 0);
    const H = headH + bodyH + QR + 120;
    const dpr = 2, c = document.createElement('canvas');
    c.width = W * dpr; c.height = H * dpr;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    x.fillStyle = '#fffdf7'; x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#e4002b'); g.addColorStop(1, '#ffb81c');
    x.fillStyle = g; x.fillRect(0, 0, W, 8);
    x.fillStyle = '#14100d'; x.textAlign = 'center';
    x.font = '34px Anton, Impact, sans-serif'; x.fillText('WEBLUXE FOODS', W / 2, 58);
    x.font = mono; x.fillStyle = '#6b6259';
    x.fillText(B.tagline, W / 2, 80); x.fillText(B.address, W / 2, 98); x.fillText(`${B.phone} · ${B.vatNo}`, W / 2, 116);
    let y = headH;
    const dash = (yy) => { x.strokeStyle = '#b9b0a4'; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(P, yy); x.lineTo(W - P, yy); x.stroke(); x.setLineDash([]); };
    dash(y - 6); y += 12;
    for (const r of rows) {
      if (r.rule) { dash(y - 4); y += 16; continue; }
      const big = r.style === 'big';
      x.font = big ? 'bold 18px "JetBrains Mono", ui-monospace, monospace' : (r.style === 'b' ? 'bold ' : '') + mono;
      x.fillStyle = r.style === 'dim' ? '#6b6259' : '#14100d';
      if (big) y += 6;
      x.textAlign = 'left'; x.fillText(r.l, P, y);
      x.textAlign = 'right'; x.fillText(r.r, W - P, y);
      y += big ? 24 : LH;
    }
    try {
      const qr = window.qrcode(0, 'M'); qr.addData(qrText(o)); qr.make();
      const n = qr.getModuleCount(), cell = QR / n, ox = (W - QR) / 2;
      x.fillStyle = '#14100d';
      for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) if (qr.isDark(r, q)) x.fillRect(ox + q * cell, y + r * cell, Math.ceil(cell), Math.ceil(cell));
    } catch { /* QR is a nice-to-have */ }
    y += QR + 28;
    x.textAlign = 'center'; x.fillStyle = '#14100d';
    x.font = mono; x.fillText('Pickup code', W / 2, y);
    x.font = 'bold 26px "JetBrains Mono", ui-monospace, monospace'; x.fillText(o.code.split('').join(' '), W / 2, y + 30);
    x.font = mono; x.fillStyle = '#6b6259';
    x.fillText('Mersi! Nou trouv twa talere.', W / 2, y + 56);
    x.fillText('Order summary · pay at the counter', W / 2, y + 74);

    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `webluxe-foods-${o.number}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Receipt image saved', 'download');
    }, 'image/png');
  }

  /* ------------------------------------------------------------------- ABOUT */
  function viewAbout() {
    const st = openState();
    return `
    <section class="page-head">
      <div class="wrap"><p class="script">Vinn get nou</p><h1 class="display">Find Us</h1>
        <p class="page-head__sub">One kitchen, one counter, zero queue. Takeaway only.</p></div>
      <span class="page-head__ghost" aria-hidden="true">Visit</span>
    </section>
    <div class="wrap about">
      <div class="about__img reveal">${pic('hero-morne', 'Aerial view of the Mauritian coast', '(max-width: 1240px) 92vw, 1240px', { wide: true })}</div>
      <div class="about__cards">
        <div class="info reveal" style="--i:0">${ic('about')}<h3>Where</h3><p>${esc(B.address)}</p>
          <a class="link-arrow" href="${B.maps}" target="_blank" rel="noopener">Open in Maps ${ic('arrow')}</a></div>
        <div class="info reveal" style="--i:1">${ic('clock')}<h3>When</h3>
          <p>Every day, ${hm(B.hours[0])} – ${hm(B.hours[1])}</p>
          <span class="status status--solid ${st.open ? 'is-open' : 'is-closed'}"><i></i>${st.text}</span></div>
        <div class="info reveal" style="--i:2">${ic('phone')}<h3>Talk to us</h3>
          <p><a href="${TEL}">${esc(B.phone)}</a></p>
          <a class="btn btn--wa btn--sm" href="https://wa.me/${B.whatsapp}" target="_blank" rel="noopener">${ic('chat')} WhatsApp</a></div>
        <div class="info info--dark reveal" style="--i:3">${ic('bag')}<h3>Q-Skip counter</h3>
          <p>Ordered online? Don't join the line. The Q-Skip counter is on the right as you walk in. Show your order number and pickup code.</p>
          <a class="btn btn--gold" href="#/menu">Order now ${ic('arrow')}</a></div>
      </div>
      <div class="about__gallery">
        <figure class="reveal" style="--i:0">${pic('market', 'A fruit seller at a Mauritian market', '(max-width: 820px) 92vw, 330px', { wide: true })}<figcaption>Produce from the bazaar, every morning</figcaption></figure>
        <figure class="reveal" style="--i:1">${pic('hero-wok', 'A chef tossing food in a flaming wok', '(max-width: 820px) 92vw, 500px', { wide: true })}<figcaption>Cooked to order over a real flame</figcaption></figure>
        <figure class="reveal" style="--i:2">${pic('hero-lagoon', 'A turquoise lagoon in Mauritius', '(max-width: 820px) 92vw, 410px', { wide: true })}<figcaption>Take it to the beach. We won't tell.</figcaption></figure>
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
    const main = $('#view');
    main.innerHTML = render();
    const tab = view === 'order' ? 'orders' : view;
    $$('[data-tab]').forEach((a) => a.classList.toggle('is-on', a.dataset.tab === tab));
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (mount) mount();
    observe(main);
    onScroll();
  }

  /* Without WebGL (or before it has loaded) the veil does a plain circular wipe instead of the burn. */
  const VEIL = {
    async cover(x, y) {
      const v = $('#veil');
      v.style.setProperty('--x', x + 'px'); v.style.setProperty('--y', y + 'px');
      v.className = 'veil is-cover';
      await wait(520);
    },
    async reveal() { const v = $('#veil'); v.className = 'veil is-reveal'; await wait(560); v.className = 'veil is-gone'; },
  };
  const stage = () => window.STAGE || VEIL;

  const PAGE_LABEL = {
    home: ['Byenvini', 'WebLuxe Foods'], menu: ['Nou meni', 'The Menu'], orders: ['Ou komand', 'My Orders'],
    order: ['Ou tiket', 'Your Ticket'], about: ['Vinn get nou', 'Find Us'],
  };
  function showLabel(view) {
    const [sub, name] = PAGE_LABEL[view] || PAGE_LABEL.home;
    $('#ptSub').textContent = sub;
    $('#ptName').innerHTML = name.split(' ').map((w, n) => `<span><span style="--d:${n}">${esc(w)}</span></span>`).join(' ');
    const pt = $('#pt');
    pt.className = 'pt'; void pt.offsetWidth; pt.className = 'pt is-in';
  }

  /* Tab transition: the ink burns in from where you tapped (throwing a few ingredients), the page name
     slams in, the new page is drawn underneath, and the ink burns away onto it. */
  async function navigate(first = false) {
    const r = parseHash();
    if (!first && r.view === 'menu' && S.view === 'menu') {
      S.arg = r.arg;
      S.menuCat = CATS.some((c) => c.id === r.arg) ? r.arg : 'all';
      S.query = ''; const q = $('#q'); if (q) q.value = '';
      resetMenuScroll();
      renderMenuBody();
      return;
    }
    const token = ++S.navToken;
    if (first || REDUCED) { draw(r); return; }

    const main = $('#view');
    const x = S.px ?? window.innerWidth / 2, y = S.py ?? window.innerHeight / 2;
    S.px = S.py = null;
    document.body.classList.add('is-moving');
    showLabel(r.view);
    await stage().cover(x, y);
    if (token !== S.navToken) return;
    draw(r);
    await wait(220);                      // let the page name land before the burn takes it away
    if (token !== S.navToken) return;
    main.classList.remove('view-in'); void main.offsetWidth; main.classList.add('view-in');
    $('#pt').className = 'pt is-out';
    await stage().reveal();
    if (token !== S.navToken) return;
    $('#pt').className = 'pt';
    document.body.classList.remove('is-moving');
  }

  /* Scroll-linked bits, batched into one frame: header state, progress bar, hero parallax. */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY;
      $('#header').classList.toggle('is-solid', y > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      $('#progress').style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      if (S.view === 'home' && !REDUCED && y < window.innerHeight) {
        const slides = $('#heroSlides');
        if (slides) slides.style.transform = `translate3d(0,${y * 0.28}px,0)`;
      }
    });
  }

  /* Desktop only: cards lean toward the cursor. */
  function tilt() {
    if (!FINE || REDUCED) return;
    let el = null, raf = 0, ev = null;
    document.addEventListener('pointermove', (e) => {
      ev = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const c = ev.target.closest?.('.card, .rail-card, .cat');
        if (el && el !== c) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
        el = c;
        if (!c) return;
        const r = c.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width - 0.5, py = (ev.clientY - r.top) / r.height - 0.5;
        c.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg');
        c.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
        c.style.setProperty('--mx', ((px + 0.5) * 100).toFixed(1) + '%');
        c.style.setProperty('--my', ((py + 0.5) * 100).toFixed(1) + '%');
      });
    }, { passive: true });
  }

  /* ----------------------------------------------------------------- ACTIONS */
  const ACTIONS = {
    'open-item': (el) => openItem(el.dataset.id),
    'close-sheet': () => closeDialog($('#sheet')),
    'sheet-qty': (el) => { S.sheet.qty = Math.max(1, Math.min(20, S.sheet.qty + Number(el.dataset.d))); buzz(8); syncSheet(); },
    'sheet-add': () => addFromSheet(),
    'open-cart': () => { S.step = 0; S.errors = {}; renderCart(); openDialog($('#cart')); },
    'close-cart': () => closeDialog($('#cart')),
    'close-cart-menu': () => { closeDialog($('#cart')); if (S.view !== 'menu') location.hash = '#/menu'; },
    'cart-back': () => { readCartForm(); goStep(Math.max(0, S.step - 1)); },
    'cart-next': () => {
      readCartForm();
      if (S.step === 0) { goStep(1); return; }
      if (S.step === 1) {
        if (!validateDetails()) { renderCart(); $('#cart .has-err input')?.focus({ preventScroll: true }); return; }
        goStep(2); return;
      }
      placeOrder();
    },
    'line-qty': (el) => {
      const li = el.closest('.line');
      const l = S.cart.find((x) => x.key === li.dataset.key);
      if (!l) return;
      buzz(8);
      const qty = l.qty + Number(el.dataset.d);
      if (qty <= 0) {
        S.cart = S.cart.filter((x) => x !== l);
        saveCart();
        li.classList.add('is-out');
        setTimeout(() => renderCart(), REDUCED ? 0 : 240);
        return;
      }
      l.qty = Math.min(20, qty);
      saveCart();
      // Update just this row and the total, so nothing else on the panel moves.
      $('output', li).textContent = l.qty;
      $('.line__price', li).textContent = rs(l.unit * l.qty);
      $('[data-d="-1"]', li).innerHTML = ic(l.qty === 1 ? 'trash' : 'minus');
      const t = $('#cartTotal'); if (t) t.textContent = rs(cartTotal());
    },
    'line-edit': (el) => { const l = S.cart.find((x) => x.key === el.closest('.line').dataset.key); if (l) openItem(l.id, l.key); },
    'menu-cat': (el) => {
      const cat = el.dataset.cat;
      const target = cat === 'all' ? '#/menu' : '#/menu/' + cat;
      buzz(6);
      if (location.hash === target || (cat === 'all' && S.arg === null)) {
        S.query = ''; $('#q').value = ''; S.menuCat = cat; resetMenuScroll(); renderMenuBody();
      } else location.hash = target;
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

  // Remember where the last tap landed so the tab transition can grow from it.
  document.addEventListener('pointerdown', (e) => { S.px = e.clientX; S.py = e.clientY; }, { passive: true, capture: true });
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el) { ACTIONS[el.dataset.action]?.(el, e); return; }
    if (e.target instanceof HTMLDialogElement) closeDialog(e.target);   // tap on the dimmed backdrop
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[role="button"][data-action]')) {
      e.preventDefault(); e.target.click();
    }
  });
  $$('dialog').forEach((d) => d.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(d); }));
  $('#sheet').addEventListener('change', () => { buzz(6); syncSheet(); });
  $('#sheet').addEventListener('input', (e) => { if (e.target.id === 'sheetNote' && S.sheet) S.sheet.note = e.target.value.trim(); });
  $('#sheet').addEventListener('submit', (e) => { e.preventDefault(); addFromSheet(); });
  $('#cart').addEventListener('change', readCartForm);
  window.addEventListener('hashchange', () => navigate());
  window.addEventListener('scroll', onScroll, { passive: true });

  /* -------------------------------------------------------------------- BOOT */
  async function boot() {
    renderChrome();
    saveCart(false);
    navigate(true);
    sheetDrag();
    tilt();

    /* Intro: the wordmark punches in straight away (CSS); the WebGL wok fire joins as soon as three.js has
       loaded. When the photos are in and the toss has peaked, time slows, the camera pushes through the
       ingredients and the screen burns away onto the hero. Tap anywhere to cut it short. */
    const intro = $('#intro'), veil = $('#veil'), pct = $('#introPct'), msg = $('#introMsg');
    const msgs = ['Pe lalim dife…', 'Pe koup piman…', 'Pe tay mine…', 'Pare!'];
    let skip = false;
    intro.addEventListener('pointerdown', () => { skip = true; }, { once: true });
    requestAnimationFrame(() => intro.classList.add('is-lit'));

    const small = window.FX.SMALL;
    const assets = [`hero-mine${small ? '-sm' : ''}`, 'mine-frite-sm', 'dholl-puri-sm', 'gato-pima-sm'];
    const total = assets.length + 2;
    let done = 0, shown = 0;
    const step = () => {
      const from = shown; shown = (++done / total) * 100;
      tween(from, shown, 500, (v) => { pct.textContent = pad(Math.round(v)); });
      msg.textContent = msgs[Math.min(msgs.length - 1, Math.floor((done / total) * (msgs.length - 1)))];
    };
    const load = (name) => new Promise((res) => { const im = new Image(); im.onload = im.onerror = res; im.src = `img/${name}.webp`; }).then(step);
    const fonts = Promise.race([document.fonts?.load?.('100px Anton') || Promise.resolve(), wait(2500)]).then(step);
    const ready = Promise.race([Promise.all([...assets.map(load), fonts]), wait(7000)]);

    // three.js is ~170 KB gzipped: wait for it a while, but never hold the site hostage
    const gl = await Promise.race([
      window.STAGE !== undefined ? Promise.resolve(window.STAGE) : new Promise((r) => addEventListener('stage:ready', () => r(window.STAGE), { once: true })),
      wait(4500).then(() => null),
    ]);
    const t0 = performance.now();
    if (gl) { await gl.introStart(); veil.className = 'veil is-gone'; }
    step();                                                // the stage counts as one asset
    await ready;
    // give the toss time to rise and peak (unless the visitor tapped)
    while (!skip && !REDUCED && performance.now() - t0 < (gl ? 2300 : 1200)) await wait(60);
    pct.textContent = '100'; msg.textContent = msgs[3];

    intro.classList.add('is-out');
    await wait(REDUCED ? 0 : 160);
    if (gl) await gl.introExit();
    else await VEIL.reveal();
    document.body.classList.remove('is-loading');
    setTimeout(() => intro.remove(), 1400);
  }
  boot();
})();
