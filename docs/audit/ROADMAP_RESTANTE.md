# Roadmap de las cartas restantes â€” actualizado tras L70

Estado medido (FASE 4, `node test_fase4_cards.js`): **350 cartas clasificadas**,
**3 Plots/Resources sin mecanica** (declaradas `declared_noop`), **0 cartas
bloqueadas**, 52 con status `unverified` (Groups, no deuda). Suite 13/13 en verde.

## A. Familia DESASTRES/RELIEF â€” CERRADA en L69 (auditoria Â§91)
- International Weather Organization (L67), Survivalists (L68) y Red Cross /
  Center for Disease Control / Boy Sprouts (L69).
- Piezas: `disasterResist` (L67), `reliefAuto` (L68) y `reliefController`,
  `reliefPower`, `reliefDraw`, `destroyPenalty`, `bioRisk` mas la rama
  `bring_relief`/`E.giveRelief` (L69).
- Lagunas declaradas en Â§91: Relief multi-jugador y decisiones "you may".

## B. Familia CANCELAR ACCIONES â€” L71 CERRADA (5 de 5)
- **Hechas**: Dan Quayle y Elvis (`cancel_media_action`), Dentists
  (`cancel_personality_action`), Supreme Court (`cancel_government_action`) y
  MI-5 (`hide_exposed`). La parte de MI-5 "negar una exposicion" queda
  declarada: el motor no tiene ventana de expose-all.

## C. DEUDA DE DATOS
- Global Power ausente: Cable TV, Subliminals, Hollywood.
- Texto corrupto/truncado: Bank of England, Bjorne, Cattle Mutilators, CFL-AIO,
  Eco-Guerillas, Feminists, Liquor Companies, NATO, Nancy Reagan, Ollie North,
  Pyramid Marketing Schemes, Secret Service, The Great Pyramid, China.
- Evil Geniuses: su accion toma "cualquier Recurso Gadget de la mano" y el
  dataset no tiene ningun Recurso con atributo `gadget`.

## D. MIXTAS que necesitan 2+ piezas
- **Stonehenge HECHA (L72)**: `immune.vsAtk={attr:'magic'}` (inmunidad de
  estructura a grupos Magic; Plots/Resources Magic quedan como limitacion).
- **Paranoids HECHA (L73)**: `def` +2 a toda la estructura, `noTokens` y
  `noDestroyUnlessPower` (no destruible con Poder 0).
- Moonbase, Orbit One, Tabloids, Ronald Reagan,
  Prince Charles, Professional Sports, Voudonistas, Vampires, Video Games,
  Savings and Loans, Jimmy Hoffa, Bill Clinton, Rifkinites, The Men in Black,
  Trading Card Games, Druids, Las Vegas, Multinational Oil Companies (solo >2
  jugadores), Rosicrucians, Fnord Motor Company, George Bush, TV Preachers,
  Dinosaur Park.

## E. Plots reactivas â€” CERRADAS en L70
- **Cover of Darkness** â†’ `resource_recover` (recupera el ultimo Resource
  destruido/descartado a la mano). Limitacion declarada: no es reactivo real,
  no filtra Gadget/Artifact.
- **I Lied**, **Opportunity Knocks**, **Power for its Own Sake** â†’
  `declared_noop` (jugables online, sin efecto, limitacion declarada).
- Cualquier implementacion fiel exige un subsistema de triggers de suceso.

## Ya resuelto (L41..L70)
Cartas mapeadas en los lotes L41-L70, con su seccion de auditoria (Â§78-Â§92).
Suite 13/13 en verde.



