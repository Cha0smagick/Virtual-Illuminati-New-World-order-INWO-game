# Catálogo de cartas — INWO OBD / WDH v1.2

> Catálogo generado por `scripts/build_card_catalog.cjs`. No es una aprobación canónica automática: cada fila conserva su fuente y estado.

## Fuentes

- [Lista oficial de Steve Jackson Games](https://www.sjgames.com/inwo/lists/ill.html): nombres, tipos, frecuencia y artista; no contiene Power/Resistance/efectos completos.
- [Reglas del proyecto](game/SPEC-RULES.md): reglas OBD/WDH v1.2 usadas por el motor.
- `game/js/cardtexts_data.js`: OCR local de los textos impresos; puede contener errores de lectura.
- `research/audit_reports/card_research_manifest.json`: manifest por carta con estado, evidencia de Internet y fuentes; las menciones no implican implementación automática.
- `game/js/cards.js`: datos runtime actuales; los campos estimados no se convierten en canónicos automáticamente.

## Regla de verificación

Una carta con estado `unverified` o `source-text-unmapped` no debe recibir una mecánica genérica. Su texto se conserva como evidencia y queda bloqueada para uso exacto hasta mapearla a una regla probada.

## Resumen

- Total: **421**
- Tipos runtime: group=167, illuminati=18, plot=201, resource=35
- Tipo oficial encontrado: **391/421**
- Texto OCR disponible: **417/421**
- Stats estimadas: **383**
- Power null: **374**
- Resistance null: **394**

| Estado mecánico | Cartas |
|---|---:|
| implemented | 1 |
| implemented-special | 18 |
| source-text-unmapped | 46 |
| unverified | 356 |

## Inventario completo

### A.M.A.

- ID: `ama` · runtime: `group` · oficial: `Grp.`
- Power: 3 · Resistance: 4 · alineamientos: peaceful, conservative, science · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - A.M.A..png`

> Texto fuente:
> 2 The AMA. can act to protect any Science group,
> @at or to helpattack it, regardless of alignments, It gets
> a +5 bonus to control, destroy or protect a Science

### Al Gore

- ID: `algore` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Al Gore.png`

> Texto fuente:
> Government VW Green

### American Autoduel Association

- ID: `americanautoduelassociation` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - American Autoduel Association.png`

> Texto fuente:
> for any attack to destroy a Violent group. It can

### Anti-Nuclear Activists

- ID: `antinuclearactivists` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Groups/INWO - Anti-Nuclear Activists.png`

> Texto fuente:
> Ne OE vee Fe EZ
> Ei oA Gives +6 on ary attempt to destroy any Soence 88
> er Gives +4 on any attempt to control any Green

### Antiwar Activists

- ID: `antiwaractivists` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Antiwar Activists.png`

> Texto fuente:
> - : Gives all groups in your Power Structure an extra
> +4 Resistance against any attack made by (or

### B.A.T.F.

- ID: `batf` · runtime: `group` · oficial: `Grp.`
- Power: 3 · Resistance: 2 · alineamientos: violent, government · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - B.A.T.F..png`

> Texto fuente:
> Has +8 on any direct attack to destroy any
> Fanatic group. Gives +6 for any attempt to control
> or destroy the Gun Lobby, the Tobacco
> Companies, or the Liquor Companies.

### Bank of England

- ID: `bankofengland` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Bank of England.png`

> Texto fuente:
> Sovecne ss i: Bank

### Big Media

- ID: `bigmedia` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Big Media.png`

> Texto fuente:
> ARO Cot Se ENA ee rb
> Gives +4 to any atternpt to control or destroy
> other Media. May aid or oppose any attack made
> by, or against, any other Media group.
> Liberal 4 Media

### Bill Clinton

- ID: `billclinton` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Groups/INWO - Bill Clinton.png`

> Texto fuente:
> Bill Clinton gives a +3 on any attempt to control
> any Government group that is part of the US. He
> has a +8 for direct control of any Government group.
> Any time Clinton's alignments matter, roll a die. On

### Bjorne

- ID: `bjorne` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Groups/INWO - Bjorne.png`

> Texto fuente:
> LRA Rr TE Joh ede
> RRC Ba # Beloved by children, detested by adults, the
> te However, anyone who destroys or kills Bjorné can Ee
> = immediately draw a Plot card as the thanks of a §
> BREE grateful world, plus one extra Plot card for every IEG
> 7 point of Bjarneé's Power at the ime Ped
> Peaceful foun ngs ina “Media 3

### Black Activists

- ID: `blackactivists` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Black Activists.png`

> Texto fuente:
> 2 Gives +2 to any attempt to control any Liberal
> Gives +4 to your defense against any attack

### Boy Sprouts

- ID: `boysprouts` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Boy Sprouts.png`

> Texto fuente:
> x Whenever the Boy Sprouts help to bring Relref to
> any Devastated location, you may draw a Plot card
> For purposes of bringing Relief, they have a Power

### Brazil

- ID: `brazil` · runtime: `group` · oficial: `Plc.`
- Power: 5 · Resistance: 3 · alineamientos: government, huge · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Brazil.png`

> Texto fuente:
> The natural resources of Brazil give one extra
> Action token to the group that controls it, if that
> group is Corporate.

### C.I.A.

- ID: `cia` · runtime: `group` · oficial: `Grp.`
- Power: 6 · Resistance: 5 · alineamientos: government, violent · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - C.I.A..png`

> Texto fuente:
> The CIA gets a +4 bonus, rather than the normal
> 4 penalty, to destroy any other Government
> group. When the CIA attempts to destroy a
> Personality, it may choose to make it an
> Assassination. The attack becomes Instant, and if it
> succeeds, the target is dead.

### Cable TV

- ID: `cabletv` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Cable TV.png`

> Texto fuente:
> 500 channels and nothing's on
> Add 1 to this group's regular and global Power
> for each Personality in your Power Structure :
> Corporate D4 Media

### California

- ID: `california` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: no-text-pending; OCR missing; menciones oficiales 0
- Imagen: `Groups/INWO - California.png`

> Texto fuente:
> Sin texto OCR disponible.

### Canada

- ID: `canada` · runtime: `group` · oficial: `Plc.`
- Power: 3 · Resistance: 4 · alineamientos: peaceful, liberal, government, huge · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Canada.png`

> Texto fuente:
> Canada has a +10 for direct control of any Green
> Government Wr Coastal, Nation

### Cattle Mutilators

- ID: `cattlemutilators` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Cattle Mutilators.png`

> Texto fuente:
> - Cattle Mutilators
> Their weird mtuols focetell the future... and more.
> By using this card's action, you can expose off
> hidden Plot cards belonging to any one rival

### Center for Disease Control

- ID: `centerfordiseasecontrol` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Center for Disease Control.png`

> Texto fuente:
> Center for Disease
> # As its action, the CDC can supply Relef to one
> Devastated location each turn. If the CDC makes a
> direct attack to destroy a Place, it can use biological
> fails, the "CDC is automatically destroyed by the
> owner of the Place that it attacked,

### CFL-AIO

- ID: `cflaio` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - CFL-AIO.png`

> Texto fuente:
> i Although the CFL-AIO is Corporate, it can call a
> strike against any other Corporation, It gets a +10 {
> for a direct Attack to Destroy any Corporate group, {
> attempt to destroy such a group |

### China

- ID: `china` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 3
- Imagen: `Groups/INWO - China.png`

> Texto fuente:
> The natural resources of China give one extra
> Action token to the group that controls it, if that
> group is Corporate.
> China has endured for thousands of years, and
> will likely be here for thousands more. Any attempt
> Government py R Coastal, Nation

### Church of Elvis

- ID: `churchofelvis` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Church of Elvis.png`

> Texto fuente:
> Church of Elvis
> Power of this group becomes 4 if Elvis 1s in play,
> or 8 if you control him

### Clone Arrangers

- ID: `clonearrangers` · runtime: `group` · oficial: `Grp.`
- Power: 6 · Resistance: 2 · alineamientos: violent, criminal · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Clone Arrangers.png`

> Texto fuente:
> Gives +4 on any attack to control a Personality
> As its action, this group may restore to life any
> just-killed Personality card, Other groups cannot §§8
> 8 interfere in any way. The restored Personality may
> be placed on any open control arrow of any of

### Comic Books

- ID: `comicbooks` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Comic Books.png`

> Texto fuente:
> f “1 if the Comic Books attack to control a Weird
> group, or help the attack, the target's printed
> 88 Resistance becomes 0 against that attack, and it
> E§ gets no Resistance bonus for the Weirdness of its

### Congressional Wives

- ID: `congressionalwives` · runtime: `group` · oficial: `Grp.`
- Power: 4 · Resistance: 4 · alineamientos: conservative, straight · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Congressional Wives.png`

> Texto fuente:
> The Congressional Wives have a +10 to take |
> direct control of any Government group. :

### Conspiracy Theorists

- ID: `conspiracytheorists` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Conspiracy Theorists.png`

> Texto fuente:
> WR 711s powerless and much-mocked group is prized by
> 35 Bl the llummati, becuse their wild ravings often contain bp
> hse While you control this group, you may have one FEias
> BMI x!/o Plot card in your hand at all times Zr I

### Count Dracula

- ID: `countdracula` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Groups/INWO - Count Dracula.png`

> Texto fuente:
> Dracula has +10 on any direct attempt to control
> The Count cannot be destroyed unless a Magic
> group or card is used. But if destroyed, he is perma-
> nently dead — nothing can bring him back.
> No Magic Artifact linked to the Count can ever be
> he dies, that Artifact is lost forever.

### Cycle Gangs

- ID: `cyclegangs` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Cycle Gangs.png`

> Texto fuente:
> “Hordes of bikers are rampaging ond looting,
> adding to the destruction. ..~
> Gives a +2 on any attempt to destroy another group,

### Dan Quayle

- ID: `danquayle` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Dan Quayle.png`

> Texto fuente:
> Nobody could be this dumb could they?
> Danny has the power to distract any Media group
> by making an incredibly stupid public remark. By
> using his action, he can cancel any action taken by
> any Media group.

### Democrats

- ID: `democrats` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Democrats.png`

> Texto fuente:
> For every reaction, there is on equal and opposite
> The Democrats have an extra +4 for direct control
> of any Government group that is not a Nation.

### Dentists

- ID: `dentists` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Dentists.png`

> Texto fuente:
> “You're not doing anything this week, Senator.
> Those wisdom teeth have to come out right now.”
> By using their own action, the Denusts can can-
> cel the Action(s) of any Personality.

### Deprogrammers

- ID: `deprogrammers` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Deprogrammers.png`

> Texto fuente:
> Gives a +4 to any attempt to destroy a \Weird or
> Fanatic group, or +8 if the target is both Weird and
> Fanatic. Discordia's immunity to Straight groups
> does not extend to the Deprogrammers.,

### Dinosaur Park

- ID: `dinosaurpark` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Dinosaur Park.png`

> Texto fuente:
> Dinosaur Park can use its action to increase the
> | dinosaurs “accidentally” escape from their ship-
> ping containers amidst the chaos.
> This group end its master may aid or oppose any
> attack on any Corporate or Saence group

### Druids

- ID: `druids` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 7
- Imagen: `Groups/INWO - Druids.png`

> Texto fuente:
> The Druids may aid or oppose any attack made
> Place a link between this group and any chosen
> Place. That Place has an effective +8 Power against
> Disasters. Bul if that Place is destroyed, the Druids
> are destroyed, 100, and count as a destroyed group
> for the attacker,

### Eco-Guerillas

- ID: `ecoguerillas` · runtime: `group` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Eco-Guerillas.png`

> Texto fuente:
> Has +6 on direct attacks to destroy Corporate
> Increases Resistance of all your groups by 2,
> against any attack made by (or aided by) a

### EFF

- ID: `eff` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - EFF.png`

> Texto fuente:
> Has +4 for direct control of any Computer group
> If the EFF helps to defend a Computer group
> against attack, the total Power spent by of
> defending groups is doubled.
> Liberal py Computer

### Elders of Zion

- ID: `eldersofzion` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Elders of Zion.png`

> Texto fuente:
> Elders of Zion
> An ancient and subtle brotherhood, the Elders
> know well the art of conspiracy. They can reorga
> nze your entire Power Structure. This must take
> place on your tum, and requires their action and
> an action from your llluminati
> Fanatic BD Secret

### Elvis

- ID: `elvis` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Elvis.png`

> Texto fuente:
> Elvis has the power to distract any Meda group
> by making a bref public appearance. By using his
> action, Elvis can cancel any action taken by any
> Media group! Elvis also has +6 for direct control of
> the Church of Elvis.

### Empty Vee

- ID: `emptyvee` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Empty Vee.png`

> Texto fuente:
> rf Zoe TRAN gl
> This group, and all other Mediz groups in your
> Power Structure, are totally immune to attacks
> from Straight groups.
> Each Personality you control gets +1 to its own A

### England

- ID: `england` · runtime: `group` · oficial: `Plc.`
- Power: 6 · Resistance: 2 · alineamientos: government, huge · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - England.png`

> Texto fuente:
> Though England's power is reduced today, her
> influence is still felt everywhere. England gets two
> action tokens every tum.

### Evil Geniuses for a Better Tomorrow

- ID: `evilgeniusesforabettertomorrow` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 3
- Imagen: `Groups/INWO - Evil Geniuses for a Better Tomorrow.png`

> Texto fuente:
> Evil Geniuses for a
> As this group's action, you may automatically
> take over any Cadget Resource from your hand.
> You must then link it to the Evil Gemuses,
> Resources linked to them cannot be unlinked . . .
> they are lost or captured if the Evil Geniuses are!
> Violent, Weird Science

### F.B.I.

- ID: `fbi` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - F.B.I..png`

> Texto fuente:
> Has +10 to directly destroy a Criminal group
> Gives +4 on any attempt to destroy a Criminal
> group, of +2 on ary attempt to control a Criminal

### Fast Food Chains

- ID: `fastfoodchains` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Fast Food Chains.png`

> Texto fuente:
> = Trax or E Tatevs
> ga Would you like fries with thot? E
> BRR ould you like fries with that? i!
> Toe 4% Nobody has any idea what's in those secret
> hi FER recipes. And when they find out, they forget again. Eee
> A Ae The owner of this card can automatically hide two EEE
> BEEN posed Plots on his turn; no action is required ]
> orporate NER oe
> Jl fon Sh EDA Hehe

### Federal Reserve

- ID: `federalreserve` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Federal Reserve.png`

> Texto fuente:
> Gives a +6 on any attack against any Bank, and
> a +2 on any altack against any Nation or
> Government N— Bank

### Feminists

- ID: `feminists` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Feminists.png`

> Texto fuente:
> The Feminists give an extra +3 on any attempt to
> control a Liberal group or destroy a Conservative
> By using the Feminists' action, you can randomly
> dravww one Group from the hand of any rival. If the
> group is Liberal, it goes into your hand. Otherwise,

### Fidel Castro

- ID: `fidelcastro` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Groups/INWO - Fidel Castro.png`

> Texto fuente:
> Personality bh &
> Nobody's ever known exactly what Fidel was up
> Link this card to one hidden Plot (put it upside- §
> down gn the table). Nothing can expose that Plot
> while Fidel remains in play. If the Plot is used, you
> may link another one to Fidel on your own turn
> Government Dh 4 Communist

### Fiendish Fluoridators

- ID: `fiendishfluoridators` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Fiendish Fluoridators.png`

> Texto fuente:
> Gives +5 to any alternpt to destroy a Straight or
> Conservative group. When you do destroy one,

### Finland

- ID: `finland` · runtime: `group` · oficial: `Plc.`
- Power: 6 · Resistance: 5 · alineamientos: liberal, government, computer · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Finland.png`

> Texto fuente:
> Finland has a +6 for direct control of any
> Computer group, and gives a +2 Lo any attempt to
> control a Computer group

### Flat Earthers

- ID: `flatearthers` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Flat Earthers.png`

> Texto fuente:
> : People laugh, but the Flat Earthers know some-
> thing. For their action, you may roll 2 dice. If your
> roll is equal to or less than the number of Places you z
> control, the Flat Earthers’ weird alternate geology
> has led them to a gold strike, and you may draw as
> many Plot cards as the number you rolled. ;

### Fnord Motor Company

- ID: `fnordmotorcompany` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Fnord Motor Company.png`

> Texto fuente:
> "Carriages without horses shall go / and accidents
> Everybody subsidizes Detroit. As its action, this
> [ group can let you re-rolf any failed attack by anoth-
> er group in your Power Structure. But you must
> also discard one Plot card.

### France

- ID: `france` · runtime: `group` · oficial: `Plc.`
- Power: 3 · Resistance: 5 · alineamientos: liberal, government, huge · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - France.png`

> Texto fuente:
> 8 France has always loved liberal causes. France's %
> Power can be used to defend any Liberal group
> you control, as a free action

### Fraternal Orders

- ID: `fraternalorders` · runtime: `group` · oficial: `Grp.`
- Power: 5 · Resistance: 5 · alineamientos: conservative · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Fraternal Orders.png`

> Texto fuente:
> You think they look silly with their hats and their
> a motor scooters. If you knew what those hats really §
> 2 By spending this group's action, you may draw
> another Group card at any time. é

### Fred Birch Society

- ID: `fredbirchsociety` · runtime: `group` · oficial: `Grp.`
- Power: 4 · Resistance: 4 · alineamientos: conservative, straight · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Fred Birch Society.png`

> Texto fuente:
> Fred Birch Society
> The Fred Birch Society, spiritual leaders of right
> wingers everywhere, counts as two Conservative
> groups for any llluminated goal, though not for
> the Basic Goal

### Gay Activists

- ID: `gayactivists` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Gay Activists.png`

> Texto fuente:
> Thas group can, as its action, reverse any one
> 8 alignment of any group in play. It may do this at
> any time except during an attack. The effect lasts
> only until the end of the current tum.

### George Bush

- ID: `georgebush` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Groups/INWO - George Bush.png`

> Texto fuente:
> George Bush is conservative — when he feels like
> it. He is treated as Conservative il and only if you,
> the illuminati pulling his strings, wont him to be

### Germany

- ID: `germany` · runtime: `group` · oficial: `Plc.`
- Power: 4 · Resistance: 3 · alineamientos: conservative, government, huge · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Germany.png`

> Texto fuente:
> Eapibet asad, mee JR fn fin
> : Germany can save its actions. It gets an Action
> By token each turn, even d some are zlready on it —
> and it can use 11s tokens together in one attack,
> 2 Gives a +2 to any attock to control a Science
> Government oN Nation

### Girlie Magazines

- ID: `girliemagazines` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Girlie Magazines.png`

> Texto fuente:
> Has =5 for direct control of any Straight group
> Sut they don't look at the pictures, they just read

### Goldfish Fanciers

- ID: `goldfishfanciers` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Goldfish Fanciers.png`

> Texto fuente:
> ERE A We're sorry, but we're not even permitted to hint %
> i A at what the Secret Knowledge is about goldfish o> 0
> a, Ee Your entire Power Structure is completely §8 :
> E really not gong to explain why. [eR
> AE RL Es rm Te sh Train TEA Ay

### Gordo Remora

- ID: `gordoremora` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Gordo Remora.png`

> Texto fuente:
> Personality oi ;
> il “Next up on Gordo: People who believe in conspirc-
> es! Are they nuts, or just too stupid to Ive? You decide!
> 88 He mobilizes hate and fear against fringe groups
> bonus if he makes a direct attack to destroy a Weird
> Liberal ; Media

### Gun Lobby

- ID: `gunlobby` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Gun Lobby.png`

> Texto fuente:
> Resistance is 3 normally. Agamnst any Liberal,
> Weird or Communist group, resistance is 10!
> Any time a Conservative or Violent group in your
> Power Structure is attacked — whether it succeeds
> or fails — you may draw a Plot Card as soon as the
> attack is over, if you still control the Cun Lobby.

### Hackers

- ID: `hackers` · runtime: `group` · oficial: `Grp.`
- Power: 3 · Resistance: 2 · alineamientos: weird, fanatic · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Hackers.png`

> Texto fuente:
> A The Hackers have a +4 for direct control of any
> i Computer group, They give a +2 to any attempt to
> destroy or control any Computer group. 3

### Hawaii

- ID: `hawaii` · runtime: `group` · oficial: `Plc.`
- Power: 0 · Resistance: 2 · alineamientos: — · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Hawaii.png`

> Texto fuente:
> muddle class, Hawaii gives one extra Action token
> 10 the group that controls it, if that group is
> Corporate \ Coastal

### Hillary Clinton

- ID: `hillaryclinton` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Hillary Clinton.png`

> Texto fuente:
> Gives +2 to any attempt to control Bill Clinton,
> direct control of any of these groups.

### Hollywood

- ID: `hollywood` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Groups/INWO - Hollywood.png`

> Texto fuente:
> “Behind the phony tinsel of Hopwood lies the real
> The Power of Hollywood (both regular and
> Global) is increased by 2 for each Media Personality
> in your Power Structure.
> Liberal ; yy Media

### I.R.S.

- ID: `irs` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Groups/INWO - I.R.S..png`

> Texto fuente:
> At the beginning of your turn, you may “tax”
> 88 any one rival for the top Plot card from his deck -
> Bl he may look at it before giving it to you. This is riot
> an action for the IRS.

### Imelda Marcos

- ID: `imeldamarcos` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Imelda Marcos.png`

> Texto fuente:
> Personality bh £ Ba
> . Wonder where all that gold went? Whenever
> Imelda uses her Power against a Government
> On a 6, she is destroyed, and counts as a destroyed
> group for the target of the attack

### Intellectuals

- ID: `intellectuals` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Intellectuals.png`

> Texto fuente:
> “I didn't understand that. It must be true.”
> A Media group which controls the Intellectuals [8
> 8 cannot be captured, or destroyed except by a
> Disaster or Assassination, and its own Power is

### International Cocaine Smugglers

- ID: `internationalcocainesmugglers` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Groups/INWO - International Cocaine Smugglers.png`

> Texto fuente:
> Gives +4 on any attempt to control the following
> groups, or any of ther puppets: Punk Rockers,
> Feel free to extend this bonus to any Personality
> that all players can agree on

### International Communist Conspiracy

- ID: `internationalcommunistconspiracy` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - International Communist Conspiracy.png`

> Texto fuente:
> +3 on any attempt to control any Communist
> group, or any puppet of a Communist group. The
> International Communist Conspiracy also has a
> Fanatic Communist group.
> Fanatic : wv Communist

### International Weather Organization

- ID: `internationalweatherorganization` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - International Weather Organization.png`

> Texto fuente:
> Ia Ena ah Wiaath
> All Places you control get a +6 to defend against
> any Desaster _ _ . but any Disaster you visit upon a
> Liberal dd Science

### Israel

- ID: `israel` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 6
- Imagen: `Groups/INWO - Israel.png`

> Texto fuente:
> Gives +8 on gny atternpt to control the Mossad.
> Israel has sympathizers everywhere. Israel can
> mterfere in any attack, regardless of alignment,
> even if it was privileged. That negates the privilege

### Italy

- ID: `italy` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Groups/INWO - Italy.png`

> Texto fuente:
> Power can be used to defend any Weird group you
> control, as a free action

### Japan

- ID: `japan` · runtime: `group` · oficial: `Plc.`
- Power: 6 · Resistance: 4 · alineamientos: peaceful, government, computer · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Japan.png`

> Texto fuente:
> Government hb 4 Coastal, Nation

### Jimmy Hoffa

- ID: `jimmyhoffa` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Jimmy Hoffa.png`

> Texto fuente:
> Personality bh 4 Aes
> EE ens Sd DC mm
> Hoffa has the power to paralyze any Corporate
> group by threatening a strike. By using his action, 3
> he can cancel any action taken by any Corporate
> +6 for direct control of the CFL-AIO.

### Joggers

- ID: `joggers` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Joggers.png`

> Texto fuente:
> No Ohie ser sir back 3

### Junk Mail

- ID: `junkmail` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Junk Mail.png`

> Texto fuente:
> Did you ever wonder what sort of sinister messages -
> might be hidden in that book-club edvertisement?
> This group may attack any Secret group directly,
> or aid or oppose any attack on a Secret group.
> Gives a +6 to any attempt to take control of a Secret

### KKK

- ID: `kkk` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 5
- Imagen: `Groups/INWO - KKK.png`

> Texto fuente:
> If the KKK makes or aids an attempt to destroy
> any Peaceful group, all Violent groups in that
> attack, on both sides, have doubled Power.

### L-4 Society

- ID: `l4society` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Groups/INWO - L-4 Society.png`

> Texto fuente:
> Gives +4 10 ony attempt to control or destroy any
> Science or Space group, or +8 for direct control of
> any Space group
> Weird Space. Science

### Las Vegas

- ID: `lasvegas` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Las Vegas.png`

> Texto fuente:
> You control the house. By spending Vegas’
> action, you may bet from 1 to 3 Plot Cards with
> you win, and you draw from ther deck

### Lawyers

- ID: `lawyers` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 6
- Imagen: `Groups/INWO - Lawyers.png`

> Texto fuente:
> You do not have to pay taxes to the IRS. You J
> automatically get a +4 bonus to defend against any
> attack involving either a Government or a

### Libertarians

- ID: `libertarians` · runtime: `group` · oficial: `Grp.`
- Power: 4 · Resistance: 4 · alineamientos: fanatic · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Libertarians.png`

> Texto fuente:
> If the Libertarians are involved in an attack to
> take control of any group away from a
> Government group, double the toial Power of the
> If the Libertarians ever take control of a Nation, or
> Power becomes equal to that of the Nation or State “5

### Liquor Companies

- ID: `liquorcompanies` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Liquor Companies.png`

> Texto fuente:
> With its huge advertising budget, this group
> gets a +4 on any direct attempt to control a Meda
> This group may use its action, at any time a rival
> s entitled to draw a card, to prevent him from
> making that draw. Only a single card-draw may be
> blocked per action
> Corporate vr :

### Loan Sharks

- ID: `loansharks` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Loan Sharks.png`

> Texto fuente:
> The Loan Sharks get +1 Power for every other
> Criminal group in your Power Structure

### Local Police Departments

- ID: `localpolicedepartments` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Local Police Departments.png`

> Texto fuente:
> This group cannot be destroyed

### Madison Avenue

- ID: `madisonavenue` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Madison Avenue.png`

> Texto fuente:
> ; “It is morally wrong to alow suckers to keep their
> ~ Canada Bil jones
> Has +10 for direct control of any Mediz group, or
> Qives +2 on any attempt to contro! or destroy any

### Manuel Noriega

- ID: `manuelnoriega` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Manuel Noriega.png`

> Texto fuente:
> Noriega's master can “borrow” any of his align-
> ments, even to the extent of reversing its own
> alignments, though only for purposes of making or
> Gives +6 to any attempt to control International
> Cocaine Smugglers i

### Margaret Thatcher

- ID: `margaretthatcher` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: no-text-pending; OCR missing; menciones oficiales 0
- Imagen: `Groups/INWO - Margaret Thatcher.png`

> Texto fuente:
> Sin texto OCR disponible.

### Media Sensation

- ID: `mediasensation` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 5
- Imagen: `Groups/INWO - Media Sensation.png`

> Texto fuente:
> Write in any name from today’s headlines . . . Any
> number of Media Sensations may be in play, as
> long as the names are different and don't duplicate
> any regular Personality card
> Destroying a Media Sensation does not count
> toward any Goal - they come and go too fast

### MI-5

- ID: `mi5` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - MI-5.png`

> Texto fuente:
> The British intelligence agencies have been hiding
> things in plain sight since the First World War . . . at
> As this group's action, you may negate one
> attempt to expose any or all of your Plot cards.
> Or you may turn all your exposed Plot cards

### Moonbase

- ID: `moonbase` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Groups/INWO - Moonbase.png`

> Texto fuente:
> Lhd an as AR TCE
> 0 ead Moonbase is not affected by any Disaster cards
> Eas except Earthquake and Meteor. Moonbase gives a
> Ee Gs +4 on any attempt to control or destroy any Space §
> Read Assassination attempt against that Personality is at §
> BREE Personalities there are killed Eas
> rs TUBE sss Co KESTER

### Moonies

- ID: `moonies` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Moonies.png`

> Texto fuente:
> They're harmless, they're annoying, and they're
> watching every airport in the world right now . .
> As their action, the Moonies can interfere in any
> privileged attack, regardless of akgnments, making
> that attack no longer privileged

### Moral Minority

- ID: `moralminority` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Moral Minority.png`

> Texto fuente:
> - Moral Minority
> 1 for every other Straight group in your power

### Mossad

- ID: `mossad` · runtime: `group` · oficial: `Grp.`
- Power: 2 · Resistance: 1 · alineamientos: violent, government · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Mossad.png`

> Texto fuente:
> Whenever you draw a Plot card, you may
> choose to draw from the bottom of your deck
> rather than the top. You may look at the bottom
> Plot card before you decide.

### Multinational Oil Companies

- ID: `multinationaloilcompanies` · runtime: `group` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Multinational Oil Companies.png`

> Texto fuente:
> n a game with more than two players, when
> this group makes or aids an attack, you may desig-
> nate one nval who connot interfere. You may wait

### N.S.A.

- ID: `nsa` · runtime: `group` · oficial: `Grp.`
- Power: 5 · Resistance: 2 · alineamientos: government, computer · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - N.S.A..png`

> Texto fuente:
> No Such Agency! It doesn't exist. Just ask them.
> Once per tum, on your turn, you can look at the
> three cards on the top or the bottom (your choice)
> of any player's Plots deck at the moment you ask.
> This does not count as an action.
> You may do the same thing, at any time, by

### Nancy Reagan

- ID: `nancyreagan` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Nancy Reagan.png`

> Texto fuente:
> Nancy Reagan |

### NASA

- ID: `nasa` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - NASA.png`

> Texto fuente:
> Sales eo DUG
> Gives +4 to any attempt to control any Space ]
> NASA can give its Action token to any other
> Sess Government group you control, as long as that
> group currently has no token. It may do this at any
> time except during an attack.

### NATO

- ID: `nato` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - NATO.png`

> Texto fuente:
> Can interfere in any attack made by or against a
> Its Power counts triple when qiving Relief.

### Nephews of God

- ID: `nephewsofgod` · runtime: `group` · oficial: `Grp.`
- Power: 1 · Resistance: 1 · alineamientos: conservative, fanatic · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Nephews of God.png`

> Texto fuente:
> Nephews of God
> The leaders of this group hide inhuman clever-
> ness behind a mask of slack-javeed imbecility. Each
> turn, when you draw either your Plot or your
> another card from that deck!

### New York

- ID: `newyork` · runtime: `group` · oficial: `Plc.`
- Power: 7 · Resistance: 8 · alineamientos: government, violent, criminal · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - New York.png`

> Texto fuente:
> Apple does it better. The Power of cach of your
> other Criminal groups is increased by 1.

### Ninjas

- ID: `ninjas` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Groups/INWO - Ninjas.png`

> Texto fuente:
> Gives a +4 on any Assassination attempt, and a
> +2 on any non.instant Attack to Destroy.
> Any attempt to destroy the Ninjas is at a -10
> penalty, and any failed attempt to control or
> destroy them gives them an Action token

### Nuclear Power Companies

- ID: `nuclearpowercompanies` · runtime: `group` · oficial: `Grp.`
- Power: 4 · Resistance: null · alineamientos: conservative, corporate, science · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Nuclear Power Companies.png`

> Texto fuente:
> They re worping reality in those reactors. It's unnat-
> 3 2s gs action this group can cancel the action of
> any other group, even an lluminati group. fas

### Offshore Banks

- ID: `offshorebanks` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Offshore Banks.png`

> Texto fuente:
> 3 This group is immune to any Attack to Destroy
> by Government, Corporate or Criminal groups!
> The Offshare Banks are used to reorganizing
> move any greup you control to any other legal
> 5 position in your Power Structure once per turn, on
> Criminal py Bark

### Ollie North

- ID: `ollienorth` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: no-text-pending; OCR missing; menciones oficiales 0
- Imagen: `Groups/INWO - Ollie North.png`

> Texto fuente:
> Sin texto OCR disponible.

### OPEC

- ID: `opec` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 7
- Imagen: `Groups/INWO - OPEC.png`

> Texto fuente:
> As off prices vary, OPEC's power also varies, At the
> beginning of your tum, roll 2 dice, subtracting 2
> fom the total, to set its power for that turn. (That is
> the Power of its Action token, even if you use it Ji
> Ster) ¥ you also control either Texas or the
> Multinational Od Companies, OPEC gets +1 power

### Orbit One

- ID: `orbitone` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 11
- Imagen: `Groups/INWO - Orbit One.png`

> Texto fuente:
> Each Scence group directly controlled by Orbit
> One lets you draw one extra Plot card per turn.
> Orbit One is not affected by any Disaster cards
> except Earthquake and Meteor.

### Paranoids

- ID: `paranoids` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Paranoids.png`

> Texto fuente:
> The Paranoids give your whole Power Structure a ;
> +2 to defend against any attack or Assassination
> 3 (but not against Disasters). They're the only ones,
> except for the Secret Masters themsedves, who
> really understand what is going on
> However, this group gets no Action tokens and
> v can do nothing, unless something gives it Power!
> | And it cannot be destroyed unless it has Power.

### Pentagon

- ID: `pentagon` · runtime: `group` · oficial: `Plc.`
- Power: 6 · Resistance: 6 · alineamientos: government, violent, straight, conservative · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Pentagon.png`

> Texto fuente:
> Pentagon lets you draw one extra Plot card each

### Phone Company

- ID: `phonecompany` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Phone Company.png`

> Texto fuente:
> The Phone Company is capable of highly sophis-
> 3 ticated traffic analysis on all calls, and can access
> any computer connected to the Net. During your
> turn, you may draw any two hidden Plot cards
> 8 randomly from the hand of a rival, and look at
> them. This is a free move
> At any time, the Phone Company may use its
> action to draw any two hidden Plot cards randomly
> from the hand of a rival and expose them!
> Corporate Vy Computer

### Phone Phreaks

- ID: `phonephreaks` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Groups/INWO - Phone Phreaks.png`

> Texto fuente:
> Bats a fd ale Pa AN
> Gives +6 on any attempt to control or destroy any
> By using this group's action, you may move any
> group belonging to any player — except puppets of
> rival llluminati groups — to any other control arrow
> in their same Power Structure, at any tme except
> during an attack,

### Pollsters

- ID: `pollsters` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Pollsters.png`

> Texto fuente:
> “Well tell you what you think!”
> If the Polisters are involved in an attack, you may
> ignore any bonuses or penalties for the alignments
> of the attacker and defender, f they work against
> you. Of course, those bonuses or penaltzes which
> help you will still count.

### Post Office

- ID: `postoffice` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Post Office.png`

> Texto fuente:
> Of course they read the mail. During your turn,
> you may draw any two Group cards randomly
> from the hand of a rival, and look at them. This is
> Al any time, the Post Office may use its action to
> draw any two Group cards randomly from the
> hand of a rival and show them to all players!
> Government 4 Computer

### Prince Charles

- ID: `princecharles` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Prince Charles.png`

> Texto fuente:
> Personality bh &
> Prnce Charles, and his master, and his puppets,
> are all immune to Privileged attacks. Also, any
> group, regardless of alignment, can aid the Prince
> if he is attacked.
> 3 However, all Media groups have doubled Power
> for any attack against Prince Charles.
> Conservative Do ; Green

### Princess Di

- ID: `princessdi` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Princess Di.png`

> Texto fuente:
> Personality bh &
> Al your other Liberal groups get +1 Power.
> Princess Di, and her puppets, are immune to
> attack by your rivals’ Peaceful or Liberal groups .
> xcept for Medio

### Professional Sports

- ID: `professionalsports` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Professional Sports.png`

> Texto fuente:
> Gives +4 on any attempt to control any Straight
> Link this card to any one Personality you control,
> to give them +3 Power as a worldwide sports

### Psychiatrists

- ID: `psychiatrists` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Psychiatrists.png`

> Texto fuente:
> Psvchiat 2 lu
> Gives +6 to any attack to Destroy a Personality.
> This bonus does not apply to a privileged attack,
> no matter who made it privileged
> By using its action, this group may force a rival
> to discard any one exposed Plot except a Goal.

### Punk Rockers

- ID: `punkrockers` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Punk Rockers.png`

> Texto fuente:
> If this group uses its Power in an attack (on either
> 8 side), no Weird or Liberal groups may aid the target
> : in any way. (The attacker or defender may still be
> Weird or Liberal; this is not affected.)

### Pyramid Marketing Schemes

- ID: `pyramidmarketingschemes` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Groups/INWO - Pyramid Marketing Schemes.png`

> Texto fuente:
> each Fanatic group in your Power Structure

### Recording Industry

- ID: `recordingindustry` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Recording Industry.png`

> Texto fuente:
> by 2, and ali your other Personalities by 1.
> Corporate oh pe EE Media

### Red Cross

- ID: `redcross` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Red Cross.png`

> Texto fuente:
> The Red Cross gives your whole Power Structure
> a +6 to resist any Disaster. The group that directly
> controls the Red Cross automatically gets Refief at
> the end of the turn it is Devastated.
> As its action, the Red Cross can also bring Relief
> to one Devastated Place.
> The Red Cross has such a good reputation that
> any attempt to destroy it suffers a -15 penalty

### Reformed Church of Satan

- ID: `reformedchurchofsatan` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Reformed Church of Satan.png`

> Texto fuente:
> The very existence of this church infuriates
> Straights. While you control it, no Straight group
> can attack, or help attack, any part of your power
> structure except this group! They can attack only to
> any attack by Straights.

### Religious Reich

- ID: `religiousreich` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Religious Reich.png`

> Texto fuente:
> This group can interfere in any privileged attack
> @ made by, or with the help of any Straight or
> Conservative group. If it does so, that attack is no
> Conservative wr Church

### Republicans

- ID: `republicans` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Republicans.png`

> Texto fuente:
> “If the Republicans vAll stop telling hes about the
> Democrats, we will stop teiiing the truth about them
> — Adlai Stevenson
> The Republicans have an extra 45 for direct control
> of any Government group that is not a Nation. to]
> Conservative vv ;

### Rifkinites

- ID: `rifkinites` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Rifkinites.png`

> Texto fuente:
> Fanatically anti-technolegy, this group has +6 for
> attempt to destroy any Corporate, Science, Space
> i or Computer group. It gives a +2 bonus for each of
> these things, so a target that is Corporate, Space
> and Computer will be attacked at +6
> Fanatic : Green

### Robot Sea Monsters

- ID: `robotseamonsters` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Robot Sea Monsters.png`

> Texto fuente:
> Gives +4 to any attempt to destroy any
> Corporate or Government group, or any Coostc! 58
> as Has +10 to any dvect attempt to destroy Japan fd

### Ronald Reagan

- ID: `ronaldreagan` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Ronald Reagan.png`

> Texto fuente:
> Bera Sama (NEA Sak
> = is Teflon coating completely immunizes him ;
> from any attack by (or aided by) the Medio, And if he
> Ba ‘tacks, or helps in an attack, no Media group may
> jain on the other side after he becomes involved. 4

### Rosicrucians

- ID: `rosicrucians` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Rosicrucians.png`

> Texto fuente:
> The true Rosirucians do not advertise, and their
> powers are recondite indeed . .
> When you are entitled to draw a Plot card, you
> have 30 seconds to look through your deck and
> pick the card you want. This is an action for the
> Rosicrucians. You must shuffle the deck afterward

### Ross Perot

- ID: `rossperot` · runtime: `group` · oficial: `Per.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Ross Perot.png`

> Texto fuente:
> Any group controlled by Perot immediately
> becomes Straight and Conservative, losing any
> Weird or Liberal alignments it had. This is a
> “permanent” change, but the akgnments will
> revert to normal if the group gets another master,

### Russia

- ID: `russia` · runtime: `group` · oficial: `Plc.`
- Power: 4 · Resistance: 4 · alineamientos: violent, government, huge · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Russia.png`

> Texto fuente:
> we ho \ Nae Hafalay NAF a
> Russia has a +4 for direct control of any
> Communist group, and gives a +2 for any attempt
> to control or destroy a Communist group. However, X
> any Communist group gets a +4 for direct control of
> Government SN Nation

### S.M.O.F.

- ID: `smof` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Groups/INWO - S.M.O.F..png`

> Texto fuente:
> Has +2 for any attempt to control any Weird ;
> group. An extra +4 for direct control of SF Fans,
> Trekkies, Wargamers, Comic Books or Trading
> Once per tum, on the owning player's turn,
> SMOF can remove the Action token from one Weird
> : group owned by any rival. This is a free action

### Saddam Hussein

- ID: `saddamhussein` · runtime: `group` · oficial: `Per.`
- Power: 5 · Resistance: 4 · alineamientos: government, violent · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Saddam Hussein.png`

> Texto fuente:
> Personality bh &
> By making a few speeches, Saddam can infuriate
> any oovernment, totally distracting them from
> what they wer doing. Thus, by using his action,
> Saddam can cancel one action of any Government

### Saturday Morning Cartoons

- ID: `saturdaymorningcartoons` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Saturday Morning Cartoons.png`

> Texto fuente:
> : Gives +2 to any attempt to control any Violent 5
> The Cartoons also have the power to make other
> % puppet of the Cartoons becomes Violent. This is a
> =e permanent” change, but the alignments will
> | revert to normal if the group gets another master

### Savings and Loans

- ID: `savingsandloans` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Savings and Loans.png`

> Texto fuente:
> ‘Savings and Loans
> Gives +3 to any attempt to control any
> Corporate or Government group or Bank,
> The S&Ls have the power to make money
> vanish. By spending their action, they can cancel
> the action of any Bonk, Corporate or Government

### Science Fiction Fans

- ID: `sciencefictionfans` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Science Fiction Fans.png`

> Texto fuente:
> Science Fiction Fans
> Gives +2 to any attempt to control or destroy any
> Computer group. Gives its master +6 to any such

### Secret Service

- ID: `secretservice` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Secret Service.png`

> Texto fuente:
> “The quards wrestled the assassin to the ground,
> Gives +10 to any attempt to destroy any Govern-
> ment Personality, including by Assassination. Has
> the normal -4 for a direct attack to destroy other

### Secular Humanists

- ID: `secularhumanists` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Secular Humanists.png`

> Texto fuente:
> While you control this group, all Straight or
> Conservative groups will be so distracted that any
> attacks they make against your other groups will

### Semiconscious Liberation Army

- ID: `semiconsciousliberationarmy` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Groups/INWO - Semiconscious Liberation Army.png`

> Texto fuente:
> Violent, Criminal Vy Q Communist

### Silicon Valley

- ID: `siliconvalley` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Groups/INWO - Silicon Valley.png`

> Texto fuente:
> Gives 4 10 any attempt to control a Computer G
> 5 On your turn, you can use Silicon Valley's action to
> draw an extra Plot card. 1

### Society for Creative Anarchism

- ID: `societyforcreativeanarchism` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Society for Creative Anarchism.png`

> Texto fuente:
> Society for. Creative
> Gives +4 to any attempt to destroy any Straight
> By using this group's action, you may force a rival 8
> to discard the top card from his Groups deck { :

### South American Nazis

- ID: `southamericannazis` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - South American Nazis.png`

> Texto fuente:
> group, and gives +3 Power to any Weird Science
> group it controls!

### Stonehenge

- ID: `stonehenge` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 7
- Imagen: `Groups/INWO - Stonehenge.png`

> Texto fuente:
> immune to all attacks from Megic groups, Plots or

### Subliminals

- ID: `subliminals` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Subliminals.png`

> Texto fuente:
> Their secret mind-altering messages are hidden
> @ everywhere, The number of Media groups you
> control is added to the Power and Global Power of

### Supreme Court

- ID: `supremecourt` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Supreme Court.png`

> Texto fuente:
> By using its action, the Supreme Court can
> cancel one action of any other Covernment :

### Survivalists

- ID: `survivalists` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Survivalists.png`

> Texto fuente:
> 2 This group gives your whole power structure a +3 8
> i to resist any Disaster. The master of the Survivalists,
> i and any puppets it has, automatically get Relief the
> | turn after any Devastation. This is a free action.

### Switzerland

- ID: `switzerland` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 5
- Imagen: `Groups/INWO - Switzerland.png`

> Texto fuente:
> Place yy bh i
> of Switzerland, and can never destroy it. Any other
> llfuminati that controls Switzedand gets a +2 to any
> attempt Lo attack the Gnomes for any purpose!
> Government oN Nation

### Tabloids

- ID: `tabloids` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Tabloids.png`

> Texto fuente:
> Psychics Reveal Jackie's Diet Plan From Heaven!
> The Tabloids can attack any Secret group — and
> if they do, its Secret status is lost for that attack, ]
> and any other groups can help attack or defend,
> regardless of alignment.
> Gives +3 for any attempt to control Convenience |

### Telephone Psychics

- ID: `telephonepsychics` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Telephone Psychics.png`

> Texto fuente:
> | 2 ie control of either Ronald or Nancy

### Templars

- ID: `templars` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Groups/INWO - Templars.png`

> Texto fuente:
> growing in power, and wealth, and strange knowl
> By using this group's action, you may force any
> rival to discard one exposed Plot card of your
> Conservative Secret, Magic

### Texas

- ID: `texas` · runtime: `group` · oficial: `Plc.`
- Power: 14 · Resistance: 9 · alineamientos: government, violent, conservative, huge · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Texas.png`

> Texto fuente:
> bh You wouldn't befieve what's hidden in the miles and | 4
> miles of Texas’ plains. They're counting on that.
> You may place one Plot card (except a Goal)
> under Texas. It does not count against your limit,
> and cannot be exposed. You may use it at any time,
> but only for something involving Texas. You may
> switch it with another card, but only on your turn.
> if Texas is captured or destroyed, the Plot is lost.
> Government Vv Coastal

### The Great Pyramid

- ID: `thegreatpyramid` · runtime: `group` · oficial: `Plc.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Groups/INWO - The Great Pyramid.png`

> Texto fuente:
> "The Great Pyramid
> TRH rin id ie
> The keepers of the Pyramid have a limited power
> to foresee the future. Your rivals must ahvays show
> you the first Plot card they draw on each tum. You
> may not make notes about what they show you!
> The Pyramid is immune to Tomadoes and

### The Mafia

- ID: `themafia` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Groups/INWO - The Mafia.png`

> Texto fuente:
> any Criminal group directly. Also gives its owner a
> +2 on any attempt to control or destroy any

### The Men in Black

- ID: `themeninblack` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - The Men in Black.png`

> Texto fuente:
> The Men in Black
> Gives a +4 to destroy, but only if their Power is
> used either to make or aid the attack. If that attack
> succeeds, the target is permanently removed from
> play; nothing can bring it back.

### Tobacco Companies

- ID: `tobaccocompanies` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Tobacco Companies.png`

> Texto fuente:
> The Tobacco Companies have a +8, not the
> normal <4, for drect contro! of any Government
> group! Any Green group gets a +4 to destroy the

### Trading Card Games

- ID: `tradingcardgames` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Groups/INWO - Trading Card Games.png`

> Texto fuente:
> § aaing al ames
> You control all trading card games, including this
> one. Therefore, at any time during your turn, you
> a may take any other Group card from your hand,
> discard this card, and substitute the new card in its
> place in your Power Structure. No die roll is

### Trekkies

- ID: `trekkies` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Trekkies.png`

> Texto fuente:
> ea Any Media group gets a +4 on any attack to
> control the Trekkies. However, the Trekkies also get
> a +4 on any direct attack to control any Meda

### Triliberal Commission

- ID: `triliberalcommission` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Groups/INWO - Triliberal Commission.png`

> Texto fuente:
> = The Triliberal Commission, loaded with leading
> 88 loerals and loyal leftist lackeys, counts as two
> Liberal groups for any Illuminated goal, though
> not for the Basic Goal

### TV Preachers

- ID: `tvpreachers` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 3
- Imagen: `Groups/INWO - TV Preachers.png`

> Texto fuente:
> Instead of the normal penalty for one Fanatic group
> controlling another, the TV Preachers have anet +6 to
> take direct control of any Straight Fanatic group.
> y Any group they control gets an extra +5
> Fanatic } Church

### Underground Newspapers

- ID: `undergroundnewspapers` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Underground Newspapers.png`

> Texto fuente:
> Whenever this group helps to destroy a
> Corporate, Straight or Government group, draw
> an extra Plot card.

### United Nations

- ID: `unitednations` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - United Nations.png`

> Texto fuente:
> Its Power counts x5 when giving Refef.

### Urban Gangs

- ID: `urbangangs` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Urban Gangs.png`

> Texto fuente:
> Zlza ZA Sem he
> group, Including Assassinations

### Vampires

- ID: `vampires` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 5
- Imagen: `Groups/INWO - Vampires.png`

> Texto fuente:
> +4 on any direct attack to control a Personality. If
> the attack succeeds, that Personalty becomes a
> Vampire, and cannot be killed except by a Magic
> group or card (no matter who controls him at the
> time). But of a Vampire is kiled, he 1s permanently
> dead - nothing can bring him back
> Weird Secret, Magic

### Vatican City

- ID: `vaticancity` · runtime: `group` · oficial: `Plc.`
- Power: 4 · Resistance: 4 · alineamientos: peaceful, conservative · estimado: no
- Mecánica: `sin-effect` · estado: **implemented** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Vatican City.png`

> Texto fuente:
> Sin texto OCR disponible.

### Video Games

- ID: `videogames` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Groups/INWO - Video Games.png`

> Texto fuente:
> Gives +3 on any attempt to control Convenence
> Stores or any Computer group
> ¢ Gives +1 Power to all your Computer groups!

### Voudonistas

- ID: `voudonistas` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Groups/INWO - Voudonistas.png`

> Texto fuente:
> Has +8 on any direct Attack to Destroy a
> cards or other special defenses against
> Assassinabons are worthless against this attack
> unless they mention Magic
> Violent : Magic

### W.I.T.C.H.

- ID: `witch` · runtime: `group` · oficial: `Grp.`
- Power: 3 · Resistance: 3 · alineamientos: weird, violent, fanatic, magic · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - W.I.T.C.H..png`

> Texto fuente:
> The Women's International Terrorist Conspiracy
> from Hell can use its action to change any die roll
> Violent & Magic

### Wall Street

- ID: `wallstreet` · runtime: `group` · oficial: `Grp.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 11
- Imagen: `Groups/INWO - Wall Street.png`

> Texto fuente:
> Ahvays has the option to treat any Corporate
> NB group as though it was Government, or vice versa,
> when it makes or aids an attack.
> Corporate Gr hE Bank

### Wargamers

- ID: `wargamers` · runtime: `group` · oficial: `Grp.`
- Power: 1 · Resistance: null · alineamientos: weird · estimado: no
- Mecánica: `ability_unverified` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Groups/INWO - Wargamers.png`

> Texto fuente:
> Gives +2 on any attempt to control or destroy any
> By using their action, the Wargamers can send
> any one exposed Plot to the bottom of its owner's [88

### Adepts of Hermes 1

- ID: `adeptsofhermes1` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: no
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Adepts of Hermes 1.png`

> Texto fuente:
> When an attempt to control one of your uncontrolled Groups fails, or you fail to control a Group from your hand, you keep it instead of discarding it.

### Adepts of Hermes 2

- ID: `adeptsofhermes2` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Adepts of Hermes 2.png`

> Texto fuente:
> When an attempt to control one of your uncontrolled Groups fails, or you fail to control a Group from your hand, you keep it instead of discarding it.

### Bavarian Illuminati 1

- ID: `bavarianilluminati1` · runtime: `illuminati` · oficial: `Ill.`
- Power: 10 · Resistance: null · alineamientos: — · estimado: no
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Bavarian Illuminati 1.png`

> Texto fuente:
> Once per turn may declare one attack Privileged. Power 10.

### Bavarian Illuminati 2

- ID: `bavarianilluminati2` · runtime: `illuminati` · oficial: `Ill.`
- Power: 10 · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Bavarian Illuminati 2.png`

> Texto fuente:
> Once per turn may declare one attack Privileged. Power 10.

### Bermuda Triangle 1

- ID: `bermudatriangle1` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: no
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Bermuda Triangle 1.png`

> Texto fuente:
> At end of your turn you may reorganize your power structure freely.

### Bermuda Triangle 2

- ID: `bermudatriangle2` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Bermuda Triangle 2.png`

> Texto fuente:
> At end of your turn you may reorganize your power structure freely.

### Discordian Society 1

- ID: `discordiansociety1` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: no
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Discordian Society 1.png`

> Texto fuente:
> Your entire power structure is immune to Straight AND Government groups. Weird groups count double toward your Basic Goal.

### Discordian Society 2

- ID: `discordiansociety2` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Discordian Society 2.png`

> Texto fuente:
> Your entire power structure is immune to Straight AND Government groups. Weird groups count double toward your Basic Goal.

### Gnomes of Zurich 1

- ID: `gnomesofzurich1` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: no
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Gnomes of Zurich 1.png`

> Texto fuente:
> +4 to control any Bank group. Corporate groups count double toward your Basic Goal.

### Gnomes of Zurich 2

- ID: `gnomesofzurich2` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Gnomes of Zurich 2.png`

> Texto fuente:
> +4 to control any Bank group. Corporate groups count double toward your Basic Goal.

### Servants of Cthulhu 1

- ID: `servantsofcthulhu1` · runtime: `illuminati` · oficial: `Ill.`
- Power: 9 · Resistance: null · alineamientos: — · estimado: no
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Servants of Cthulhu 1.png`

> Texto fuente:
> +4 on all your attacks to destroy (not instant). GOAL: destroy 8 groups.

### Servants of Cthulhu 2

- ID: `servantsofcthulhu2` · runtime: `illuminati` · oficial: `Ill.`
- Power: 9 · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Servants of Cthulhu 2.png`

> Texto fuente:
> +4 on all your attacks to destroy (not instant). GOAL: destroy 8 groups.

### Shangri-La 1

- ID: `shangrila1` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: no
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Shangri-La 1.png`

> Texto fuente:
> +5 defense against Instant Attacks on your groups. You may never attack to destroy a non-Violent group. GOAL: control Peaceful groups with total printed Power of 30.

### Shangri-La 2

- ID: `shangrila2` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - Shangri-La 2.png`

> Texto fuente:
> +5 defense against Instant Attacks on your groups. You may never attack to destroy a non-Violent group. GOAL: control Peaceful groups with total printed Power of 30.

### The Network 1

- ID: `thenetwork1` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: no
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - The Network 1.png`

> Texto fuente:
> Draw two Plot cards at start of each turn. Computer groups count double toward your Basic Goal.

### The Network 2

- ID: `thenetwork2` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - The Network 2.png`

> Texto fuente:
> Draw two Plot cards at start of each turn. Computer groups count double toward your Basic Goal.

### UFOs 1

- ID: `ufos1` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: no
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - UFOs 1.png`

> Texto fuente:
> You get TWO Illuminati action tokens per turn. GOAL: secretly pick 3 non-Illuminati groups when game starts; control all 3 to win.

### UFOs 2

- ID: `ufos2` · runtime: `illuminati` · oficial: `Ill.`
- Power: 8 · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `illu_special` · estado: **implemented-special** · implementada: sí
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Illuminati/INWO - UFOs 2.png`

> Texto fuente:
> You get TWO Illuminati action tokens per turn. GOAL: secretly pick 3 non-Illuminati groups when game starts; control all 3 to win.

### 18 and a Half Minute Gap

- ID: `18andahalfminutegap` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - 18 and a Half Minute Gap.png`

> Texto fuente:
> Play this card immediately after someone else
> That card has no effect. Instead, add it to your
> You must spend all the Action tokens now on your
> Muminati (minimum 11), and discard the top
> undrawn card from botf your Plots and Groups
> Requires Discards and All Illuminati Actions

### A Thousand Points of Light

- ID: `athousandpointsoflight` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - A Thousand Points of Light.png`

> Texto fuente:
> A Thousand Points
> We'll have to put something in the water
> Paranoia is reduced, and good feelings increase
> te a thoroughly unnatural extent. Opposed abgn-
> ments now have no effect ether on attempts to |

### Agent in Place

- ID: `agentinplace` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Agent in Place.png`

> Texto fuente:
> - Play this card at any time. This card requires an
> action by one group with a Power of 4 or more.
> Pick one rival. You may look at all his hidden Plot
> cards, and pick one for him to discard! =
> x Requires Action

### Air Magic

- ID: `airmagic` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Air Magic.png`

> Texto fuente:
> Play this card to help protect a Place against any
> Disaster, except Earthquake or Volcano. The Power
> of the Place is tripled for this one defense
> Playing this card is an action for 2 Magic group.
> Alternatively, you may “sacrifice” the top Plot card
> from your deck, to power this card. Discard it
> without looking at it.
> Requires Magic Action or Discard

### Albino Alligators

- ID: `albinoalligators` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 10
- Imagen: `Plots/INWO - Albino Alligators.png`

> Texto fuente:
> Resistance (your choice) to any Weird group you
> if used with an acton, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts until the
> end of the current turn and does not count toward

### Alternate Goals

- ID: `alternategoals` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Alternate Goals.png`

> Texto fuente:
> You may possess two Goal cards, and win with
> You cannot combine the goals from the two cards

### An Offer You Can't Refuse

- ID: `anofferyoucantrefuse` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - An Offer You Can_t Refuse.png`

> Texto fuente:
> Play this card at the beginning of your turn. You
> deck, but from the deck of a rivall Or you may take
> one card each from two rivals’ Plot decks. To do this, |B
> you must give up your chance to draw any Group i |
> Draw No Group Cards This Turn

### And STAY Dead!

- ID: `andstaydead` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - And STAY Dead!.png`

> Texto fuente:
> Play this card immediately after any Group has
> been destroyed or discarded by any player. It
> requires an action from a Magic group.
> The destroyed group 1s gone forever — no card or
> special ability can revive it
> Requires Magic Action

### Angel's Feather

- ID: `angelsfeather` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Angel_s Feather.png`

> Texto fuente:
> This item must be linked to a Peaceful group.
> Any failed Attack to Control made by the group,
> or any successful attack of any kind made against
> any Peaceful group you control, is re-rolled. The
> second roll counts
> Unique Magic Artifact

### Angst

- ID: `angst` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Angst.png`

> Texto fuente:
> The leaders of your target group (any Place or
> Organization except the Iliuminat) find Ife boring
> and meaningless. Their power is permanently
> reduced to 1. Link this card to the target
> Play this card at any time except dunng an attack.
> It requires an action from your Illuminati and either
> I the Psychiatrists, the Intellectuals, or the Orbital
> Mind Control Lasers.
> Requires Illuminati and Special Actions

### Annual Convention

- ID: `annualconvention` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Annual Convention.png`

> Texto fuente:
> “Tragically, the organization's yearly meeting was in
> the path of the destruction :
> Play this card immediately after a Place has been
> destroyed or Devastated. It is an Instant Attack to
> Destroy any Organization in play. The Power of the
> attack is 12 if the affected Place was completely
> destroyed, or 9 if it was merely devastated. Groups
> capable of Mogic or Weird Sdence can interfere
> either for or against the attack. Other groups cannot
> aid either side.

### Are We Having Fun Yet

- ID: `arewehavingfunyet` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Are We Having Fun Yet.png`

> Texto fuente:
> Are We Having
> “Boss, this secret society stuff is getting ofd. Can't we [8
> take a vacation or start a band or something?”
> Play this card at any time. It requires an action by
> group(s) with total Power greater than that of the
> target. One action or special-ability use of the target
> is canceled x
> bs = 3 Requires Action

### Ark of the Covenant

- ID: `arkofthecovenant` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Ark of the Covenant.png`

> Texto fuente:
> Ark of the Covenant
> White down the name of one of your groups and
> put it under this card. If that group is destroyed,
> 3 reveal the note. The group that destroyed it is also
> destroyed, unless it was an Illuminati. In that case,
> its oamer must choose one group to lose. The
> destroyed enemy group counts for your Goals, and
> you may put the name of another group in the Ark.
> You may change the name in the Ark during your
> Unique Magic Artifact

### Assertiveness Training

- ID: `assertivenesstraining` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 10
- Imagen: `Plots/INWO - Assertiveness Training.png`

> Texto fuente:
> Play this card at any time. It requires action(s) by
> either the Illuminati, or Violent group(s) with a total
> Power equal to the Resistance of the target group,
> doubled if the group is currently Peaceful. Add
> bonuses for its closeness to the Illuminati if it
> The target becomes permanently Violent. If it was
> Peaceful, that alignment is lost. Keep this card, with
> a link to the target.

### Atomic Monster

- ID: `atomicmonster` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Atomic Monster.png`

> Texto fuente:
> Disaster! This is an Instant Attack to Destroy any
> Coastal Place. It does not require an action. Its Power
> Place, but 24 against Japan or Calfornia
> if the attack succeeds, the target is Devastated. If it
> succeeds by more than 6, the target is destroyed
> destroy the Robot Sea Monsters or the Nuclear

### Backlash

- ID: `backlash` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Backlash.png`

> Texto fuente:
> This card may be played at any time. It requires an
> action by some group with at least one alignment in
> common with the target, other than Fanatic!
> Any one change in the target's alignment, Power,
> or Resistance due to a Plot card is undone and retums
> to its original value. Remove the link, and discard
> that Plot card. This does not affect changes made by

### Bank Merger

- ID: `bankmerger` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 10
- Imagen: `Plots/INWO - Bank Merger.png`

> Texto fuente:
> Place an Action token on each of your Bank
> groups, even those which already have an Action
> token. This card may be played at any time.
> This card does not benefit groups which are
> suffering from the effect of any card or special ability
> that prevents them from getting Action tokens.

### Benefit Concert

- ID: `benefitconcert` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Benefit Concert.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Liberal group you
> If used with an action, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts until the B
> end of the current tum and does not count toward

### Bigfoot

- ID: `bigfoot` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Bigfoot.png`

> Texto fuente:
> Bigfoot has the power to distract any Medio
> group by showing himself in public. By using his
> action, Bigfoot can cancel any action taken by any
> Sigfoot aso gives you a +3 on ony attempt to

### Bigger Business

- ID: `biggerbusiness` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Bigger Business.png`

> Texto fuente:
> Increase the Power of all Corporate groups by 2
> Increase the Power of all Conservative groups by
> Increase the Power of all Conservative Corporate

### Bimbo at Eleven

- ID: `bimboateleven` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Plots/INWO - Bimbo at Eleven.png`

> Texto fuente:
> Bimbo at Eleven
> This card gives +5 on an Attack to Destroy any
> Bll male Personality. The attack must come from a
> Meda group. The attack becomes Privileged except
> for Media groups — any Media group can interfere on
> If the attack succeeds, the target is considered
> permanently disgraced and out of public life. Thus,
> he cannot be returned to play by any means!

### Blitzkrieg

- ID: `blitzkrieg` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Blitzkrieg.png`

> Texto fuente:
> Play this card after you take control of any Group
> Place an Action token on the newly-captured
> Group, so that it can act during the same turn it was

### Blood, Toil, Tears and Sweat

- ID: `bloodtoiltearsandsweat` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Blood, Toil, Tears and Sweat.png`

> Texto fuente:
> Discard any one New World Order card now in
> This requires the actien(s) of Media groups with a
> combined Power of at least 4
> This card may be played at any time
> Requires Media Action

### Bodyguard

- ID: `bodyguard` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Bodyguard.png`

> Texto fuente:
> Play this card after any type of Assassination. It
> becomes an automatic failure
> Then link this card permanently to the card it
> protected. That Personality now has an extra +6
> against any Attempt to Destroy, including further
> Assassinations. II the Personality is killed or
> destroyed, the Bodyguard is lost.

### Book of Kells

- ID: `bookofkells` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Book of Kells.png`

> Texto fuente:
> Ned at mex od ar oul oa
> x Seem eeeaeeee
> This powerful grimoire increases the regular and
> Global Pawer of the owning Illuminati by 1. Or, if
> linked to a Magic group, it allows that group to act
> twice per turn, as long as neither action is an
> Attempt to Destroy!
> Unique Magic Artifact

### Botched Contact

- ID: `botchedcontact` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Botched Contact.png`

> Texto fuente:
> Use this card when a rival plays a Group for an
> automatic takeover. He must return that Group to
> his hand, and pick another card for automatic
> takeover that turn
> Playing this card requires an action from one of

### Bribery

- ID: `bribery` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 5
- Imagen: `Plots/INWO - Bribery.png`

> Texto fuente:
> “Perhaps this will change your mind -
> Play this card immediately after any dee roll (by
> any player), That roll is immediately changed,
> retroactively, to a 2. If it was an attack, it succeeds
> Bl only if the attack had a net Power of at least 2;
> attacks with a lower Power cannot succeed
> This requires off Action tokens currently on your
> Requires All llluminati Actions

### Car Bomb

- ID: `carbomb` · runtime: `plot` · oficial: `Ass.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `assassination` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Car Bomb.png`

> Texto fuente:
> Assassination! This is an Instant Attack to Destroy |
> any Personality, at any time. it does not require an
> A single Violent or Criminal group may use its J
> action for this attack, and add its own Power.

### Celebrity Spokesman

- ID: `celebrityspokesman` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Celebrity Spokesman.png`

> Texto fuente:
> Play this card at any time except during an attack,
> Link any Personality you control to any
> Organization that is not Secret or Government, and
> has no opposed alignments.
> The Power of the Personality 1s increased to 4. The
> bonus is lost if ether card is captured or destroyed. Ji

### Censorship

- ID: `censorship` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Censorship.png`

> Texto fuente:
> This isn't a freedom-of-speech issue. This is a decency
> issue. We're closing you down.
> This card may be played by any Straight,
> Conservative or Government group which makes
> extra +15 Power to that attack and makes it

### Center for Weird Studies

- ID: `centerforweirdstudies` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Center for Weird Studies.png`

> Texto fuente:
> Center ror vveira
> Home of the High Energy Cheese lab, the Bozon
> Control Project, and other things they don't teach
> in Physics class.
> Once per turn, on your tum, you may discard
> any Plot card and add an extra Action token Lo any
> of your Groups or Resources which has alreacly
> used its action. This does not let a group use its
> Power twice in the same attack,

### Charismatic Leader

- ID: `charismaticleader` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Charismatic Leader.png`

> Texto fuente:
> : Visgow stag men oS
> re OV ass ogi
> This card may be played at any time, and counts
> as the action for the group it affects. The increased |
> Power takes effect immediately.
> The Power for one Fanatic group is increased to 6
> Link this card to your chosen Fanatic group
> No ptayer may have more than one Charismatic
> Leader in play.

### Chicken in Every Pot

- ID: `chickenineverypot` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Chicken in Every Pot.png`

> Texto fuente:
> Chicken in Every Pot
> World trade is thriving. Everybody is rich and happy.
> L crease the Power of all Banks and all Coastal

### Citizenship Award

- ID: `citizenshipaward` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Citizenship Award.png`

> Texto fuente:
> Sor SH Hl Jy re
> This card may be played at any time, and counts
> as the action for the group it affects. The increased
> Power takes effect immediately.
> The Power for one Conservative group is
> increased to 6. Link this card to your chosen
> No player may have more than one Citizenship
> Award in play.

### Clipper Chip

- ID: `clipperchip` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 8
- Imagen: `Plots/INWO - Clipper Chip.png`

> Texto fuente:
> All Government groups in your Pawer Structure
> gain the ability to listen in on phone conversations
> worldwide. Only for legitimate faw enforcement, of
> Increase the Power of all your Government
> groups by 2. You are ako totally immune to the
> If you ever have no Government groups, you g
> must discard this Resource.

### Clone

- ID: `clone` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Clone.png`

> Texto fuente:
> This card permits you to play, from your hand, a
> Personality which duplicates one who has been
> Assassinated. You may attempt to control that
> Personality normally. If you control the Clone
> Arranqgers, you automatically control the new card.
> The onginal Personality no longer counts as
> destroyed” for the goals of whoever killed it

### Cold Fusion

- ID: `coldfusion` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Cold Fusion.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Science group you
> If used with an action, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts until the
> end of the current tum and does not count toward

### Combined Disasters

- ID: `combineddisasters` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 6
- Imagen: `Plots/INWO - Combined Disasters.png`

> Texto fuente:
> By playing this card, you may combine two
> Disasters on the same target! You must play both of
> the Disaster cards, as well, Pick one Disaster to be the
> “main” one, and follow all the instructions on its
> card. Add the Power (but none of the other effects) |B

### Commitment

- ID: `commitment` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Commitment.png`

> Texto fuente:
> The Resistance for any one group is increased to 8.
> Link this card to your chosen group
> Playing this card is a free move and may be done
> | at any time, even whiie its target group is being
> attacked. The target group may belong lo any §
> player, or may be one that has just been played from
> a rival's hand

### Computer Security

- ID: `computersecurity` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Computer Security.png`

> Texto fuente:
> This card completely negates any Plot card that
> cerns Computers or is used on a Computer group.
> ow be played at any time, as long as it is used
> mmedictely after the other card is played
> Using this card costs an action from the Network
> or any Computer group.
> Reqgaires Network or Computer Action

### Computer Virus

- ID: `computervirus` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Computer Virus.png`

> Texto fuente:
> Voges fre oy
> Play this card immediately after any die roll (by
> any player). You may change the result of that die
> roll, retroactively, by 2 in either direction
> This requires an action from any Scence, Space or
> Requires Science, Space or Computer Action

### Corruption

- ID: `corruption` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Corruption.png`

> Texto fuente:
> \ “The black market in reitef supplies is growing daily
> Play this card after Refief has come to a Devastated
> ll area. Corrupt local officials steal the supplies, and no
> new relief may be attempted for that area until after
> the next turn of the person playing this card

### Counter-Revolution

- ID: `counterrevolution` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Counter-Revolution.png`

> Texto fuente:
> Use thes card when you play, from your hand, a
> Notion which duplicates a group that has already
> been destroyed. This also requires action(s) by your
> Muminati, or by Government groups with a
> combined Power of at least 10. You may now play
> that Nation as though it had never been destroyed
> The original Nation no longer counts as
> “destroyed” for the goals of whoever destroyed it!
> Requires Government or llluminati Action

### Counterspell

- ID: `counterspell` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Counterspell.png`

> Texto fuente:
> Suddenly the candles flared brilliantly, and the servi
> tors scattered. Too fate! The altar exploded, ond the
> roof began to sag
> Play this card when any Magic Resource is used to
> attack you or help an attack on you, in any way. You
> must use either the action of a Magic group or your
> That Resource is destroyed! Discard the card.
> Requires Magic or Illuminati Action

### Cover of Darkness

- ID: `coverofdarkness` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Cover of Darkness.png`

> Texto fuente:
> The schedule was tight, but they made the switch
> with minutes to spare. Their van was several blocks
> away when the red glow grew behind them and the
> screaming started. Their precious target was safe.
> Play this card immediately after a Gadget or
> Artifact Resource has been destroyed or discarded.

### Cover-Up

- ID: `coverup` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Cover-Up.png`

> Texto fuente:
> Play this card at any time a Secret group has been
> successfully attacked. That attack becomes a failure
> It requires an action from another Secret group or
> Alternatively, you can use this card to nuliify an
> Exposed! card, pulling the group back into hiding, if
> it 1s played immediately. This is a free action.
> May Require Secret or Illuminati Action

### Criminal Overlords

- ID: `criminaloverlords` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Criminal Overlords.png`

> Texto fuente:
> Any group that is both Vielent and Criminal
> counts double toward your total number of groups

### Crop Circles

- ID: `cropcircles` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Crop Circles.png`

> Texto fuente:
> Caringsts. Tr rs Re RR
> ea rata pea Ca
> Ten ou ANERRRE Sy Eee
> BR co Wo Ses
> RESEEE Ne ir Pll Ey GP
> The nual runes, each hundreds of yards across,
> appeared in a single might, focusing their power on the
> ley nes all across England . .
> Play this card when you are entitled Lo draw either
> Plot or Group cards. You have 30 seconds to look
> through one deck and choose as many cards as you
> are currently entitled to draw. You must reshuffle the
> deck afterward. This costs an acvon from a Magic
> Requires Magic Action

### Crystal Skull

- ID: `crystalskull` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Crystal Skull.png`

> Texto fuente:
> An ancient South Amencen artifact, created by a
> technclogy no one can duplicate today . . .
> Whenever you draw a Plot card, you may lock at
> the top three cards in your deck and pick the one
> you want. You may replace the other two either on
> the top of the deck or on the bottom, before
> looking for your next card.
> Unique Magic Artifact J

### Currency Speculation

- ID: `currencyspeculation` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Currency Speculation.png`

> Texto fuente:
> of any peak Bank groups is tripled for its next

### Cyborg Soldiers

- ID: `cyborgsoldiers` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Cyborg Soldiers.png`

> Texto fuente:
> Link this card to any Violent group. The Power of
> that group is doubled. If that group is destroyed, the
> Cyborg Soldiers are aiso lost

### Deasil Engine

- ID: `deasilengine` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Deasil Engine.png`

> Texto fuente:
> Play this card at any time to make any Gudget
> Resource run backwards, destroying itself. Its owner
> must discard it. (But if anyone plays another Deasil
> Engine immediately, they cancel out!)
> Neither use counts as an action,

### Death Mask

- ID: `deathmask` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Death Mask.png`

> Texto fuente:
> Whoever wears it can see a slightly different world
> through its staring eyehales . . . and when the mosk is
> removed, the different worid is the true one.
> Link the Death Mask to any Magic group. That
> group can now use its action to enter any attack
> after the dice are rolled (if it could have entered
> normally, that is). If its Power is enough to change
> Unique Magic Artifact

### Deep Agent

- ID: `deepagent` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Deep Agent.png`

> Texto fuente:
> You may totally negate the privilege of a privi
> eged attack. The attack continues, but the privilege
> may not be reinstated!
> Playing this card is a free action, but interference
> self is an action for each group that interferes,

### Dictatorship

- ID: `dictatorship` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Dictatorship.png`

> Texto fuente:
> Play this card during your tum, on any Nation
> which you control. This is an action for that Notion
> or its master.
> It becomes Violent, if it was not already.
> Link this card to the Nation

### Dollars for Decency

- ID: `dollarsfordecency` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 5
- Imagen: `Plots/INWO - Dollars for Decency.png`

> Texto fuente:
> Place an Action token on each of your Straight
> groups which does not already have one. This card
> may be played at any time.
> This card does not benefit groups which are
> suffering from the effect of any card or special ability
> that prevents them from getting Action tokens.

### Don't Forget to Smash the State

- ID: `dontforgettosmashthestate` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Don_t Forget to Smash the State.png`

> Texto fuente:
> Don’t Forget to
> Smash the State
> (Distrust of government is at an all-time high, and
> society is crumbling
> Reduce the Power of all Government groups by 3 |
> Reduce the Power of all Straight non-Govemment

### Double-Cross

- ID: `doublecross` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Double-Cross.png`

> Texto fuente:
> Play this card at any time a rival uses a Plot card to
> look at your hidden Plot cards
> Your opponent loses the card which let him spy
> on you, and any actions that powered it. He does
> not get to look at (or steal) any of your cards after

### Early Warning

- ID: `earlywarning` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Early Warning.png`

> Texto fuente:
> Gives one Place a +10 to defend against any
> Disaster. Playing this card is a free action

### Earth Magic

- ID: `earthmagic` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Earth Magic.png`

> Texto fuente:
> Play this card to help protect a Place against a
> Disaster. Using this card lets any Aagic groups in
> play use their Action tokens to oppose the attack

### Earthquake Projector

- ID: `earthquakeprojector` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Earthquake Projector.png`

> Texto fuente:
> Saks EON iu I Lj
> the Power of any Attack to Destroy a Place, or of

### Earthquake

- ID: `earthquake` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Earthquake.png`

> Texto fuente:
> Disaster! This is an Instant Attack to Destroy any
> Place. It does not require an action, its Power is 12
> against a Huge Place, 16 against any other Place.
> : If the attack succeeds, the target is Devastated. If
> the die roll succeeds by more than 5, the target is

### Eat the Rich!

- ID: `eattherich` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Eat the Rich!.png`

> Texto fuente:
> Eat the Rich!
> hi doites odd A
> Carefully orchestrating the medio, you create on
> insane groundswell of anger, blaming the wealthy and
> powerful for everything.
> This card may be played by any Media group
> which makes an Attack to Destroy against a Group
> with a Power of 6 or more, or aids that attack. It
> gives an extra +10 to that attack and makes it

### Eliza

- ID: `eliza` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 11
- Imagen: `Plots/INWO - Eliza.png`

> Texto fuente:
> Is it really alive, or does It just think it is?
> Eliza can be linked to any Computer group, or to
> the Network. That group may take an extra action
> da each tum! But if that extra action ever results in a
> and expose aff your hidden Plot cards

### Embezzlement

- ID: `embezzlement` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Embezzlement.png`

> Texto fuente:
> Play this card immediately when another player
> draws a Plot card, before he uses it or announces
> what it is. That Plot card becomes yours! But you
> must discard one other Plot card from your own
> hand, as well
> Requires Plot Discard

### Emergency Powers

- ID: `emergencypowers` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Emergency Powers.png`

> Texto fuente:
> This card may be played at any time, and counts
> as the action for the group it affects. The increased
> Power takes effect immediately.
> The Power for one Government group is increased
> to 6. Link this card to your chosen Government
> No player may have more than one Emergency
> Powers in play r=
> "- Requires Action

### Energy Crisis

- ID: `energycrisis` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Energy Crisis.png`

> Texto fuente:
> A aippling energy shortage affects power biocs
> Reduce the Power of all Corporate groups by 2,
> Reduce Power and Resistance of all Green groups

### Epidemic

- ID: `epidemic` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Epidemic.png`

> Texto fuente:
> Disaster! This is an Attack to Destroy any Place. It
> does not require an action. Its Power is 14
> This is not an Instant attack; other groups can
> If the attack succeeds, the target is Devastated.
> This attack cannot actually destroy the target

### Exposed!

- ID: `exposed` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Exposed!.png`

> Texto fuente:
> Watch them scatter like cockroaches
> Play this card at any time. It requires the action of
> any Media group with a Power of 4 or more. One
> Secret group is now exposed. Unless this card is
> immediately countered, that group permanently |
> loses its Secret status!
> Requires Media Action

### Faction Fight

- ID: `factionfight` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Faction Fight.png`

> Texto fuente:
> Played along with a duplicate card for any Group
> controlled by one of your rivals, this gives an extra
> +5 bonus to the attack, and makes that attack
> Using this card is not an action, bul the attack is

### Fear and Loathing

- ID: `fearandloathing` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Fear and Loathing.png`

> Texto fuente:
> Fear and Loathing
> ments now give +8 on any attempt to control, and
> 8 on any attempt to destroy. The reverse is true for

### Flower Power

- ID: `flowerpower` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Flower Power.png`

> Texto fuente:
> Place an Action token on each of your Peaceful
> > groups which does not already have one. This card
> may be played at any ime
> This card does not benefit groups which are
> suffering from the effect of any card or special ability
> that prevents them from getting Action tokens.

### Flying Saucer

- ID: `flyingsaucer` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 7
- Imagen: `Plots/INWO - Flying Saucer.png`

> Texto fuente:
> This vehicle was found buried in a comfield in
> idaho. It will take a small number of people anywhere
> Linked to a Personality, the Flying Saucer gives
> him =10 against any Attack to Destroy or
> Assassination. It is captured or destroyed if he is.
> Left unlinked, as property of the Illuminati, the
> Flying Saucer lets you make an automatic takeover
> of one extra Resource card each tum, provided you
> discard your top undrawn Plot card in exchange.
> Unique Gadget Artifact

### Fnord!

- ID: `fnord` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Fnord!.png`

> Texto fuente:
> * egfnord {nord Enord fpord fnopd nord nord Ing
> nord fnord fnord fnoxrdfnord fnord ford ford §
> fuord fnord fora Snordfnord friord fnord faord
> “fnord fporginord frord fnoxd fpordinord _
> HOrdSnore fnord fnord fROrd ipord Lord f
> a nord fnord fnerd nord fnordinord DOES
> fnopq TRoxd fnordfnordfnord gion nord =
> Noid nora inOTd frocd faord gpayq fnord Mord
> 4 fnord fnord fnora fnord fnord nord fnord fro
> { fnoya fnord fnord snoxd fnozty 4 fnord fox
> nord fnord fnord fnord FnoX d fnord fnord fnox
> + fjord fnord fnord ford inord nord enorg
> A" fnord fno rd {nord nord nord fnord fnord
> frord.fnord 100rd fnopd Nord fnord ford fnor
> srd fnovrd fnord fnord inord nord fnord fanore
> d fnord nord fnoxd ay fuogd fnord fhsed no
> byd nora fnord oem nord fnors ford fnoz
> fnord-fnorafnord nord froma friord £10
> d*nOrd fnorg fnordinord nord shor fnord
> ord fpord fnord ROTM fnord fhord fnord fac
> ord fnord fnord NOFA gn40q fnord fhova fnor
> Lo fmord oT = fnord fnord fnord fnord
> Play this card immediately after any die roll you
> make. You may discard that roll and try again.
> This does not count as an action, but you must
> discard your top Group card, or any two Group
> cards from your hand

### Foiled!

- ID: `foiled` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Foiled!.png`

> Texto fuente:
> You may force any rival to discard one exposed
> This card may be used at any time, but requires an
> action from a Media group.
> * Requires Media Action

### Forgery

- ID: `forgery` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 5
- Imagen: `Plots/INWO - Forgery.png`

> Texto fuente:
> "Hah! You have been deceived by a clever dupficate
> This card lets you make an automatic takeover of
> a Resource card from your hand, duplicating any
> Unique Resource already in play.
> Your Resource is the real one. The owner of the
> ather one must discard it.

### Fratricide

- ID: `fratricide` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Plots/INWO - Fratricide.png`

> Texto fuente:
> | Remember: Defeat is worse than death, because you
> have [o live with defeat
> Destroy two other Illuminati groups!
> To destroy an llluminati, you must remove its last
> puppet. You may do this yourself, or you may help
> someone else to do it. Any kind of help counts .
> adding Power to an attack, or using a Plot card or
> | This Goal cannot be combined with other Goals

### Freaking the Mundanes

- ID: `freakingthemundanes` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 3
- Imagen: `Plots/INWO - Freaking the Mundanes.png`

> Texto fuente:
> Place an Action token on each of your Weird
> groups which does not already have one. This card
> may be played at any time
> This card does not benefit groups which are
> suffering from the effect of any card or special ability
> that prevents them from getting Action tokens

### Full Moon

- ID: `fullmoon` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 8
- Imagen: `Plots/INWO - Full Moon.png`

> Texto fuente:
> Place an Action token on each of your Fanatic
> groups, whether it has one or not, and any other
> Fanatic group in play that you want to benefit! This
> card may be played at any time
> This card does not benefit groups which are ~
> suffering from the effect of any card or special ability
> that prevents them from getting Action tokens

### Fundie Money

- ID: `fundiemoney` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Fundie Money.png`

> Texto fuente:
> Play this card at any time. It requires action(s) by
> either the llluminati, or Conservative group(s) with a
> total Power equal to the Resistance of the target
> group, doubled if the group is currently Liberal. Add
> bonuses for its closeness to the Illuminati if it
> The target group becomes permanently
> Conservative. If it was Liberal, that alignment is lost.
> Keep this card, with a link to the target

### Gang War

- ID: `gangwar` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Gang War.png`

> Texto fuente:
> Place an Action token on each of your Criminal
> groups which does not already have one. This card
> may be played at any time.
> This card does not benefit groups which are
> suffering from the effect of any card or special ability
> that prevents them from getting Action tokens.

### George the Janitor

- ID: `georgethejanitor` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - George the Janitor.png`

> Texto fuente:
> George the Janitor
> Play this card at any time. It requires an action by
> Pick a rival. That rival must now pick one of his
> hidden Plot cards. Now you decide (without
> ooking) whether he must expose that card, or
> expose 3 his other hidden Plots.

### Giant Kudzu

- ID: `giantkudzu` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Giant Kudzu.png`

> Texto fuente:
> Disaster! This is an Attack to Destroy any Place. It
> does not require an action. Its Power is 30 against a
> Coastal Place, 24 against any other Place
> This is not an Instant attack; ony group can use its
> action to aid the vicum (but not the Kudzu).
> If the attack succeeds, the target is Devastated if
> the die roll succeeds by more than 6, the target
> Place is completely destroyed!

### Good Polls

- ID: `goodpolls` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Good Polls.png`

> Texto fuente:
> your next turn, the Power and Resistance for all your | -
> groups of any chosen alignment is tripled, for §

### Grassroots Support

- ID: `grassrootssupport` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Grassroots Support.png`

> Texto fuente:
> This card may be played at any time, and counts
> as the action for the group it affects. The increased
> Power takes effect immediately
> The Power for one Straight group is increased to
> 6. Link this card to your chosen Straight group.
> No player may have more than one Grassroots
> Support in play.

### Gremlins

- ID: `gremlins` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Gremlins.png`

> Texto fuente:
> Gremlins do not exist!
> This card can be used to remove the Action token
> from any Computer group, or to cancel its action
> if the action was a use of its Power
> Alternatively, play this card to force a rival to put
> one Gadget Resource back in his hand.

### Gun Control

- ID: `guncontrol` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Gun Control.png`

> Texto fuente:
> Increase the Power of all Violent Government
> Increase the Power of all Criminal groups by 1

### Hail Eris!

- ID: `haileris` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Plots/INWO - Hail Eris!.png`

> Texto fuente:
> Are they really Discordians? Who knows?
> Any Weird group with a power of 3 or more
> counts double toward your total number of groups

### Hallucinations

- ID: `hallucinations` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Hallucinations.png`

> Texto fuente:
> she's totally insane but she can act once per
> turn, to project her madness into the mind of any
> Personality and cancel their action, or to give +3 on
> any attempt to destroy them.

### Hammer of Thor

- ID: `hammerofthor` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Hammer of Thor.png`

> Texto fuente:
> This mystic artifact can act once per turn
> Its action can be used to increase the Power of
> any Government or Violent group by 2, either to
> make any attack or to defend against an Attack to

### Harmonica Virgins

- ID: `harmonicavirgins` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Harmonica Virgins.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Maogx group you
> If used with an action, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts until the s
> end of the current tum and does not count toward

### Hat Trick

- ID: `hattrick` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 3
- Imagen: `Plots/INWO - Hat Trick.png`

> Texto fuente:
> Play this card immediately after you use a Plot
> card. Discard this card instead, and put the other
> Plot card back into your hand
> Using this card requires an action from a group
> : Requires Action

### Head in a Jar

- ID: `headinajar` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Head in a Jar.png`

> Texto fuente:
> Play this card when one of your Personalities is
> killed. It takes precedence over any enemy attempt
> to capture or permanently eliminate the destroyed
> Link this card to the Personality. It remains in play,
> but can never control any group that it didn't
> defend against any further Assassinations. It can
> Attack to Destroy, or aid attacks with its Power, but
> it's doing all its business by telephone . .

### Hex

- ID: `hex` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Hex.png`

> Texto fuente:
> Play this card at any time except during a privi-
> leged attack. A Magic Resource controlled by a nval
> is destroyed. Discard its card
> This card requires an action by your lliluminati, or
> by a Magic group with a Power of 3 or more.
> Requires Magic or Illuminati Action

### Hidden City

- ID: `hiddencity` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Hidden City.png`

> Texto fuente:
> Control of the Hidden City gives your Illuminati
> +2 to their Power and Global Power.
> The Hidden Gty may be attacked using any
> Disaster card; it is not Huge or Coastal. It can be
> defended, in all ways, as though it were a Place
> destroyed, another Hidden City may be played by

### Hidden Influence

- ID: `hiddeninfluence` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Hidden Influence.png`

> Texto fuente:
> The group of your choice now has Global Power
> equal to its regular Power, Link this card to the
> This requires an action from your lluminati. it may
> be played at any time
> Requires Illuminati Action

### Hit and Run

- ID: `hitandrun` · runtime: `plot` · oficial: `Ass.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `assassination` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Hit and Run.png`

> Texto fuente:
> Assassination! This is an Instant Attack to Destroy
> any Personality, at any time. It does not require an
> A single Fanatic group may use its action for this
> attack, and add its own Power.

### Hitler's Brain

- ID: `hitlersbrain` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Hitler_s Brain.png`

> Texto fuente:
> Was he Illuminated himself? You're not cleared for
> that. But the evil brain lies plotting, twisting the
> souls around it
> Draw an extra Plot card, or hide all your exposed
> Plots, any time you destroy a group. You may not
> take control of any Peaceful group while you have

### Hoax

- ID: `hoax` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 7
- Imagen: `Plots/INWO - Hoax.png`

> Texto fuente:
> This card may be played immediately after any
> other Plot card is played, for any purpose. That card
> has ro effect. Both cards are discarded
> Use of this card requires action(s) by group(s) with
> a total power of at least 6. You must also dscard
> your own top undrawn Plot card
> Requires Action and Discard

### Hurricane

- ID: `hurricane` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Hurricane.png`

> Texto fuente:
> Disaster! This is an Instant Attack to Destroy any A
> Coastal Place. It does not require an action. Its Power
> If the attack succeeds, the target is Devastated.
> This attack cannot actually destroy the target.

### I Lied

- ID: `ilied` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 7
- Imagen: `Plots/INWO - I Lied.png`

> Texto fuente:
> "A Ite is an abormination unto the Lord and a very
> present help in time of trouble.”
> Play this card immediately after you agree to sell
> or trade something groups, Plot cards, what-
> You don't have to keep your side of the deal, but
> the other party does

### Immortality Serum

- ID: `immortalityserum` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Immortality Serum.png`

> Texto fuente:
> "By the way. If you join us, you cen live forever.
> This card may be used for ane Personality, Keep it
> unlinked until it is used. The link remains if the
> Personality is captured from you.
> You may use it to take control of any just-played
> Personality, including one from another player's
> hand! No die roll is required. Link the card to that
> Personality. Now nothing can kill that Personality,
> including destruction of a Place he's linked to, He
> also has +5 against ordinary attacks to destroy.
> You may also link it to a Personality you control

### Imposter

- ID: `imposter` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Imposter.png`

> Texto fuente:
> This card permits you to play, from your hand, a
> Personality which duplicates one who has been
> Assasanated. You must also spend an action from
> one group with an alignment in common with the
> Personality. You automatically control the new card.
> The onginal Personality no longer counts as
> “destroyed” for the goals of whoever killed them

### Infobahn

- ID: `infobahn` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Infobahn.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Computer group you
> if used with an action, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts until the
> end of the current turn and does not count toward

### Interference

- ID: `interference` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Interference.png`

> Texto fuente:
> You may interfere with a privileged attack, on
> ether side. No other players may interfere unless
> they use other Plot cards or spedial abilities.
> Playing this card is a free action, but interference
> self 5 an acon for each group that interferes

### Jake Day

- ID: `jakeday` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Jake Day.png`

> Texto fuente:
> Play this card at any time. It requires action(s) by
> either the Hlluminati, or Weird group(s) with 2 total
> Power equal to the Resistance of the target group,
> doubled i the group is currently Straight. Add
> bonuses for its closeness to the Mluminati if it
> The target group becomes permanently Weird. If
> t was Straight, that alignment is lost. Keep this card,
> wath a fink to the target.

### Jihad

- ID: `jihad` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Jihad.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Fanatic group you
> If used with an action, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts until the
> end of the current tum and does not count toward

### Just Say No

- ID: `justsayno` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Just Say No.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Straight group you
> If used with an action, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts until the
> end of the current turn and does not count toward

### Ketchup is a Vegetable

- ID: `ketchupisavegetable` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Ketchup is a Vegetable.png`

> Texto fuente:
> Ketchup is a
> infiltrating government positions, your agents have
> deliberately announced stupid policies, undermining
> Play this card along with any Attack to Destroy any
> Government group. The attack becomes Privileged,

### Kill for Peace

- ID: `killforpeace` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Kill for Peace.png`

> Texto fuente:
> Kill for Peace
> Destroy Violent groups, and control Peaceful
> groups, in any of the following combinations
> This Goal cannot be combined with other Goals

### Kinder and Gentler

- ID: `kinderandgentler` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Kinder and Gentler.png`

> Texto fuente:
> Kinder and Gentler
> Play this card at any time. It requires action(s) by
> either the lluminati, or Peaceful group(s) with a
> total Power equal to the Resistance of the target
> group, doubled if the group is currently Violent. Add
> bonuses for its closeness to the Illuminati if it
> The target group becomes permanently Peaceful
> If it was Violent, that alignment is lost. Keep this
> card, with a link to the target
> : Requires Action

### Law and Order

- ID: `lawandorder` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Law and Order.png`

> Texto fuente:
> ~ Law and Order
> Increase the Power of all Conservative groups
> Increase the Power of all Straight groups by 2
> Increase the Power of all Straight Conservative

### Let Them Eat Cake!

- ID: `letthemeatcake` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Let Them Eat Cake!.png`

> Texto fuente:
> t Ti Eat Cak
> Let Them Eat Cake!
> Destroy Libera! groups, and control Conservative
> groups, in any of the following combinations
> This Goal cannot be combined with other Goals

### Let's Get Organized

- ID: `letsgetorganized` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Let_s Get Organized.png`

> Texto fuente:
> Play this card during your turn, on any Group card
> that has fewer than three outgoing control arrows.
> This is an action for that group or its master. You
> must control the target.
> The target group gains an extra control arrow, on
> either the end or the side of the card. Place this card
> undemeath it, with an arrow showing, to provide
> the new arrow.
> Duplicates of this card may not be used on the

### Let's Get REALLY Organized

- ID: `letsgetreallyorganized` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Let_s Get REALLY Organized.png`

> Texto fuente:
> Play this card during your tum, on any Group card
> that has one or two outgoing control arrows. This is
> an action for that group or its master. You must
> control the target
> The target group now has three outgoing control
> arrows. Place this card underneath it to provide the
> new arrows, or knk this card to it to indicate that
> there are now three arrows

### Let's You and Him Fight

- ID: `letsyouandhimfight` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Let_s You and Him Fight.png`

> Texto fuente:
> Let's You an
> You instigate a feud among the agents of the enemy,
> ond they obiigingly eliminate each other.
> Pick a rival and draw two Groups randomly from
> his hand. Choose one for him to discard; the other
> retumed to his hand. (For purposes of this card,
> Sesources count as Groups.) If your victim has only
> one Group card, he loses it
> Play this card at any time. It requires an action by
> Requires Illuminati Action

### Liberal Agenda

- ID: `liberalagenda` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Liberal Agenda.png`

> Texto fuente:
> Play this card at any time. It requires action(s) by
> either the llummat, or Liberal group(s) vath a total
> Power equal to the Resstance of the target group,
> doubled if the group is currently Conservative. Add
> bonuses for its closeness to the Illuminati if it
> The target group becomes permanently Liberal. If
> it was Conservative, that alignment is lost. Keep this
> card, with a link to the target

### Loch Ness Monster

- ID: `lochnessmonster` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Loch Ness Monster.png`

> Texto fuente:
> By using Nessie’s action, you can cancel the
> action of any Coastal Place, or add +4 to any
> attempt to destroy a Coastai Place, or add +4 to the
> power of a Disaster aimed at such a place.

### Logic Bomb

- ID: `logicbomb` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Logic Bomb.png`

> Texto fuente:
> Pick one rival. You may look at all his hidden Plot
> cards, and choose one to take for yourself but
> Bl vou must expose that card.
> Play this card at any time, It requires an action by
> one group with a Pawer of 6 or more,

### March on Washington

- ID: `marchonwashington` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 7
- Imagen: `Plots/INWO - March on Washington.png`

> Texto fuente:
> Play this card along with a Plot card that requires
> an action or actions. This card substitutes for any
> one action of a Power of 6 or less, from any
> Alignment or Attnbute, though not an Illuminati
> action, However, you must discard the top undrawn
> Plot card from your own deck
> You may March On Washington only once per

### Market Manipulation

- ID: `marketmanipulation` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Market Manipulation.png`

> Texto fuente:
> “EARTH Ba Rain
> CE TR HA Hit ered no Ne Mesny
> ane] Nin ew fl LEST cP han
> man fn No lem NW mpm
> T~ Nein wa ow Bane
> REL er MW wi mea
> This card may be used at any time. Remove the
> Action tokens from any one Corporate group (if you
> choose) and any or all Bank groups. This does not
> count as an action.

### Martial Law

- ID: `martiallaw` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Martial Law.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Government group
> if used with an action, it must be played when
> that action is first declared, and counts only for that
> action, if used for defense, the bonus lasts until the
> end of the current tum and does not count toward

### Martyrs

- ID: `martyrs` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Martyrs.png`

> Texto fuente:
> fo XL cos Sd IE
> Sp Seals SRE
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Peaceful group you
> If used with an action, it must be played when
> that action is first declared, and counts only for that #8
> action, If used for defense, the bonus lasts until the
> end of the current turn and does not count toward

### Mass Murder

- ID: `massmurder` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Mass Murder.png`

> Texto fuente:
> F ORIN ehrgiopioy Semis Ky
> A shocking news story distracts all media, and by the
> time it runs its course, the public has forgotten all about
> Remave all Action tokens from any or all Medio
> groups in play (your choice), and cancel any just-
> taken actions by Media groups
> Play this card at any trme. It requires an action by your
> furminati, or by Meda group(s) with a Power of 5
> equires Media or Illuminati Action

### Media Blitz

- ID: `mediablitz` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Media Blitz.png`

> Texto fuente:
> Use this card when you play, from your hand, a
> card which duplicates a Group that has aiready
> ll been destroyed. You must spend an action by a
> Media group. You may now play that Group card as
> though it had never been destroyed.
> The original Group no longer counts as
> “destroyed” for the goals of whoever destroyed it!
> This card cannot help a Personality who was
> Requires Media Action

### Media Connections

- ID: `mediaconnections` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Media Connections.png`

> Texto fuente:
> The group of your choice becomes a Media
> group, if it was not already one, with Global Power
> equal to its regular Power. Link this card to the
> This requires action(s) from Media group(s) with a
> total Power of 6 or more. It may be played at any
> Requires Media Action

### Mercenaries

- ID: `mercenaries` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Mercenaries.png`

> Texto fuente:
> This small, elite corps specializes in covert wet
> Can act once per tur, giving +4 to any Attempt
> to Destroy, or +1 to any Attempt to Control

### Messiah

- ID: `messiah` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Plots/INWO - Messiah.png`

> Texto fuente:
> Play this card at any time except during an attack
> Link it to any Personality you control. That person is
> hailed as the Messiah by millions worldwide!
> The new Messiah's Power and Resistance are both
> increased by 4, plus 2 more for every Church you
> control at any given lime . .
> Only one Messiah can be in play at a time

### Meteor Strike

- ID: `meteorstrike` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Meteor Strike.png`

> Texto fuente:
> Disaster! This is an Instant Attack to Destroy any
> Placa. It does not require an action. Its Power is 16.
> f the attack succeeds, the target is Devastated. If
> theder succeeds by more than 4, the target is

### Midas Mill

- ID: `midasmill` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Midas Mill.png`

> Texto fuente:
> Hallie IC sil
> Gold! Gold from sea water! Gold to fuel the plots of
> The Power and Global Power of your Illuminati
> are both increased by 2. Or link the Mili to any
> Coastal group, and give it Global Power equal to its
> Unique Gadget Artifact

### Military-Industrial Complex

- ID: `militaryindustrialcomplex` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Military-Industrial Complex.png`

> Texto fuente:
> Government and corporate interests. have
> become nearly identical. All Corporate cards are
> now considered Government for all purposes except

### Miracle Diet Plan

- ID: `miracledietplan` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Miracle Diet Plan.png`

> Texto fuente:
> vilFaci€e viet ian
> : This card may be played at any time except
> during an attack, and counts as an action for a >
> Triple the Power of the next action of any one
> Science group you now control
> And remove the Action token(s) from any rival
> group (except an llluminati), as the weird chemicals
> in your diet pills turn their minds to jelly . . .
> Requires Media Action

### Mistaken Identity

- ID: `mistakenidentity` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Mistaken Identity.png`

> Texto fuente:
> Play this card after any type of Assassination. It
> i becomes an automatic failure
> Through the kind of coincidence that seems to |
> happen around the Illuminati, an innocent
> bystander meets a weird and messy death, while the §
> target goes happily about his business . . ©

### Mob Influence

- ID: `mobinfluence` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Mob Influence.png`

> Texto fuente:
> This card may be played at any time, and counts
> as the action for the group it affects. The increased
> Power takes effect immediately.
> The Power for one Criminal group is increased to
> 6. Link this card to your chosen Criminal group
> No player may have more than one Mob |
> Influence in play.

### Monopoly

- ID: `monopoly` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Monopoly.png`

> Texto fuente:
> This card may be played at any time, and counts
> as the action for the group it affects. The increased
> Power takes effect immediately
> The Power for one Corporate group is increased
> to 6. Link this card to your chosen Corporate group
> No player may have more than one Monopoly in

### Mothers' March

- ID: `mothersmarch` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Mothers_ March.png`

> Texto fuente:
> Play this card when any Attack to Destroy is
> successful. The attacker must try the roll again
> immediately, at a -4 penalty. No player may do
> anything else to change the strength of the re-rolled
> Use of this card requires an action by any group

### Murphy's Law

- ID: `murphyslaw` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Murphy_s Law.png`

> Texto fuente:
> Everything that can go wrong, wil
> Play this card immediately after any die roll (by
> any player). That roll is immediately changed,
> This requires afl Action tokens currently on your
> Requires All Illuminati Actions

### Mutual Betrayal

- ID: `mutualbetrayal` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Mutual Betrayal.png`

> Texto fuente:
> Viutual Bet l
> Play this card at any time. This card requires an
> action by one group.
> Pick one rival. You may look at all of his hidden
> Plot cards. After looking, you may expose any or all
> of them, as long as you also expose an equal
> number of your own Plots

### Nationalization

- ID: `nationalization` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Nationalization.png`

> Texto fuente:
> Play this card at any time. It requires action(s) by
> esther the llluminati, or Government group(s) with a
> total Power equal to the Resistance of the target
> group, doubled if the group is currently Corporate
> Add bonuses for its closeness to the Illuminati if it
> The target group becomes permanently Govern-
> ment. If it was Corporate, that alignment is lost
> Keep this card, with a link to the target

### Necronomicon

- ID: `necronomicon` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 5
- Imagen: `Plots/INWO - Necronomicon.png`

> Texto fuente:
> Link this card to a Violent or Mag« group. That
> Necronomicon is not destroyed, just unlinked . . .
> The destroyed group counts toward your victory
> conditions only if you are the Servants of Cthulhu!
> Unique Magic Artifact

### Never Surrender

- ID: `neversurrender` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Never Surrender.png`

> Texto fuente:
> Playing this card is a free move and may be done
> at any time, even while its target group is being
> attacked. The larget group may belong to any
> player, or may be one that has just been played from
> a rival's hand
> The Resistance for one Fanatic group 1s increased
> to 12. Link this card to your chosen Fanatic group.

### New Blood

- ID: `newblood` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - New Blood.png`

> Texto fuente:
> This card may be played at any time, and counts
> as the action for the group it affects. The increased
> Power takes effect immediately
> The Power for one Violent group is increased to 6
> Link this card to your chosen Violent group.
> No player may have more than one New Blood in

### New Federal Budget

- ID: `newfederalbudget` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - New Federal Budget.png`

> Texto fuente:
> Place an Action token on each of your
> Government groups which does not already have
> one. This card may be played at any time.
> This card does not benefit groups which are
> suffering from the effect of any card or special ability
> that prevents them from getting Action tokens

### Nice Idea. It's Mine Now.

- ID: `niceideaitsminenow` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Nice Idea. It_s Mine Now..png`

> Texto fuente:
> This card may be used on any rival who has an
> exposed Goal card. It may be used only on your
> turn, and requires an action from your Illuminati
> Take his Goal card and put it in front of you,
> exposed. It's yours now
> Requires Illuminati Action

### Nobel Peace Prize

- ID: `nobelpeaceprize` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 3
- Imagen: `Plots/INWO - Nobel Peace Prize.png`

> Texto fuente:
> This card may be played at any time, and counts
> as the action for the group it affects. The increased
> Power takes effect immediately.
> The Power for one Peaceful group is increased to
> 6. Link this card to your chosen Peaceful group.
> No player may have more than one Nobel Peace
> Prize in play.

### Nuclear Accident

- ID: `nuclearaccident` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Nuclear Accident.png`

> Texto fuente:
> Disaster! This 1s an Instant Attack to Destroy any g
> Place. It does not require an action. Its Power is 14
> against a Huge Place, 18 against any other Place -
> If the attack succeeds, the target is Devastated if
> the dee roll succeeds by mare than 4, the target is
> The Nuclear Power Companies lose their action
> token when this card is played on any Place v

### Opportunity Knocks

- ID: `opportunityknocks` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Opportunity Knocks.png`

> Texto fuente:
> They thought they were safe. They were wiorg
> Play this card after a rival plays a Group from his
> own hand, fails to take it over, and discards it
> You may make a single attack, cut of turn, to
> control or destroy that group — at a +5 bonus! You
> may use whatever Action tokens and Plot cards you
> have at the moment, and other players may aid you
> if they choose.
> After the attack is resolved, your nval resumes his

### Orbital Mind Control Lasers

- ID: `orbitalmindcontrollasers` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Orbital Mind Control Lasers.png`

> Texto fuente:
> Orbital Mind Control
> By using the Lasers’ action, you may add, remove,
> or reverse an alignment of any group in play. You
> may do this at any time except during a privileged
> attack. The change lasts only for the rest of the
> current player's tum
> Unique Gadget ACTION

### Payoff

- ID: `payoff` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Payoff.png`

> Texto fuente:
> duplicate card for any Group you control
> You have bought the loyalty of the dissident
> faction that your rival was courting. He must discard |B
> his duplicate Croup card

### Peace in Our Time

- ID: `peaceinourtime` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Peace in Our Time.png`

> Texto fuente:
> eace in Our Time
> Increase the Power of all Peaceful groups by 1, or
> by 3 against an attempt to destroy. The Resistance
> of all Peaceful groups is increased by 3 while they
> are part of a Power Structure
> Reduce the Power of all Violet or Criminal

### Perpetual Motion Machine

- ID: `perpetualmotionmachine` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 3
- Imagen: `Plots/INWO - Perpetual Motion Machine.png`

> Texto fuente:
> It works. It really veorks. And 27 scientists have gone
> mad, so far, trying to build another one.
> The group inked to this device gets one extra
> Action token at the beginning of each turn,
> Unique Artifact Gadget

### Plague of Demons

- ID: `plagueofdemons` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Plague of Demons.png`

> Texto fuente:
> Disaster! This is an Instant Attack to Destroy any
> Place except a Huge one. You must spend an action
> from a Magic group. The Power of the attack is 10,
> plus the Power of the group summoning the demons.
> If the attack succeeds, the target is Devastated. If
> the die roll succeeds by more than 5, the target is
> Alternatively, spend this card for +10 to destroy
> any Magic group.
> Disaster! May Require Magic Action

### Pledge Drive

- ID: `pledgedrive` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Pledge Drive.png`

> Texto fuente:
> Place an Action token on each of your Liberal
> groups which does not already have one. This card
> may be played at any time.
> This card does not benefit groups which are
> suffering from the effect of any card or special ability
> that prevents them from getting Action tokens.

### Poison

- ID: `poison` · runtime: `plot` · oficial: `Ass.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `assassination` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Poison.png`

> Texto fuente:
> Assassination! This is an Instant Attack to Destroy
> any Personality, at any time. It does not require an
> A single Criminal or Mogic group may use its
> action for this attack, and add its own Power. This
> card is only Magic if used by a Magic group.

### Political Correctness

- ID: `politicalcorrectness` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Political Correctness.png`

> Texto fuente:
> U=ed hte Flea Of
> Good thoughts are now required.
> Increase the Power of all Liberal groups by 3.
> All Conservative groups with a Power of only 1
> become Criminal as well

### Power Corrupts

- ID: `powercorrupts` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Power Corrupts.png`

> Texto fuente:
> ¢ Play this card at any time. It requires action(s) by
> either the Illuminati, or Criminal group(s) with a
> total Power equal to the Resistance of the target
> group. Add bonuses for its closeness to the
> Buminati # it belongs to a rival!
> The target group becomes permanently Criminal.
> Keep this card, with a link to the target.

### Power for its Own Sake

- ID: `powerforitsownsake` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Power for its Own Sake.png`

> Texto fuente:
> including your llluminati group 3

### Power Grab

- ID: `powergrab` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Plots/INWO - Power Grab.png`

> Texto fuente:
> Play this card on your turn, immediately after your
> automatic takeover. You may make another auto
> . matic takeover of any Group or Resource, Your turn
> ends immediately; you get new Action tokens, but
> you may do nothing else

### Power to the People

- ID: `powertothepeople` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Power to the People.png`

> Texto fuente:
> Power to the People
> iy Ve BEL Ge
> Destroy Conservative groups, and control Liberal
> groups, in any of the following combinations
> This Goal cannot be combined with other Goals

### Principia Discordia

- ID: `principiadiscordia` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Principia Discordia.png`

> Texto fuente:
> The onginal manuscript . .
> Each Weird group in your Power Structure
> increases its Resistance by 1 for every Weird group
> you control. So, if there are a total of 5 Weird
> groups in your Power Structure, each one gets +5
> to its Resistance.

### Privatization

- ID: `privatization` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Privatization.png`

> Texto fuente:
> Play this card at any ume. It requires action(s) by
> either the llluminati, or Corporate group(s) with a
> total Power equal to the Resistance of the target
> group, doubled if the group is currently Govern
> ment. Add bonuses for its closeness to the !lluminati
> if it belongs to a rival!
> The target group becomes permanently
> Corporate. If it was Government, that alignment is
> Nl lost (and if it was a Dictatorship, it is no longer)
> Keep this card, with a link to the target
> : Requires Action

### Privileged Attack

- ID: `privilegedattack` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Privileged Attack.png`

> Texto fuente:
> Play this card when you make any attack. That
> attack is now Privileged; no one except you and the
> target player (if any) can aid either side. Your
> Jminati, or a Secret group, must participate in the
> attack or spend an Action token
> May Require Action

### Pulitzer Prize

- ID: `pulitzerprize` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Pulitzer Prize.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Media group you
> If used with an action, it must be played when
> that action is first declared, and counts only for that
> action, If used for defense, the bonus lasts until the
> end of the current turn and does not count toward

### Purge

- ID: `purge` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Purge.png`

> Texto fuente:
> This card may be played at any time during your
> turn, as an action for the group that uses it. It can be
> used in two ways:
> Used by your llluminati, it destroys all Agent cards
> currently in play which duplicate your own
> Used by another group, it reduces the group's
> Power and Global Power by 1, but makes it perma-
> nently immune to duplicate Group cards played by
> rivals. Link this card to the group.

### Rain of Frogs

- ID: `rainoffrogs` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Rain of Frogs.png`

> Texto fuente:
> Disaster! This is as an Instant Attack to Destroy any
> Place. It does not require an action. Its Power is 10
> against a Place of any size, plus 4 for each Frog God
> the target player has in play.
> If the attack succeeds, the target is Devastated. If
> the die roll succeeds by more than 6, the target is

### Reach Out . . .

- ID: `reachout` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Reach Out . . ..png`

> Texto fuente:
> Remove all Action tokens from the Groups (but
> not the Resources) of any one of your rivals. You
> must also remove any remaining Action tokens
> from your own groups.
> You may play this card only at the end of your
> tum. ft requires an action by your Illuminati
> Requires Illuminati Action

### Read My Lips

- ID: `readmylips` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Read My Lips.png`

> Texto fuente:
> A public igure appears on national TV and tolks his
> way out of everything!
> Piay this card after a successfid Attack to Control or
> Destroy any of your Personalities, except for an
> Assassination. The attack becomes a failure

### Red Scare

- ID: `redscare` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Red Scare.png`

> Texto fuente:
> Place an Action token on each of your
> Conservative groups which does not already have
> one. This card may be played at any time
> This card does not benefit groups which are
> suffering from the effect of any card or special ability
> that prevents them from getting Action tokens

### Reload!

- ID: `reload` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Reload!.png`

> Texto fuente:
> Face an Acion token on each of your Violent
> groups which does not already have one. This card
> may De played at any time.
> This card does not benefit groups which are
> suffering from the effect of any card or special abiity
> that prevents them from getting Action tokens.

### Reorganization

- ID: `reorganization` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Reorganization.png`

> Texto fuente:
> You may completely reorganize your entire Power
> You may play this card at any time during your
> own turn. It requires an action from your llluminati.
> Requires Illuminati Action

### Resistance is Useless!

- ID: `resistanceisuseless` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Resistance is Useless!.png`

> Texto fuente:
> Resistance is Useless!
> For the rest of the current turn, the target group's
> Resstance is 0. The target also gets no Resistance
> bonus from its master's alignments or special abili
> ties. But proximity to its ruling llluminati still gives
> This card must be played by a Media group, and
> counts as that group's action
> Requires Media Action

### Revolution!

- ID: `revolution` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Revolution!.png`

> Texto fuente:
> The rebels are in the hills! They have outside support!
> They have photocopiers!
> Play this card wath any attack, either to destroy or
> this card requires an action by a group other than
> those actually attacking the Nation

### Rewriting History

- ID: `rewritinghistory` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Rewriting History.png`

> Texto fuente:
> - Any one alignment of any destroyed group may be
> retroactively added, removed, or reversed. This can
> affect any Goal which involves destroying a certain
> number of groups of some alignment!
> Play this card at any time. It requires an action by
> your luminati, or actions by Media Groups witha B
> total Power of at least 8
> Requires Media or Illuminati Action

### Rogue Boomer

- ID: `rogueboomer` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Rogue Boomer.png`

> Texto fuente:
> The commander of a nuclear missile sub is on
> Gives +5 to any ottempl to control any Nation,
> through intimidation. Or can be used once to give
> aid any Disaster! — but must then be discarded

### Sabotage

- ID: `sabotage` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Sabotage.png`

> Texto fuente:
> Use this card when a rival plays a Group for an
> automatic takeover. He must return that Group to
> his hand. He cannot make an automatic takeover
> Playing this card requires action(s) from either
> your Illuminati, or group(s) with total Power of 6 or
> more — at least one of which shares an alignment
> with the Group that your rival ss trying to control.

### Save the Whales

- ID: `savethewhales` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Save the Whales.png`

> Texto fuente:
> Save the ales
> Esesanss es sy =
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Green group you
> If used with an action, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts until the
> end of the current turn and does not count toward

### Savings & Loan Scam

- ID: `savingsloanscam` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Savings & Loan Scam.png`

> Texto fuente:
> Play t card at any time. Using this card is an
> g c ad this. card and draw three Plot cards from .

### Scandal

- ID: `scandal` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Scandal.png`

> Texto fuente:
> You may play this card at any time except dunng
> an attack. It requires an action by a Media group
> with Pawer of 2 or more
> Choose a nval, and remove all Action tokens from
> his Groups of any one alignment. The alignment
> must be shared by the Media group thal uses the
> Requires Media Action

### Secrets Man Was Not Meant to Know

- ID: `secretsmanwasnotmeanttoknow` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Secrets Man Was Not Meant to Know.png`

> Texto fuente:
> This card may be played immediately after any
> other Plot card is played, for any purpose. That card
> has no effect. Both cards are discarded
> To use this card, you must either spend all Action
> tokens on your luminati (minimum of 1!) or
> discard your top two undrawn Plot cards without
> looking at them!
> Requires Discards or All llluminati'Actions

### Seize the Time!

- ID: `seizethetime` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Seize the Time!.png`

> Texto fuente:
> Seize the Time!
> Play this card at the beginning of any other
> player's turn. It becomes your turn instead. After
> your turn is over, the turn passes back to the player
> whose turn you interrupted (unless someone won).
> During your special turn, all your groups get
> Action tokens, but you may not draw Plot or Group
> cards for any reason.
> No player may use this card more than once in a

### Self-Esteem

- ID: `selfesteem` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Self-Esteem.png`

> Texto fuente:
> This card may be played at any time, and counts
> as the action for the group it affects. The increased
> Power takes effect immediately
> The Power for one Liberal group is increased to 6
> Link this card to your chosen Liberal group ¥
> No player may have more than one Self-Esteem in

### Senate Investigating Committee

- ID: `senateinvestigatingcommittee` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Senate Investigating Committee.png`

> Texto fuente:
> Play this card at the beginning of any other
> player's turn, He may draw cards and place Action
> tokens, but can do nothing else
> This card requires the action of a Government
> group with a Power of at least 5. It cannot affect the
> No player can be hit by more than one Senate
> Investigating Committee in a single game . . . If
> someone tries a second time, the card has no effect
> and is discarded
> Requires Government Action

### Shroud of Turin

- ID: `shroudofturin` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Shroud of Turin.png`

> Texto fuente:
> po ia SE its hil
> The one in the museum is a fake, The real one is for
> away, the center of nightly ritucls
> Whenever you draw a Plot or Group card, you
> may look at the top card in the deck and, if you
> don't want it, take the bottom card instead, without
> looking at it
> Unique Magic Artifact

### Slush Fund

- ID: `slushfund` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Slush Fund.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Conservative group
> If used with an action, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts until the
> end of the current tum and does not count toward

### Sniper

- ID: `sniper` · runtime: `plot` · oficial: `Ass.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `assassination` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Sniper.png`

> Texto fuente:
> Assassination! This is an Instant Attack to Destroy
> any Personality, at any time. It does not require an
> A single Government group may use its action for
> this attack, and add its own Power,

### Solidarity

- ID: `solidarity` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Solidarity.png`

> Texto fuente:
> We must all hang together, or assuredly we shail all
> Benjamin Franklin, at the signing of the
> Declaration of Independence -
> Double the Resistance of all groups

### Soulburner

- ID: `soulburner` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Soulburner.png`

> Texto fuente:
> Whenever a rival captures one of your groups,
> you may immediately draw a Plot card from his
> deck, or expose all his hidden Plots, If a rival
> destroys one of your groups, you may take two Plot
> cards from his deck, or expose all his hidden Plots
> and force him to discard a Plot of your choice
> Unique Magic Gadget

### Spasm of Violence

- ID: `spasmofviolence` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Spasm of Violence.png`

> Texto fuente:
> Spasm of Violence
> By playing this card, you may combine two
> Assassinations on the same target! You must play
> both of the Assassination cards, as well. Pick one of
> the Assassinations to be the “main” one, and follow
> all the instructions on its card. Add the Power (but
> none of the other effects) of the other Assassination

### Spear of Longinus

- ID: `spearoflonginus` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 5
- Imagen: `Plots/INWO - Spear of Longinus.png`

> Texto fuente:
> This artifact, both sacred and cursed, can be used
> Destroy (by any player), or to any Disaster.
> Any attack aided by the Spear 5 considered
> Mogi, and magical defenses may help against it
> Unique Magic Artifact

### Stealing the Plans

- ID: `stealingtheplans` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Stealing the Plans.png`

> Texto fuente:
> Play this card immediately after someone else
> discards a Plot card, whether or not they actually
> Take the Plot card just discarded, and add it to
> your own hand. This costs an action from a group
> with Power of 3 or morc

### Stock Split

- ID: `stocksplit` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Stock Split.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Corporate group
> ¥ used with an action, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts until the
> end of the current tum and does not count toward J

### Straighten Up

- ID: `straightenup` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Straighten Up.png`

> Texto fuente:
> Play this card at any time. It requires action(s) by
> either the Illuminati, or Straight group(s) with a total
> Power equal to the Resistance of the target group, :
> doubled if the group is currently Weird. Add bonuses
> for its closeness to the llluminau if it belongs to a rival!
> The target group becomes permanently Straight
> If it was Weird, that alignment is lost. Keep thas card,
> with a link to the target.

### Sucked Dry and Cast Aside!

- ID: `suckeddryandcastaside` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 1
- Imagen: `Plots/INWO - Sucked Dry and Cast Aside!.png`

> Texto fuente:
> Multiply the Power of one of your groups, except
> considered destroyed, but does rot count toward

### Suicide Squad

- ID: `suicidesquad` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Suicide Squad.png`

> Texto fuente:
> . Suicide Squad
> Can be used to destroy any Resource belonging
> to a rival. May be used at any time except during
> 1: Target is destroyed. Suicide Squad survives
> and may be used again.
> 2-5: Target and Suicide Squad are both destroyed.
> 6: Suicide Squad fails and is destroyed. Target
> Discard any card that is destroyed.

### Sweeping Reforms

- ID: `sweepingreforms` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Sweeping Reforms.png`

> Texto fuente:
> Discard all New World Order cards now in play.
> This requires the action(s) of Media groups with a
> combined Power of at least 6. These groups may
> belong to more than one player!
> This card may be played at any time pr
> Requires Media Action

### Sweepstakes Prize

- ID: `sweepstakesprize` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Sweepstakes Prize.png`

> Texto fuente:
> oy HAY an Co
> You may clready be a winner
> One of your Personalities has become unbeliev
> ably rich. Link tnis card to them. They now have a
> permanent +4 bonus on any direct Attack to §
> Control they make
> No player may have more than one Sweepstakes
> Prize in play

### Swiss Bank Account

- ID: `swissbankaccount` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Swiss Bank Account.png`

> Texto fuente:
> your Hluminati for a single direct attack. This cannot
> be used for Global Power,

### Talisman of Ahrimanes

- ID: `talismanofahrimanes` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Talisman of Ahrimanes.png`

> Texto fuente:
> This card may be played only after any type of
> 3 Assassination. It becomes an automatic failure.
> Then link this card permanently to the card it
> protected. That Personality now has an extra +2
> against any further attack to destroy or +10
> against any further Assassination. If the Personality is
> Killed anyway, the Talisman is lost
> No more than one Talisman of Ahrimanes can be
> in play at one time

### Tax Breaks

- ID: `taxbreaks` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Tax Breaks.png`

> Texto fuente:
> - Tax Breaks
> Gin Ban Ailes
> Purest meg ES
> Place an Action token on each of your Corporate
> groups which does not already have one. This card
> may be played at any time.
> This card does not benefit groups which are
> suffering from the effect of any card or special ability
> that prevents them from getting Action tokens

### Tax Reform

- ID: `taxreform` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Tax Reform.png`

> Texto fuente:
> dE Ea ls Red wd
> In other words, “tax increase.” No government ever
> took its hand out of your pocket unless it had hold of
> The IRS can now tax one Plot card from each
> player, at the beginning of its own tum, drawing
> from their decks.
> is in effect

### Terrorist Nuke

- ID: `terroristnuke` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Terrorist Nuke.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Violent group you
> If used with an action, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts until the
> end of the current turn and does not count toward

### The Auditor from Hell

- ID: `theauditorfromhell` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Auditor from Hell.png`

> Texto fuente:
> This card may be played at any time. Choose one
> rival as your target. You may look at all his hidden
> Plot cards, and either steal one of them, or expose
> This card may only be used by the Network or a
> Computer group, or by a Bank group. It counts as an
> action for that group.
> Requires Network, Computer or Bank Action

### The Big Score

- ID: `thebigscore` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - The Big Score.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Criminal group you
> If used wath an action, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts until the
> end of the current turn and does not count toward

### The Big Sellout

- ID: `thebigsellout` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Big Sellout.png`

> Texto fuente:
> Play this card during your own turn, just after you
> t place Action tokens. You may pick up to ten
> Groups and/or Resources from your hand and
> discard them. You may also discard the top card(s)
> from your Groups deck, as long as the total is ten
> or less. For each Group you discard, you may place
> one extra Action token on one of your own Groups
> No Group may get more than one extra Action
> token from this card.

### The Bronze Head

- ID: `thebronzehead` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Bronze Head.png`

> Texto fuente:
> The Bronze Head
> Its first recorded owner was Roger Bacon. He said it
> If you play a Group card from your own hand,
> and fail in your atternpt to take it over, the card is
> not discarded. Return it to your hand.
> Unique Magic Artifact

### The Corporate Masters

- ID: `thecorporatemasters` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Corporate Masters.png`

> Texto fuente:
> : Any Corporate group with a Power of 4 or more
> counts double toward your total number of groups

### The First Thing We Do, Let's Kill All The Lawyers

- ID: `thefirstthingwedoletskillallthelawyers` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The First Thing We Do, Let_s Kill All The Lawyers.png`

> Texto fuente:
> All The Lawyers
> Gives a +20 to any Attack to Destroy the
> He payer using this card must say solemnly, “Of
> course, many lawyers are very nice people, and
> they are vital to the protection of our freedoms.”
> Try to keep a straight face

### The Frog God

- ID: `thefroggod` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Frog God.png`

> Texto fuente:
> The idols are both frightening and silly, and no one
> knows why the Masters keep them around . .
> You may interfere with a privileged attack, on
> either side. No other players may interfere unless
> they use other special cards.
> Interference is an action for each group that
> interferes, and use of this card is an action for the
> Magic Artifact ACTION

### The Hand of Madness

- ID: `thehandofmadness` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Hand of Madness.png`

> Texto fuente:
> Destroy Peaceful groups, and control Violent
> groups, in any of the following combinations:
> This Goal cannot be combined with other Goals

### The Holy Grail

- ID: `theholygrail` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Holy Grail.png`

> Texto fuente:
> ine rnoty Grai
> Write down the name of a Place and put it under
> this card. This is the secret location of the Holy Grail.
> You may not change it, If the Grail's site is destroyed
> or Devastated by an attack, reveal the note. The
> attack becomes an automatic failure. The Grail
> continues to protect that Place
> If the Grail's site is coptured, the Grail vanishes
> Unique Magic Artifact

### The Internet Worm

- ID: `theinternetworm` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Internet Worm.png`

> Texto fuente:
> The Internet Worm
> Aymanp pminy a
> Pick one of your nvals to suffer your wrath. The
> top three undrawn cards in his Plot deck are
> discarded. No one may look at them.
> Play this card at any time. It requires an action by
> your llluminati, or by Computer group(s) with a total :
> Power of 3 or more
> Requires Computer or: Illuminati Action

### The Library at Alexandria

- ID: `thelibraryatalexandria` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Library at Alexandria.png`

> Texto fuente:
> Sure, they burned down the buitding, but the books .
> were already checked out
> It's the greatest storehouse of knowledge ever
> known, and it's been guarded and enlarged, in
> deepest secrecy, for more than a thousand years.
> Gives a +5 on any attempt to control any Science,
> Magic or Computer group.

### The Oregon Crud

- ID: `theoregoncrud` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - The Oregon Crud.png`

> Texto fuente:
> The Oregon Crud
> - Disaster! This is an Instant Attack to Destroy any
> Place except a Huge one. It does not require an
> If the attack succeeds, the target is Devastated. If
> the die roll succeeds by more than 5, the target is

### The Second Bullet

- ID: `thesecondbullet` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Second Bullet.png`

> Texto fuente:
> Play this card immediately after you fail a roll to
> destroy. If any of your own groups still have Action
> tokens and were eligible to participate in the attack,
> you may spend their action(s) to add enough Power
> to make the attack succeed

### The Stars are Right

- ID: `thestarsareright` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Stars are Right.png`

> Texto fuente:
> Play this card on your tum. You may spend your
> smenati action, or the action(s) of Magic groups
> with a Power of at least 4, to make an automatic
> takeover of any Resource from your hand.
> Requires Magic or Illuminati Action

### The Weak Link

- ID: `theweaklink` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Weak Link.png`

> Texto fuente:
> The enemy treasure was wel guarded . . . so you studied
> the keepers ond fourrd one with a fatal weakness . . .
> A Resource Artifoct or Gadget owned by a rival is
> Piay this card at any time except dunng a privi-
> leged attack. It requires an action by your llluminati,
> or Sdence, Magic or Computer groups with a
> combined Power of at least 6.
> Computer, or llluminati Action

### The Weird Turn Pro

- ID: `theweirdturnpro` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - The Weird Turn Pro.png`

> Texto fuente:
> “When the going gets weird, the weird turn pro.”
> This card may be played at any time, and counts
> as the action for the group it affects. The increased
> Power takes effect immediately.
> The Power for one Weird group is increased to 4
> Link this card to your chosen Weird group +
> No player may have more than one The Weird
> Turn Pro in play.

### Tidal Wave

- ID: `tidalwave` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Tidal Wave.png`

> Texto fuente:
> rl ig oe pis
> Disaster! This is an Instant Attack to Destroy any
> Coastal Place. It does not require an action. Its Power
> If the attack succeeds, the target is Devastated. If
> the die roll succeeds by more than 10, the target is

### Time Warp

- ID: `timewarp` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Time Warp.png`

> Texto fuente:
> Let's try that again, shall we?
> Play this card immediately after any successful die
> roll by any other player. That player must roll again!
> However, they also get to draw a Group card

### Tornado

- ID: `tornado` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Tornado.png`

> Texto fuente:
> Disaster! This is an Instant Attack to Destroy any
> Place except a Huge one. It does not require an
> IF the attack succeeds, the target is Devastated. If
> the die roll succeeds by more than 4, the target is

### Unlucky 13

- ID: `unlucky13` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Unlucky 13.png`

> Texto fuente:
> Play this card on a rival at the very beginning of his
> turn. He can draw no Plot cards, for any reason, until
> after his current turn ends. This requires an action
> Requires Magic Action

### Unmasked!

- ID: `unmasked` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Unmasked!.png`

> Texto fuente:
> “There is a secret of our cabal that even you of the
> Twelfth Circle have not known anid now
> Play this card at any time, along with an lilurminati
> card from your hand. The new card becomes your
> liuminati group, changing your powers and goals! #8
> The old card is discarded \
> If you already had an Agents card for the new B
> lHuminati type, that card is fost -

### Up Against the Wall

- ID: `upagainstthewall` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Up Against the Wall.png`

> Texto fuente:
> Destroy Government groups, and control Violent
> groups, in any of the following combinations:
> This Goal cannot be combined with other Goals

### Upheaval!

- ID: `upheaval` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 7
- Imagen: `Plots/INWO - Upheaval!.png`

> Texto fuente:
> Worldwide nots continue for a third week, with no
> sign of abatement
> Each player must choose one group from his
> Power Structure and discard it. These do not count
> as “destroyed” for anyone's victory conditions. This
> card may be played at any time. It requires an action
> Requires Illuminati Action

### Volcano

- ID: `volcano` · runtime: `plot` · oficial: `Dis.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `disaster` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Volcano.png`

> Texto fuente:
> Disaster! This is an Instant Attack to Destroy any
> A Place except a Huge one, It does not require an
> If the attack succeeds, the target is Devostoted. If
> the die roll succeeds by more than 3, the target is

### Volunteer Aid

- ID: `volunteeraid` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - Volunteer Aid.png`

> Texto fuente:
> ves one Place a +6 to defend against any
> Dscster If the Place is still devastated by the Disaster,

### Voodoo Economics

- ID: `voodooeconomics` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 4
- Imagen: `Plots/INWO - Voodoo Economics.png`

> Texto fuente:
> Play thes card during your own turn, just after you
> place Action tokens. You may discard up to ten Plot
> Cards from the top of your deck, removing them
> permanently from play. For each one you discard,
> you may place one extra Action token on one of
> your own Groups. No Group may get more than
> one extra Action token from this card

### Vultures

- ID: `vultures` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Vultures.png`

> Texto fuente:
> Capitalizing on the disorder caused by a nval's
> attack, you subvert key personnel. Soon you will make
> YOur own mone
> Play this card after a rival plays a Group from his
> own hand, fails to take it over, and discards it
> Place the discarded Group card in your own hand!

### Warehouse 23

- ID: `warehouse23` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 9
- Imagen: `Plots/INWO - Warehouse 23.png`

> Texto fuente:
> When you first play this card, you may immedi-
> ately-fook through your hand or deck and choose
> one Artifact or Gadget Resource card, to play as a
> free automatic takeover.
> You may play any new Resources by hiding them
> under this card. You can't use them until you
> expose them, and once exposed they must stay
> exposed, but you can expose one at any time and
> (if its powers allow it) use it immediately. Your rivals
> cannot look at or affect the cards inside Warehouse
> 23 except by capturing or destroying it. If it is
> captured or destroyed, its cards go with it

### Weather Satellite

- ID: `weathersatellite` · runtime: `resource` · oficial: `Res.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 3
- Imagen: `Plots/INWO - Weather Satellite.png`

> Texto fuente:
> Real weather satellites don't just report the
> power of any Hurricane, Tidal Wave, or Tornado.
> You may increase by 4, or decrease by 2, the power
> of any other Attack to Destroy (including Disasters)
> against any Place except Space ones.
> The Satellite gets two Action tokens, but may not
> use them in the same attack.

### Whispering Campaign

- ID: `whisperingcampaign` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Whispering Campaign.png`

> Texto fuente:
> This card requires an Action from a Media group,
> It gives +15 in any Attack to Destroy a Personality, or
> +10 in any Attack to Destroy any other Group. It
> cannot be used with Assassinations or Disasters
> If a Whispering Campaign succeeds against a
> Personality, he is considered destroyed, but not deod
> ~ just permanently out of public Ife. Thus, he
> cannot be retuned to play by any means!
> Requires Media Action

### Withering Curse

- ID: `witheringcurse` · runtime: `plot` · oficial: `Ass.`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `assassination` · estado: **source-text-unmapped** · implementada: no
- Investigación Internet: sin manifest (carta ya verificada o pendiente de regenerar)
- Imagen: `Plots/INWO - Withering Curse.png`

> Texto fuente:
> ot SRR O gis oo
> Assassination! This is an Instant Attack to Destroy
> any Personality, at any ume. It does not require an
> A single Magic group may use its action for this
> attack, and add its own Power. This attack is Magic.

### World Cup Victory

- ID: `worldcupvictory` · runtime: `plot` · oficial: `Plot`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: official-mention-review-required; OCR ocr-reference; menciones oficiales 2
- Imagen: `Plots/INWO - World Cup Victory.png`

> Texto fuente:
> Play this card at any time to give +10 Power or
> Resistance (your choice) to any Nation you control.
> If used with an action, it must be played when
> that action is first declared, and counts only for that
> action. If used for defense, the bonus lasts unl the
> end of the current turn and does not count toward

### World Hunger

- ID: `worldhunger` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - World Hunger.png`

> Texto fuente:
> increasingly desperate populations are hunting
> whales, setting up factory farms, and strip-mining for
> scarce resources. The environment is falling apart, ond
> nobody has time to worry about it
> All Green groups lose ther Action tokens and
> cannot get new ones or use their special abilities!
> Groups which are Liberal and/or Nations have
> their Power reduced by 2.

### World War Three

- ID: `worldwarthree` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - World War Three.png`

> Texto fuente:
> World War Three
> Any Nation making a direct Attack to Destroy
> against another Nation has tnpled power.
> if it succeeds, the attacking Nation gets a Plot card
> and another Action token immediately! If it fails, the
> attacker 1s destroyed, and counts toward victory
> conditions of the defending player

### Xanadu

- ID: `xanadu` · runtime: `plot` · oficial: `no encontrado`
- Power: null · Resistance: null · alineamientos: — · estimado: sí
- Mecánica: `unverified` · estado: **unverified** · implementada: no
- Investigación Internet: ocr-only-pending; OCR ocr-reference; menciones oficiales 0
- Imagen: `Plots/INWO - Xanadu.png`

> Texto fuente:
> Is it a piace, or does it exist only in virtual reality? No
> one knows. Xanadu is the ultimate vacation spot
> where all desires are fulfifed. Once one of your
> servants has visited Xanadu, he'll be loyal forever, just
> for the chance to go bock .
> ¥ a card duplicating one of your Groups is
> played, it gives no bonus to an attempt to Control
> or Destroy your group.

