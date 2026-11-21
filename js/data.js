/* WebLuxe Foods — menu data. Prices are in Mauritian rupees (Rs), VAT included.
   Edit this file to change the restaurant details, dishes, prices and options. */
(() => {
  /* ---------- Reusable option groups ----------
     type: 'single' = pick exactly one (radio) · 'multi' = pick several (checkbox, optional `max`) */
  const opt = (id, name, price = 0) => ({ id, name, price });

  const SPICE = {
    id: 'spice', name: 'Spice level', type: 'single', required: true, default: 'medium',
    options: [opt('mild', 'Pa for (mild)'), opt('medium', 'Medium'), opt('hot', 'For (hot)'), opt('fire', 'Mari for (extra hot)')],
  };
  const SAUCES = (max = 3) => ({
    id: 'sauces', name: 'Sauces', type: 'multi', max,
    options: [
      opt('ketchup', 'Ketchup'), opt('mayo', 'Mayonnaise'), opt('lail', 'Lasos lay (garlic sauce)'),
      opt('piment', 'Piman kraze (crushed chilli)'), opt('tamarin', 'Tamarind chutney'), opt('coco', 'Satini koko (coconut chutney)'),
    ],
  });
  const REMOVE = (...names) => ({
    id: 'remove', name: 'Remove', type: 'multi',
    options: names.map((n) => opt(n.toLowerCase().replace(/\W+/g, '-'), 'No ' + n)),
  });
  const SOFT = [opt('cola', 'Cola'), opt('lemon', 'Lemon-lime'), opt('orange', 'Orange'), opt('water', 'Still water')];
  const MEAL = {
    id: 'meal', name: 'Make it a meal', type: 'single', required: true, default: 'solo',
    options: [
      opt('solo', 'Just the item'),
      opt('meal-cola', 'With frites + cola', 95),
      opt('meal-lemon', 'With frites + lemon-lime', 95),
      opt('meal-the', 'With frites + vanilla iced tea', 110),
    ],
  };
  const PROTEIN = {
    id: 'protein', name: 'Choose your topping', type: 'single', required: true, default: 'poulet',
    options: [
      opt('poulet', 'Poulet (chicken)'), opt('dizef', 'Dizef (egg) — veg'), opt('boeuf', 'Bef (beef)', 30),
      opt('crevette', 'Krevet (prawn)', 50), opt('special', 'Spesial — chicken, prawn & egg', 70),
    ],
  };
  const NOODLE_EXTRAS = {
    id: 'extras', name: 'Extras', type: 'multi',
    options: [opt('egg', 'Dizef frir (fried egg)', 20), opt('boulettes', 'Boulettes x3', 40), opt('portion', 'Extra-large portion', 45), opt('achard', 'Side of achard', 25)],
  };
  const CURRY_SIDE = {
    id: 'side', name: 'Served with', type: 'single', required: true, default: 'rice',
    options: [opt('rice', 'Diri blan (steamed rice)'), opt('farata', '2 farata', 20), opt('pain', 'Dipin mezon (crusty bread)'), opt('riz-frit', 'Fried rice', 40)],
  };
  const CURRY_EXTRAS = {
    id: 'extras', name: 'Add on the side', type: 'multi',
    options: [opt('achard', 'Achard legim', 25), opt('satini', 'Satini pomdamour', 15), opt('lentilles', 'Lentilles (dal)', 30), opt('salade', 'Cucumber salad', 20)],
  };
  const BURGER_EXTRAS = {
    id: 'extras', name: 'Extras', type: 'multi',
    options: [opt('cheese', 'Cheese slice', 20), opt('egg', 'Fried egg', 20), opt('double', 'Double fillet', 70), opt('achard', 'Achard inside', 15)],
  };
  const ICE = {
    id: 'ice', name: 'Ice', type: 'single', required: true, default: 'normal',
    options: [opt('normal', 'Normal ice'), opt('less', 'Less ice'), opt('none', 'No ice')],
  };
  const SIZE = (up = 25) => ({
    id: 'size', name: 'Size', type: 'single', required: true, default: 'regular',
    options: [opt('regular', 'Regular'), opt('large', 'Large', up)],
  });

  window.MENU = {
    brand: {
      name: 'WebLuxe Foods',
      tagline: 'Mauritian Street Kitchen',
      address: 'Royal Road, Grand Baie, Mauritius',
      phone: '+230 5923 8436',
      whatsapp: '23059238436', // orders are sent to this WhatsApp number (digits only, with country code)
      vatNo: 'VAT 00000000',
      vatRate: 0.15,
      hours: [600, 1320], // minutes from midnight, Mauritius time: 10:00 → 22:00
      maps: 'https://www.google.com/maps/search/?api=1&query=Grand+Baie+Mauritius',
    },

    categories: [
      { id: 'starters', name: 'Gajak', en: 'Starters', sub: 'Little bites to open the appetite', img: 'gato-pima' },
      { id: 'street', name: 'Lari', en: 'Street Classics', sub: 'Straight from the tabagie counter', img: 'dholl-puri' },
      { id: 'mines', name: 'Minn & Diri', en: 'Noodles & Rice', sub: 'Tossed in a roaring wok', img: 'mine-frite' },
      { id: 'curries', name: 'Kari', en: 'Curries & Mains', sub: 'Slow-cooked, served your way', img: 'cari-poulet' },
      { id: 'burgers', name: 'Burger', en: 'Burgers & Sides', sub: 'Island-style buns and crunch', img: 'burger-poulet' },
      { id: 'desserts', name: 'Gato Dou', en: 'Desserts', sub: 'Something sweet for the road', img: 'napolitaine' },
      { id: 'drinks', name: 'Labwason', en: 'Drinks', sub: 'Ice-cold and island-made', img: 'alouda' },
    ],

    items: [
      /* ---------- Starters ---------- */
      {
        id: 'gato-pima', cat: 'starters', name: 'Gato Pima', price: 60, img: 'gato-pima', tags: ['best', 'veg', 'spicy'],
        desc: 'Six crispy split-pea chilli fritters with spring onion and coriander.',
        groups: [
          { id: 'portion', name: 'Portion', type: 'single', required: true, default: '6', options: [opt('6', '6 pieces'), opt('12', '12 pieces', 55), opt('pain', '6 pieces in buttered bread', 25)] },
          SAUCES(2),
        ],
      },
      {
        id: 'samoussa', cat: 'starters', name: 'Samoussa', price: 70, img: 'samoussa', tags: ['veg'],
        desc: 'Four golden triangles, hand-folded and fried to order.',
        groups: [
          { id: 'filling', name: 'Filling', type: 'single', required: true, default: 'pomdeter', options: [opt('pomdeter', 'Potato & pea (veg)'), opt('poulet', 'Chicken', 15), opt('poisson', 'Fish', 20), opt('fromage', 'Cheese & corn (veg)', 15)] },
          SAUCES(2),
        ],
      },
      {
        id: 'boulettes', cat: 'starters', name: 'Boulettes', price: 120, img: 'boulettes', tags: ['best'],
        desc: 'Six steamed dumplings in clear bouillon with chives. A Mauritian obsession.',
        groups: [
          { id: 'mix', name: 'Choose your boulettes', type: 'single', required: true, default: 'mix', options: [opt('mix', 'Mixed (chef picks)'), opt('chouchou', 'Chouchou (veg)'), opt('poulet', 'Chicken'), opt('poisson', 'Fish'), opt('saomai', 'Sao mai', 15)] },
          { id: 'bouillon', name: 'Bouillon', type: 'single', required: true, default: 'with', options: [opt('with', 'With bouillon'), opt('dry', 'Dry, sauce on top')] },
          { id: 'extras', name: 'Extras', type: 'multi', options: [opt('more', '3 more boulettes', 55), opt('lail', 'Extra lasos lay'), opt('piment', 'Extra piman kraze')] },
        ],
      },
      {
        id: 'hakien', cat: 'starters', name: 'Hakien', price: 90, img: 'hakien', tags: [],
        desc: 'Two crunchy Sino-Mauritian spring rolls stuffed with vegetables.',
        groups: [
          { id: 'filling', name: 'Filling', type: 'single', required: true, default: 'legim', options: [opt('legim', 'Vegetable (veg)'), opt('poulet', 'Chicken', 15), opt('crevette', 'Prawn', 30)] },
          SAUCES(2),
        ],
      },
      {
        id: 'calamar', cat: 'starters', name: 'Kalamar Krispi', price: 195, img: 'calamar', tags: ['new'],
        desc: 'Lightly battered calamari, lime wedge and house garlic dip.',
        groups: [SPICE, SAUCES(2)],
      },

      /* ---------- Street classics ---------- */
      {
        id: 'dholl-puri', cat: 'street', name: 'Dholl Puri', price: 45, img: 'dholl-puri', tags: ['best', 'veg'],
        desc: 'A pair of soft split-pea flatbreads rolled with curry and chutney.',
        groups: [
          { id: 'fillings', name: 'Fillings', type: 'multi', max: 4, options: [opt('grospois', 'Kari gro pwa (butter bean curry)'), opt('rougaille', 'Rougaille'), opt('satini', 'Satini koko'), opt('achard', 'Achard legim'), opt('poulet', 'Chicken curry', 35)] },
          SPICE,
          { id: 'extra', name: 'Still hungry?', type: 'multi', options: [opt('pair', 'Add another pair', 40)] },
        ],
      },
      {
        id: 'farata', cat: 'street', name: 'Farata & Kari', price: 110, img: 'farata', tags: ['veg'],
        desc: 'Two flaky pan-fried farata with a bowl of curry for dipping.',
        groups: [
          { id: 'curry', name: 'Curry', type: 'single', required: true, default: 'grospois', options: [opt('grospois', 'Butter bean (veg)'), opt('legim', 'Mixed vegetable (veg)'), opt('poulet', 'Chicken', 40), opt('poisson', 'Fish', 55)] },
          SPICE, CURRY_EXTRAS,
        ],
      },
      {
        id: 'roti-wrap', cat: 'street', name: 'Roti Poulet Wrap', price: 135, img: 'roti-wrap', tags: [],
        desc: 'Grilled masala chicken, crunchy slaw and sauce in a warm roti.',
        groups: [SPICE, SAUCES(3), REMOVE('onion', 'salad', 'tomato'), MEAL],
      },

      /* ---------- Noodles & rice ---------- */
      {
        id: 'mine-frite', cat: 'mines', name: 'Mine Frite', price: 160, img: 'mine-frite', tags: ['best'],
        desc: 'Wok-fried egg noodles with soy, spring onion and crunchy vegetables.',
        groups: [PROTEIN, SPICE, SAUCES(3), NOODLE_EXTRAS, REMOVE('spring onion', 'egg', 'cabbage')],
      },
      {
        id: 'mine-bouille', cat: 'mines', name: 'Mine Bouille', price: 150, img: 'mine-bouille', tags: [],
        desc: 'Boiled noodles in broth, topped with minced meat, egg and greens.',
        groups: [PROTEIN, SPICE, NOODLE_EXTRAS, REMOVE('spring onion', 'egg')],
      },
      {
        id: 'riz-frit', cat: 'mines', name: 'Diri Frir', price: 160, img: 'riz-frit', tags: [],
        desc: 'Smoky fried rice tossed with carrot, peas and egg.',
        groups: [PROTEIN, SPICE, SAUCES(3), NOODLE_EXTRAS],
      },
      {
        id: 'bol-renverse', cat: 'mines', name: 'Bol Renversé', price: 220, img: 'bol-renverse', tags: ['best'],
        desc: 'The "magic bowl": rice flipped over saucy stir-fry, crowned with a fried egg.',
        groups: [PROTEIN, SPICE, NOODLE_EXTRAS, REMOVE('mushroom', 'egg')],
      },
      {
        id: 'briani', cat: 'mines', name: 'Briani Poulet', price: 240, img: 'briani', tags: ['spicy'],
        desc: 'Layered saffron rice, chicken and potato, slow-steamed in a deg.',
        groups: [
          { id: 'cut', name: 'Your portion', type: 'single', required: true, default: 'regular', options: [opt('regular', 'Regular'), opt('large', 'Large', 60), opt('veg', 'Vegetable briani (veg)')] },
          { id: 'extras', name: 'On the side', type: 'multi', options: [opt('salade', 'Cucumber & carrot salad', 20), opt('satini', 'Satini pomdamour', 15), opt('egg', 'Boiled egg', 15), opt('alouda', 'Mini alouda', 45)] },
        ],
      },

      /* ---------- Curries & mains ---------- */
      {
        id: 'cari-poulet', cat: 'curries', name: 'Kari Poul', price: 230, img: 'cari-poulet', tags: [],
        desc: 'Home-style chicken curry with thyme, curry leaves and potato.',
        groups: [CURRY_SIDE, SPICE, CURRY_EXTRAS],
      },
      {
        id: 'rougaille', cat: 'curries', name: 'Rougaille Sosis', price: 210, img: 'rougaille', tags: ['best'],
        desc: 'Sausages simmered in a tomato, ginger and thyme Creole sauce.',
        groups: [
          { id: 'main', name: 'Choose your rougaille', type: 'single', required: true, default: 'sosis', options: [opt('sosis', 'Chicken sausage'), opt('boeuf', 'Corned beef'), opt('poisson', 'Salted fish', 20), opt('dizef', 'Egg (veg)')] },
          CURRY_SIDE, SPICE, CURRY_EXTRAS,
        ],
      },
      {
        id: 'cari-poisson', cat: 'curries', name: 'Kari Pwason', price: 260, img: 'cari-poisson', tags: ['spicy'],
        desc: 'Catch of the day in a tamarind and aubergine curry.',
        groups: [CURRY_SIDE, SPICE, CURRY_EXTRAS],
      },
      {
        id: 'ourite', cat: 'curries', name: 'Ourit Sote', price: 320, img: 'ourite', tags: ['new'],
        desc: 'Tender lagoon octopus sautéed with garlic, chilli and coriander.',
        groups: [CURRY_SIDE, SPICE, CURRY_EXTRAS],
      },

      /* ---------- Burgers & sides ---------- */
      {
        id: 'burger-poulet', cat: 'burgers', name: 'Burger Poul Krispi', price: 175, img: 'burger-poulet', tags: ['best'],
        desc: 'Crispy masala chicken fillet, slaw and pickles in a toasted bun.',
        groups: [SAUCES(3), BURGER_EXTRAS, REMOVE('onion', 'pickles', 'salad', 'tomato'), MEAL],
      },
      {
        id: 'burger-poisson', cat: 'burgers', name: 'Burger Pwason', price: 185, img: 'burger-poisson', tags: [],
        desc: 'Crumbed fish fillet, tartare-style lasos lay and crunchy lettuce.',
        groups: [SAUCES(3), BURGER_EXTRAS, REMOVE('onion', 'salad', 'tomato'), MEAL],
      },
      {
        id: 'frites', cat: 'burgers', name: 'Frites', price: 75, img: 'frites', tags: ['veg'],
        desc: 'Hand-cut chips, sea salt, served piping hot.',
        groups: [
          SIZE(35),
          { id: 'season', name: 'Seasoning', type: 'single', required: true, default: 'sel', options: [opt('sel', 'Sea salt'), opt('masala', 'Masala salt'), opt('piment', 'Chilli & lime')] },
          SAUCES(2),
        ],
      },
      {
        id: 'achard', cat: 'burgers', name: 'Achard Legim', price: 40, img: 'achard', tags: ['veg', 'spicy'],
        desc: 'Mustard-pickled cabbage, carrot and green beans. Tangy and sharp.',
        groups: [SIZE(25)],
      },

      /* ---------- Desserts ---------- */
      {
        id: 'napolitaine', cat: 'desserts', name: 'Napolitaine', price: 50, img: 'napolitaine', tags: ['best'],
        desc: 'Two melt-in-the-mouth shortbreads sandwiched with jam under pink icing.',
        groups: [{ id: 'box', name: 'How many?', type: 'single', required: true, default: '2', options: [opt('2', '2 pieces'), opt('6', 'Box of 6', 90), opt('12', 'Box of 12', 220)] }],
      },
      {
        id: 'gato-patate', cat: 'desserts', name: 'Gato Patat', price: 60, img: 'gato-patate', tags: ['veg'],
        desc: 'Three sweet potato turnovers filled with coconut and cardamom.',
        groups: [{ id: 'box', name: 'How many?', type: 'single', required: true, default: '3', options: [opt('3', '3 pieces'), opt('6', '6 pieces', 55)] }],
      },
      {
        id: 'gato-banane', cat: 'desserts', name: 'Gato Banann', price: 65, img: 'gato-banane', tags: [],
        desc: 'Four warm banana fritters dusted with cinnamon sugar.',
        groups: [{ id: 'top', name: 'Toppings', type: 'multi', options: [opt('glace', 'Scoop of vanilla ice cream', 35), opt('miel', 'Drizzle of honey', 10), opt('coco', 'Toasted coconut', 10)] }],
      },
      {
        id: 'poudine', cat: 'desserts', name: 'Poudinn Koko', price: 85, img: 'poudine', tags: ['new'],
        desc: 'Chilled coconut pudding with a spoon of seasonal fruit.',
        groups: [{ id: 'top', name: 'Topping', type: 'single', required: true, default: 'fruit', options: [opt('fruit', 'Seasonal fruit'), opt('mangue', 'Mango coulis', 10), opt('nature', 'Plain')] }],
      },

      /* ---------- Drinks ---------- */
      {
        id: 'alouda', cat: 'drinks', name: 'Alouda', price: 80, img: 'alouda', tags: ['best'],
        desc: 'Iced milk with basil seeds and agar jelly. Port Louis market style.',
        groups: [
          { id: 'flavour', name: 'Flavour', type: 'single', required: true, default: 'vanille', options: [opt('vanille', 'Vanilla'), opt('amande', 'Almond'), opt('rose', 'Rose'), opt('fraise', 'Strawberry')] },
          SIZE(25), ICE,
          { id: 'top', name: 'Toppings', type: 'multi', options: [opt('glace', 'Scoop of ice cream', 25), opt('tukmaria', 'Extra basil seeds', 10)] },
        ],
      },
      {
        id: 'the-glace', cat: 'drinks', name: 'Dite Glase Vani', price: 70, img: 'the-glace', tags: [],
        desc: 'Bois Chéri-style vanilla black tea, brewed and iced in house.',
        groups: [SIZE(20), ICE, { id: 'sugar', name: 'Sweetness', type: 'single', required: true, default: 'normal', options: [opt('normal', 'Regular sweet'), opt('less', 'Less sweet'), opt('none', 'No sugar')] }],
      },
      {
        id: 'coco', cat: 'drinks', name: 'Koko Fre', price: 90, img: 'coco', tags: ['veg'],
        desc: 'A whole chilled green coconut, cut open when you collect.',
        groups: [{ id: 'cut', name: 'How would you like it?', type: 'single', required: true, default: 'whole', options: [opt('whole', 'Whole, with a straw'), opt('cup', 'Poured in a cup with flesh')] }],
      },
      {
        id: 'mangue', cat: 'drinks', name: 'Zi Mang Fre', price: 95, img: 'mangue', tags: [],
        desc: 'Fresh mango blended with ice, mint and a squeeze of lime.',
        groups: [SIZE(25), ICE, { id: 'style', name: 'Style', type: 'single', required: true, default: 'juice', options: [opt('juice', 'Juice'), opt('lassi', 'Lassi (with yoghurt)', 15)] }],
      },
      {
        id: 'cola', cat: 'drinks', name: 'Soft Drink', price: 55, img: 'cola', tags: [],
        desc: 'Ice-cold 330 ml can. Pick your flavour.',
        groups: [{ id: 'flavour', name: 'Flavour', type: 'single', required: true, default: 'cola', options: SOFT }, ICE],
      },
    ],
  };
})();
