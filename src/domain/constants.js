// Exchanges that are regulated markets in EU or EEA.
// Under ЗДДФЛ Art. 13(1)(3), gains from ETFs traded on these exchanges are tax-exempt.
// EEA (Norway): also exempt. NOT exempt: EBS (Switzerland), LSE/LSEETF (UK post-Brexit), TASE (Israel).
export const EU_EEA_EXCHANGE_CODES = new Set([
  // Germany
  'FWB', 'IBIS', 'IBIS2', 'GETTEX', 'SWB', 'TGATE',
  // Netherlands
  'AEB',
  // France
  'SBF',
  // Italy
  'BVME', 'BVME.ETF',
  // Spain
  'BM',
  // Belgium
  'ENEXT.BE',
  // Denmark
  'CPH',
  // Portugal
  'BVL',
  // Hungary
  'BUX',
  // Czech Republic
  'PRA',
  // Norway (EEA)
  'OSE', 'OMXNO',
  // IBKR EU internaliser
  'EUIBSI',
])

// IBKR exchange code metadata — used for tooltips and determining tax treatment.
// regulated: true  → listed regulated market (MiFID/EEA)
// regulated: false → non-EU or unregulated (UK post-Brexit, CH, IL)
export const IBKR_EXCHANGES = {
  AEB:         { regulated: true,  name: 'Euronext Amsterdam',        country: 'Netherlands',    eu: true  },
  BM:          { regulated: true,  name: 'Madrid Stock Exchange',      country: 'Spain',          eu: true  },
  BUX:         { regulated: true,  name: 'Budapest Stock Exchange',    country: 'Hungary',        eu: true  },
  BVL:         { regulated: true,  name: 'Euronext Lisbon',            country: 'Portugal',       eu: true  },
  BVME:        { regulated: true,  name: 'Borsa Italiana',             country: 'Italy',          eu: true  },
  'BVME.ETF':  { regulated: true,  name: 'Borsa Italiana ETF',         country: 'Italy',          eu: true  },
  CPH:         { regulated: true,  name: 'Nasdaq Copenhagen',          country: 'Denmark',        eu: true  },
  EBS:         { regulated: false, name: 'SIX Swiss Exchange',         country: 'Switzerland',    eu: false },
  'ENEXT.BE':  { regulated: true,  name: 'Euronext Brussels',          country: 'Belgium',        eu: true  },
  EUIBSI:      { regulated: false, name: 'IBKR EU Internaliser',       country: 'EU',             eu: true  },
  FWB:         { regulated: true,  name: 'Frankfurt Stock Exchange',   country: 'Germany',        eu: true  },
  FWB2:        { regulated: true,  name: 'Frankfurt Stock Exchange',   country: 'Germany',        eu: true  },
  GETTEX:      { regulated: false, name: 'Boerse Muenchen',            country: 'Germany',        eu: true  },
  GETTEX2:     { regulated: false, name: 'Boerse Muenchen',            country: 'Germany',        eu: true  },
  IBIS:        { regulated: true,  name: 'Deutsche Börse Xetra',       country: 'Germany',        eu: true  },
  IBIS2:       { regulated: true,  name: 'Deutsche Börse Xetra',       country: 'Germany',        eu: true  },
  LSE:         { regulated: false, name: 'London Stock Exchange',      country: 'United Kingdom', eu: false },
  LSEETF:      { regulated: false, name: 'London Stock Exchange ETF',  country: 'United Kingdom', eu: false },
  OMXNO:       { regulated: true,  name: 'OMX Norway',                 country: 'Norway',         eu: true  },
  OSE:         { regulated: true,  name: 'Oslo Stock Exchange',        country: 'Norway',         eu: true  },
  PRA:         { regulated: true,  name: 'Prague Stock Exchange',      country: 'Czech Republic', eu: true  },
  SBF:         { regulated: true,  name: 'Euronext Paris',             country: 'France',         eu: true  },
  SWB:         { regulated: true,  name: 'Börse Stuttgart',            country: 'Germany',        eu: true  },
  TASE:        { regulated: false, name: 'Tel Aviv Stock Exchange',    country: 'Israel',         eu: false },
  TGATE:       { regulated: true,  name: 'TradeGate Exchange',         country: 'Germany',        eu: true  },
}

export const EU_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
])

export const COUNTRY_NAMES_BG = {
  US: 'САЩ',           DE: 'Германия',       IE: 'Ирландия',
  FR: 'Франция',        GB: 'Великобритания', LU: 'Люксембург',
  NL: 'Нидерландия',   CH: 'Швейцария',      JP: 'Япония',
  CN: 'Китай',          CA: 'Канада',         AU: 'Австралия',
  SE: 'Швеция',         DK: 'Дания',          NO: 'Норвегия',
  AT: 'Австрия',        BE: 'Белгия',         IT: 'Италия',
  ES: 'Испания',        PT: 'Португалия',     FI: 'Финландия',
  PL: 'Полша',          CZ: 'Чехия',          HU: 'Унгария',
  RO: 'Румъния',        GR: 'Гърция',         BG: 'България',
  HR: 'Хърватия',       SK: 'Словакия',       SI: 'Словения',
  LT: 'Литва',          LV: 'Латвия',         EE: 'Естония',
  MT: 'Малта',          CY: 'Кипър',          LI: 'Лихтенщайн',
  IS: 'Исландия',       SG: 'Сингапур',
  KY: 'Каймански о-ви', XS: 'Euroclear',
}
