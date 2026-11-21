/* WebLuxe Foods — menu data. Prices are in Mauritian rupees (Rs), VAT included.
   Edit this file to change the restaurant details, dishes, prices and options. */
(() => {
  /* ---------- Reusable option groups ----------
     type: 'single' = pick exactly one (radio) · 'multi' = pick several (checkbox, optional `max`) */
  const opt = (id, name, price = 0) => ({ id, name, price });

  const SAUCES = (max = 2) => ({
    id: 'sauces', name: 'Sauces', type: 'multi', max,
    options: [
      opt('ail', 'Garlic mayo'), opt('tartare', 'Tartare'), opt('bbq', 'Smoky BBQ'),
      opt('piment', 'Chilli sauce'), opt('ketchup', 'Ketchup'), opt('sweet-chilli', 'Sweet chilli'),
    ],
  });
  const SPICE = {
    id: 'spice', name: 'Heat', type: 'single', required: true, default: 'medium',
    options: [opt('mild', 'Mild'), opt('medium', 'Medium'), opt('hot', 'Hot')],
  };
  const REMOVE = (...names) => ({
    id: 'remove', name: 'Leave out', type: 'multi',
    options: names.map((n) => opt(n.toLowerCase().replace(/\W+/g, '-'), 'No ' + n)),
  });
  const MENU_DEAL = {
    id: 'meal', name: 'Make it a menu', type: 'single', required: true, default: 'solo',
    options: [
      opt('solo', 'Burger only'),
      opt('menu', 'With fries + soft drink', 110),
      opt('menu-shake', 'With fries + milkshake', 195),
    ],
  };
  const BURGER_EXTRAS = {
    id: 'extras', name: 'Extras', type: 'multi',
    options: [opt('cheddar', 'Extra cheddar', 30), opt('bacon', 'Beef bacon', 45), opt('egg', 'Fried egg', 25), opt('jalapeno', 'Jalapeños', 20)],
  };
  const WOK_PROTEIN = {
    id: 'protein', name: 'Choose your protein', type: 'single', required: true, default: 'poulet',
    options: [
      opt('poulet', 'Chicken'), opt('boeuf', 'Beef', 30), opt('crevette', 'Prawns', 60),
      opt('mixte', 'Mixed: chicken, beef & prawns', 80), opt('legumes', 'Vegetables only'),
    ],
  };
  const WOK_EXTRAS = {
    id: 'extras', name: 'Extras', type: 'multi',
    options: [opt('egg', 'Fried egg on top', 25), opt('large', 'Large portion', 50), opt('poulet-crousti', 'Add crispy chicken', 75)],
  };
  const PORTION = (big, add) => ({
    id: 'portion', name: 'Portion', type: 'single', required: true, default: 'regular',
    options: [opt('regular', 'Regular'), opt('large', big, add)],
  });
  const ICE = {
    id: 'ice', name: 'Ice', type: 'single', required: true, default: 'normal',
    options: [opt('normal', 'Normal ice'), opt('less', 'Less ice'), opt('none', 'No ice')],
  };

  window.MENU = {
    brand: {
      name: 'WebLuxe Foods',
      tagline: 'Kitchen & Takeaway',
      address: 'Royal Road, Grand Baie, Mauritius',
      phone: '+230 5923 8436',
      whatsapp: '23059238436', // orders are sent to this WhatsApp number (digits only, with country code)
      vatNo: 'VAT 00000000',
      vatRate: 0.15,
      hours: [660, 1350], // minutes from midnight, Mauritius time: 11:00 → 22:30
      maps: 'https://www.google.com/maps/search/?api=1&query=Grand+Baie+Mauritius',
    },

    categories: [
      { id: 'starters', name: 'Entrées', en: 'Starters', sub: 'Golden, crisp, made to share', img: 'poulet-croustillant' },
      { id: 'burgers', name: 'Burgers', en: 'Burgers', sub: 'Toasted brioche, pressed to order', img: 'burger-classic' },
      { id: 'wok', name: 'Au Wok', en: 'Noodles & Rice', sub: 'Tossed over a high flame', img: 'mine-frite' },
      { id: 'desserts', name: 'Desserts', en: 'Desserts', sub: 'Something sweet to finish', img: 'fondant' },
      { id: 'drinks', name: 'Boissons', en: 'Drinks', sub: 'Cold, fresh, shaken', img: 'milkshake' },
    ],

    items: [
      /* ---------- Starters ---------- */
      {
        id: 'poulet-croustillant', cat: 'starters', name: 'Poulet Croustillant', price: 195, img: 'poulet-croustillant', tags: ['best'],
        desc: 'Buttermilk-marinated chicken strips in a crackling golden crust, lemon and garlic mayo.',
        groups: [PORTION('8 pieces', 110), SPICE, SAUCES(2)],
      },
      {
        id: 'calamar', cat: 'starters', name: 'Calamar Croustillant', price: 260, img: 'calamar', tags: ['best'],
        desc: 'Tender squid rings, lightly floured and flash-fried. Served with tartare and lime.',
        groups: [PORTION('Sharing plate', 140), SAUCES(2)],
      },
      {
        id: 'crevettes', cat: 'starters', name: 'Crevettes Panées', price: 295, img: 'crevettes', tags: [],
        desc: 'Six butterflied prawns in a light panko crumb with sweet chilli dip.',
        groups: [PORTION('10 pieces', 160), SAUCES(2)],
      },
      {
        id: 'wings', cat: 'starters', name: 'Ailes de Poulet', price: 210, img: 'wings', tags: ['spicy'],
        desc: 'Eight crispy wings, tossed or naked, with a smoky dipping sauce.',
        groups: [
          { id: 'style', name: 'Style', type: 'single', required: true, default: 'bbq', options: [opt('bbq', 'Smoky BBQ glaze'), opt('buffalo', 'Hot buffalo'), opt('honey', 'Honey & garlic'), opt('naked', 'Naked, sauce on the side')] },
          PORTION('12 wings', 95),
        ],
      },
      {
        id: 'frites', cat: 'starters', name: 'Frites Maison', price: 90, img: 'frites', tags: ['veg'],
        desc: 'Hand-cut fries, sea salt and rosemary.',
        groups: [
          PORTION('Large', 40),
          { id: 'season', name: 'Seasoning', type: 'single', required: true, default: 'sel', options: [opt('sel', 'Sea salt & rosemary'), opt('truffe', 'Truffle & parmesan', 60), opt('cajun', 'Cajun spice')] },
          SAUCES(2),
        ],
      },

      /* ---------- Burgers ---------- */
      {
        id: 'burger-classic', cat: 'burgers', name: 'Le Classique', price: 245, img: 'burger-classic', tags: ['best'],
        desc: '150 g beef patty, cheddar, lettuce, tomato, red onion and house sauce in brioche.',
        groups: [
          { id: 'cook', name: 'Cooking', type: 'single', required: true, default: 'medium', options: [opt('medium', 'Medium'), opt('well', 'Well done')] },
          BURGER_EXTRAS, REMOVE('onion', 'tomato', 'pickles'), MENU_DEAL,
        ],
      },
      {
        id: 'burger-double', cat: 'burgers', name: 'Le Double Cheese', price: 325, img: 'burger-double', tags: ['new'],
        desc: 'Two smashed beef patties, double cheddar, beef bacon and pickles.',
        groups: [BURGER_EXTRAS, REMOVE('onion', 'pickles', 'bacon'), MENU_DEAL],
      },
      {
        id: 'burger-poulet', cat: 'burgers', name: 'Le Crispy Chicken', price: 235, img: 'burger-poulet', tags: [],
        desc: 'Crispy chicken thigh, slaw, pickles and chipotle mayo.',
        groups: [SPICE, BURGER_EXTRAS, REMOVE('slaw', 'pickles'), MENU_DEAL],
      },
      {
        id: 'burger-poisson', cat: 'burgers', name: 'Le Fish', price: 245, img: 'burger-poisson', tags: [],
        desc: 'Panko-crumbed fish fillet, tartare, lettuce and a squeeze of lemon.',
        groups: [BURGER_EXTRAS, REMOVE('lettuce', 'tomato'), MENU_DEAL],
      },

      /* ---------- Wok ---------- */
      {
        id: 'mine-frite', cat: 'wok', name: 'Mine Frite', price: 185, img: 'mine-frite', tags: ['best'],
        desc: 'Wok-fried egg noodles with soy, spring onion and crisp vegetables.',
        groups: [WOK_PROTEIN, SPICE, WOK_EXTRAS, REMOVE('spring onion', 'egg')],
      },
      {
        id: 'riz-frit', cat: 'wok', name: 'Riz Frit', price: 185, img: 'riz-frit', tags: [],
        desc: 'Smoky fried rice tossed with egg, peas, carrot and spring onion.',
        groups: [WOK_PROTEIN, SPICE, WOK_EXTRAS],
      },
      {
        id: 'mine-bouillie', cat: 'wok', name: 'Mine Bouillie', price: 175, img: 'mine-bouille', tags: [],
        desc: 'Soft noodles in a clear ginger broth with greens and a soft egg.',
        groups: [WOK_PROTEIN, WOK_EXTRAS],
      },
      {
        id: 'bol-renverse', cat: 'wok', name: 'Bol Renversé', price: 235, img: 'bol-renverse', tags: ['new'],
        desc: 'Rice turned out over a glossy stir-fry, crowned with a fried egg.',
        groups: [WOK_PROTEIN, SPICE, REMOVE('mushroom', 'egg')],
      },

      /* ---------- Desserts ---------- */
      {
        id: 'fondant', cat: 'desserts', name: 'Fondant au Chocolat', price: 165, img: 'fondant', tags: ['best'],
        desc: 'Warm dark chocolate cake with a molten heart.',
        groups: [{ id: 'side', name: 'On the side', type: 'single', required: true, default: 'none', options: [opt('none', 'As it is'), opt('glace', 'Vanilla ice cream', 45), opt('creme', 'Whipped cream', 25)] }],
      },
      {
        id: 'tiramisu', cat: 'desserts', name: 'Tiramisu', price: 155, img: 'tiramisu', tags: [],
        desc: 'Espresso-soaked biscuits, mascarpone cream and cocoa.',
        groups: [],
      },
      {
        id: 'cheesecake', cat: 'desserts', name: 'Cheesecake', price: 160, img: 'cheesecake', tags: [],
        desc: 'Baked New York cheesecake on a buttery crumb.',
        groups: [{ id: 'top', name: 'Topping', type: 'single', required: true, default: 'fruits', options: [opt('fruits', 'Red berry coulis'), opt('caramel', 'Salted caramel'), opt('nature', 'Plain')] }],
      },
      {
        id: 'crepe', cat: 'desserts', name: 'Crêpe', price: 125, img: 'crepe', tags: ['veg'],
        desc: 'A thin, buttery crêpe folded warm off the pan.',
        groups: [{ id: 'fill', name: 'Filling', type: 'single', required: true, default: 'nutella', options: [opt('nutella', 'Nutella'), opt('sucre', 'Butter & sugar'), opt('banane', 'Nutella & banana', 30), opt('caramel', 'Salted caramel', 15)] }],
      },

      /* ---------- Drinks ---------- */
      {
        id: 'soft', cat: 'drinks', name: 'Soft Drink', price: 55, img: 'cola', tags: [],
        desc: 'Ice-cold 330 ml can.',
        groups: [{ id: 'flavour', name: 'Choose', type: 'single', required: true, default: 'coca', options: [opt('coca', 'Coca-Cola'), opt('zero', 'Coca-Cola Zero'), opt('sprite', 'Sprite'), opt('fanta', 'Fanta Orange')] }],
      },
      {
        id: 'fuze', cat: 'drinks', name: 'Fuze Tea', price: 85, img: 'the-glace', tags: [],
        desc: 'Iced tea, 500 ml bottle.',
        groups: [{ id: 'flavour', name: 'Flavour', type: 'single', required: true, default: 'peche', options: [opt('peche', 'Peach & hibiscus'), opt('citron', 'Lemon & lemongrass')] }],
      },
      {
        id: 'milkshake', cat: 'drinks', name: 'Milkshake', price: 165, img: 'milkshake', tags: ['best'],
        desc: 'Thick, cold and topped with whipped cream.',
        groups: [{ id: 'flavour', name: 'Flavour', type: 'single', required: true, default: 'oreo', options: [opt('oreo', 'Oreo'), opt('chocolat', 'Chocolate'), opt('vanille', 'Vanilla'), opt('fraise', 'Strawberry')] }],
      },
      {
        id: 'cafe-glace', cat: 'drinks', name: 'Iced Latte', price: 135, img: 'cafe-glace', tags: [],
        desc: 'Double espresso over ice and cold milk.',
        groups: [{ id: 'syrup', name: 'Syrup', type: 'single', required: true, default: 'none', options: [opt('none', 'No syrup'), opt('vanille', 'Vanilla', 20), opt('caramel', 'Caramel', 20)] }, ICE],
      },
      {
        id: 'jus-orange', cat: 'drinks', name: 'Fresh Orange Juice', price: 120, img: 'jus-orange', tags: ['veg'],
        desc: 'Pressed to order, nothing added.',
        groups: [ICE],
      },
    ],
  };
})();
