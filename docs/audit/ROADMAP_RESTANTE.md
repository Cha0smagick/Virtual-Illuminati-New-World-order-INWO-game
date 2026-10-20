# Roadmap de las cartas `unverified` restantes — actualizado tras L69

Orden de ataque: primero lo que se resuelve con piezas ya montadas o con 1 pieza
nueva; al final lo que exige rediseño del motor o datos que no tenemos.

Estado medido (FASE 4, `node test_fase4_cards.js`): **339 cartas clasificadas**,
4 Plots/Resources sin mecanica, 56 con status `unverified` (de ellas 72 Groups que
P1-019 saco de la cuenta de deuda). Suite 13/13 en verde.

## A. Familia DESASTRES/RELIEF — CERRADA en L69 (auditoria §91)
- International Weather Organization (L67), Survivalists (L68) y Red Cross /
  Center for Disease Control / Boy Sprouts (L69).
- Piezas que se montaron: `disasterResist` (L67), `reliefAuto` (L68) y
  `reliefController`, `reliefPower`, `reliefDraw`, `destroyPenalty`, `bioRisk`
  mas la rama `bring_relief`/`E.giveRelief` (L69).
- Lo que quedo FUERA de esa familia y sigue en el backlog: el Relief
  multi-jugador de la regla ("one or more players... all spent at the same
  time") y las decisiones "you may"/"can use" que el motor headless resuelve
  solo. Los dos estan anotados como lagunas declaradas en §91.

## B. Familia CANCELAR ACCIONES (5 cartas) — REDISEÑO
- Dan Quayle, Dentists, Elvis, MI-5, Supreme Court.
- El motor no tiene pila de acciones: las acciones de grupo se ejecutan al
  momento en `useGroupAction`/`playPlot`. Exige modelar "accion en curso" con
  ventana de respuesta. Es el rediseño grande del roadmap.

## C. DEUDA DE DATOS (no se puede mapear sin imagen/fuente)
- Global Power ausente (#10): Cable TV, Subliminals, Hollywood. El motor ya lee
  `sc.globalPower` si existe; falta el dato en el dataset.
- Texto corrupto/truncado: Bank of England, Bjorne, Cattle Mutilators, CFL-AIO,
  Eco-Guerillas, Feminists, Liquor Companies, NATO, Nancy Reagan, Ollie North,
  Pyramid Marketing Schemes, Secret Service, The Great Pyramid, China.
- Evil Geniuses: su accion toma "cualquier Recurso Gadget de la mano" y el
  dataset no tiene ningun Recurso con atributo `gadget`.

## D. MIXTAS que necesitan 2+ piezas (atacables una a una)
- Moonbase, Orbit One (inmunidad a Disasters concretos + bonos), Stonehenge
  (inmunidad de estructura vs Magic), Paranoids (defensa < +2 y "sin acciones
  salvo que tenga Poder"), Tabloids, Ronald Reagan, Prince Charles, Professional
  Sports, Voudonistas, Vampires, Video Games, Savings and Loans, Jimmy Hoffa,
  Bill Clinton, Rifkinites, The Men in Black, Trading Card Games, Druids,
  Las Vegas, Multinational Oil Companies (solo >2 jugadores),
  Rosicrucians (busqueda en mazo: necesita UI), Fnord Motor Company,
  George Bush (alineacion opcional: necesita decision del jugador),
  TV Preachers (choque con la convencion de alineacion del motor),
  Dinosaur Park (+4 al Disaster es accion, no pasiva).
- (Imelda Marcos SALIO de esta lista en L66: kind `combo_bonus` con `imeldaRoll`.)

## E. Plots reactivas (4)
- Cover of Darkness, I Lied, Opportunity Knocks, Power for its Own Sake:
  se juegan "inmediatamente despues de X" y el motor no tiene triggers de
  evento para esos X (salvo Opportunity Knocks, que necesita ataque fuera de
  turno).

## Ya resuelto (L41..L69)
Cartas mapeadas en los lotes L41-L69, con su seccion de auditoria (§78-§91).
El frente ahora mismo: la familia A esta CERRADA; lo mas barato de atacar despues
es D carta a carta (cada una es 1-2 piezas), y lo caro es B (rediseño de pila de
acciones) y E (triggers de suceso). Suite 13/13 en verde.
