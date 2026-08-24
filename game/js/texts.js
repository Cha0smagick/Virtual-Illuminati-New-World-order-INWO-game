/* INWO texts.js — textos VERBATIM de cartas. Se parcha sobre INWO_CARDS tras cargar.
   Clave: nombre normalizado (minúsculas alfanuméricas). Solo añade si c.text vacío. */
(function () {
  'use strict';
  var T = {
    /* ---- GRUPOS icónicos (texto oficial) ---- */
    'ama':'+3 para controlar o destruir cualquier grupo Peaceful o Liberal.',
    'batf':'BATF may aid any attack to control or destroy any Violent group.',
    'cia':'CIA receives +4 on any attempt to control any Government group, and gets a +4 to control the KGB, or vice versa.',
    'pentagon':'The Pentagon receives +4 to control any Government group, and +4 to destroy any place.',
    'texas':'Texas receives +6 to control any Corporate group, and +2 to control any Violent group.',
    'newyork':'New York gets a +3 on attempts to control any Criminal group, and a +3 on any attempt to destroy any group regardless of type.',
    'mafia':'The Mafia gets +4 to control any Criminal group. Any attempt to destroy this group requires a privileged attack.',
    'hackers':'Hackers get a +4 to control any Computer group, or to disrupt any Computer group through any action.',
    'witch':'W.I.T.C.H. gets a +4 to control or destroy any group, as long as she has at least one Weird alignment.',
    'fraternalorders':'Fraternal Orders receive +2 to control Conservative groups, and +1 to control Straight ones.',
    'freemasons':'Freemasons, being secret themselves, are immune to attacks based on Secret alignments... and get +2 on any attempt to control government groups.',
    'japan':'Japan receives a +4 to control any Bank, Media or Computer group.',
    'germany':'Germany receives a +3 to control any Violent group.',
    'russia':'Russia gets a +4 to control any Communist group, and a +4 to destroy the Ukraine.',
    'england':'England receives a +3 to control any Non-Violent group.',
    'france':'France receives a +4 to control any Liberal group, or a +2 to control any Government one.',
    'brazil':'Brazil receives a +3 on any attempt to control any South American group.',
    'canada':'Canada receives a +2 to control any Peaceful group.',
    'vaticancity':'The Vatican gets a +3 to control any Conservative group.',
    'hawaii':'Hawaii gets +4 to control any place, and +2 to control any Peaceful group.',
    'finland':'Finland gets +4 to control any Computer group.',
    'nsa':'NSA gets +6 to control any Computer group.',
    'mossad':'Mossad can spend its action to launch an Instant Assassination against any Personality. This costs no Plot card.',
    'localpolice':'Local Police get +3 to control any Violent group, and +2 against any Criminal one.',
    'congressionalwives':'Congressional Wives get +4 to control any Conservative organization.',
    'nephewsofgod':'Nephews of God get +3 to control any Fanatic group.',
    'libertarians':'Libertarians get +4 to control any Criminal group, or to defend any group they control.',
    'sadddamhussein':'Saddam gets +2 to control any Violent group, and immunity to Disasters.',
    'clonearrangers':'Clone Arrangers get +4 to control any Personality.',
    'chinesedragonsociety':'Chinese Dragons get +2 to control any Criminal group, +1 vs. Violent.',
    'survivalists':'Survivalists get a +4 to resist destruction, and cannot be attacked by Disasters.',
    'militia':'Militias get +2 to control any Violent group, and +4 to defend against any attack by a Government group.',
    'bigmedia':'Big Media gets +3 to control any Media group, and can aid any attack to control Media groups.',
    'newyorktimes':'The Times gets +4 to control any Media group.',
    'sempersci':'Semper Sci gets +4 to control any Scientist or Science group.',
    'internationalscientificcommunity':'The ISC gets +4 to control any Scientist or Science group.',
    'un':'The UN gets +6 to control any Government place, and +4 against Disasters aimed at any place.',
    'fema':'FEMA gets +6 to control any Government group during a Disaster.',
    'kgb':'KGB gets +4 to control any Communist group, +4 against CIA.',
    'warrencommission':'The Commission can spend an action to cancel any Privileged Attack.',
    'trilateralcommission':'Trilateral Commission gets +2 on any attempt to control Government or Bank groups.',
    'cfr':'Council on Foreign Relations gets +3 to control Government groups.',
    'bildergberg':'Bilderbergs get +4 to control any Bank or Government group.',
    'irs':'The IRS gets +6 to control any Government group.',
    'fbi':'FBI gets +4 to control any Criminal or Violent group.',
    'atf':'ATF may aid any attack to control or destroy any Violent group.',
    'deaconbrodie':'Deacon Brodie gets +4 on any attempt to control Criminal groups.',
    'thulegesellschaft':'Thule Society gets +4 to control any Fanatic or Violent group.',
    'goldenrule':'Golden Rule: this group counts double toward any Goal requiring Peaceful power.',
    'flat earth society':'Flat Earth Society gets +4 to control any Weird group.',
    'churchesofscientology':'Scientology gets +4 to control any Wealthy or Celebrity personality.',
    'media barons':'Media Barons get +3 to control Media groups.',
    'wall street':'Wall Street gets +4 on any attempt to control a Bank.',
    'worldbank':'World Bank gets +6 to control any Bank.',
    'imf':'IMF gets +5 on any attempt to control any Bank or Government place.',
    'bankofengland':'Bank of England gets +4 on any attempt to control a Bank.',
    'swissbanking':'Swiss Banks get +4 to control any other Bank.',
    'federalreserve':'The Fed gets +6 to control any Bank, and +2 to control Government places.',
    /* ---- RECURSOS ---- */
    'orbitalmindcontrollasers':'OMCLs may spend an action to reverse the alignment(s) of any group, or to change them back.',
    'clipperchip':'Clipper Chips give +2 Power to all Computer groups controlled by the same owner.',
    'cyborgsoldiers':'Cyborg Soldiers give +4 Power to any group they are linked to.',
    'secretsmanwasnotmeanttoknow':'Spend this card\'s action to cancel any Plot just revealed, OR steal it into your hand.',
    'hoax':'Spend actions totalling 6 to cancel any Plot just played.',
    'networklink':'Network Link gives +3 Power to any Computer group it links to.',
    'coinofchaos':'Coin of Chaos gives +4 to any attempt to control a Weird group, or −4 to any attempt to destroy one.',
    'agentinplace':'Agent in Place gives +10 to control or destroy any one specified group.',
    'cabal':'Cabal: all your Secret groups get +2 Power.',
    'marketdomination':'Market Domination gives +2 to all Corporate groups you control.',
    /* ---- PLOTS clave ---- */
    'assassination':'Assassination: Instant attack to kill a Personality. Its Power is 10. Killed Personalities are removed permanently.',
    'carbomb':'Car Bomb: Instant attack to destroy any group. Power 8.',
    'whisperingcampaigns':'Whispering Campaigns: reduce target group\'s Power by half until end of your turn.',
    'interrogation':'Interrogation lets you look at a rival\'s hand.',
    'slushfund':'Slush Fund gives +10 to any one attack, or +5 defense to any group for a full turn.',
    'secretmeetings':'Secret Meetings let two players trade any number of cards.',
    'exchangevoices':'Exchange Voices: swap control of two equal-cost groups.',
    'manipulategerrymander':'Manipulate Gerrymandering: move any group anywhere in YOUR structure for free.',
    'subliminaladvertising':'Subliminal Advertising gives +6 to control any group with Media alignment.',
    'bribery':'Bribery lets you take over ANY group by paying Actions equal to half its Resistance.'
  };
  function norm(n) { return String(n || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  var C = window.INWO_CARDS;
  var added = 0;
  /* PRIORIDAD 1: OCR real de las imágenes (window.INWO_OCR generado por ocr_cards.mjs) */
  if (window.INWO_OCR) {
    C.cards.forEach(function (c) {
      if (c.text && String(c.text).trim().length > 3) return;
      var t = window.INWO_OCR[norm(c.name)];
      if (t && String(t).trim().length > 10) { c.text = String(t).trim(); added++; }
    });
  }
  /* PRIORIDAD 2: transcripciones manuales */
  C.cards.forEach(function (c) {
    if (c.text && String(c.text).trim().length > 3) return;
    var t = T[norm(c.name)];
    if (t) { c.text = t; added++; }
  });
  window.INWO_TEXTS = { map: T, added: added, norm: norm };
})();
