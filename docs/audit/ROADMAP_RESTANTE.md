# Roadmap de las cartas `unverified` restantes (64) — actualizado tras L65

Orden de ataque: primero lo que se resuelve con piezas ya montadas o con 1 pieza
nueva; al final lo que exige rediseño del motor o datos que no tenemos.

## A. Familia DESASTRES/RELIEF (5 cartas, 1-2 piezas nuevas)
- Survivalists, Red Cross, Center for Disease Control, Boy Sprouts,
  International Weather Organization.
- Piezas necesarias:
  1. `disasterResist` — en `announcePlotInstantAttack`, si el Plot es de tipo
     `disaster` y el DEFENSOR tiene grupos con `disasterResist`, sumar N a la
     defensa (hoy `groupDefenseBonus` no corre en los instant attacks).
  2. `reliefPower` — un grupo con Power distinto "a efectos de Relief" (Boy
     Sprouts = 12) y robo de Plot al ayudar a traer Relief.
- Con eso caen 4 de 5; la IWO ademas necesita su "+4 a cualquier Disaster que
  juegues" (que si funciona con `atkType:'disaster'`).

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
  Las Vegas, Imelda Marcos, Multinational Oil Companies (solo >2 jugadores),
  Rosicrucians (busqueda en mazo: necesita UI), Fnord Motor Company,
  George Bush (alineacion opcional: necesita decision del jugador),
  TV Preachers (choque con la convencion de alineacion del motor),
  Dinosaur Park (+4 al Disaster es accion, no pasiva).

## E. Plots reactivas (4)
- Cover of Darkness, I Lied, Opportunity Knocks, Power for its Own Sake:
  se juegan "inmediatamente despues de X" y el motor no tiene triggers de
  evento para esos X (salvo Opportunity Knocks, que necesita ataque fuera de
  turno).

## Ya resuelto en esta sesion (L41..L65)
78 cartas mapeadas + 24 piezas de motor nuevas. Suite 13/13 en verde.
