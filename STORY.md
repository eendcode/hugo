# Story mode: "De saga van Pim en Barend"

Status: **built. All four books are playable** (see README.md, "Het grote
verhaal"). The open points that were decided are marked below; English,
reading aloud and the raadselboek are still open.

A story mode in four books. Books 1–3 are about six chapters each and take
roughly 30–45 minutes, played over a few evenings. Book 4 is a shorter
final, the boss fight. Each chapter is a scene,
a written riddle, and one puzzle that *is* the action in the story. Stories
are played in order: each book opens after the one before it.

| Book | Title | Shape |
|---|---|---|
| 1 | **De nacht van de bokkenrijders** | Defend the chapel before midnight |
| 2 | **Red Barend!** | Sneak into Hugo's house and free Barend |
| 3 | **Wie heeft het klokje gestolen?** | A mystery: Hugo is blamed, Pim proves he didn't do it |
| 4 | **De Nachtbok** | The final: lift the old curse and set all the goats free |

The arc runs from threat (Book 1) to confrontation (Book 2) to friendship
(Book 3). Then everyone faces the biggest fear together (Book 4), and it
turns out to be small and lonely. It is the same arc the road game has: the
scary thing turns out to be okay.

## Ground rules (and one deliberate change)

- **Every puzzle is a story action.** Afterwards the scene shows the result:
  the plank is on the door, the lantern burns on the dune.
- **The world remembers.** Book 1's chapel scene fills up as chapters are
  done (planks, lanterns, a hoof trail, lit windows). Items and clues found in
  one chapter are used in a later one.
- **No losing, no timers.** Wrong riddle answers get a friendly, funny
  reaction and you try again. The clock in Book 1 shows how far the story has
  got. It is not a countdown.
- **Change from DESIGN.md: this mode has text to read.** The other modes need
  no reading. Here all story lines and riddles are written in *easy Dutch*,
  for a child who is starting to read, with a parent helping:
  - one short sentence per line, at most about seven words;
  - short, common words that are written the way they sound
    (kip, maan, boom, plank), and present tense;
  - every riddle ends with the fixed line **"Wat ben ik?"** or
    **"Wie ben ik?"**, so the child learns to recognise it;
  - large type, and each sentence on its own line.
- **Nobody is locked up alone.** Hugo takes Barend, and Pim is the rescuer.
  The robbers are clumsy and a bit silly. Griezelstand only changes the
  darkness and the sounds, never what happens.

## Building blocks

**Reused engines with story art.** Every chapter puzzle is one hand-picked
level from an engine we already have, so solvers, hints and stars come for
free:

| Engine | Used in |
|---|---|
| Bells (play the tune back) | 1.1, 3.6 finale |
| Cart yard | 1.2 |
| Barend's program | 1.4, 2.5 |
| Lantern light | 1.5, 3.5, 4.2 |
| Candles (lights out) | 1.6, 4.3 (ribbons) |
| Road game, with the Dame's patrol rule | 2.2 (sneaking), 3.4 (feathers in order), 4.1 (lightning in the sky) |
| Pipes | 2.3 |
| Sliding portrait | 2.4 |
| Chess: capture all, mate in two, mate a lone king | 2.6, 3.3, 4.4 |
| Number sequences | 3.2 |
| Pairs | 3.6 |

**New, story-only pieces:**

| Piece | What it is |
|---|---|
| **Raadselkaart** | A parchment card with the riddle. Three or four picture answers; one is tapped. A hint (💡) crosses out one wrong picture. The right picture flies into the scene or into the bag. |
| **Tas** (bag) | A strip with the items and clues found so far. Items are used automatically at the right moment; there is no free point-and-click. |
| **Planken** | Cover the holes in a door with plank shapes, so that every hole is covered. Builds on the road game's block pieces. Needs a small exact-cover solver. |
| **Slot** | A lock with three wheels (numbers 1–6, or pictures). The code comes from counting things in the scene. |
| **Wat is er anders?** | Two pictures, yesterday and today: tap the differences. |
| **Verdachtenbord** | Book 3's suspect board. Each new clue lets the child turn suspects over. |
| **Nachtbok-meter** | Book 4's "health bar": the Nachtbok's size next to something familiar (mountain, house, tree, horse, little goat). It shrinks after every phase. |

### The black stone (seeds for Book 4)

The curse behind the flying goats is planted in each book, one line or
picture at a time, so the final doesn't come out of nowhere:

| Where | Seed |
|---|---|
| 1.6 | The flying goats' eyes glow purple. |
| 2.4 | A black stone glows on Hugo's shelf. Oma Hilde: „Dat is de steen van Opa Bram. Raak hem nooit aan!” |
| 3.5 | Among the magpie's shiny things lies the same black stone. |
| After Book 3 | One last picture after „Einde”: in the nest, the stone starts to glow. |

---

## Book 1: De nacht van de bokkenrijders

Set after the road game: the treasures are back in the chapel. A clock in
the chapel scene moves from 6 to 12, one hour per chapter.

**Intro**
> De schatten staan weer in de kapel.
> Maar kijk! Daar ligt een brief.
> *„Om twaalf uur kom ik terug. Dan pak ik de schat. – Hugo”*
> Pim kijkt naar de klok. Het is zes uur.
> „Kom, Barend. We maken de kapel dicht!”

### 1.1 De klok in de toren (7 uur)
> Het dorp slaapt al.
> Pim moet iedereen wakker maken.

**Riddle:**
> Ik hang hoog in de toren.
> Ik heb geen mond.
> Toch roep ik heel hard: bim bam!
> Wat ben ik?

Answers: **klok** · vogel · lamp · vlag

**Puzzle:** bells. Play the alarm tune back (three to four notes).
**After:** "Overal gaat het licht aan. Het dorp helpt mee!"

### 1.2 De kar met planken (8 uur)
> Boer Teun heeft planken.
> Maar zijn kar zit klem in de schuur.

**Riddle:**
> Ik ben van hout.
> Ik ben lang en plat.
> Je timmert mij op een deur.
> Wat ben ik?

Answers: **plank** · appel · bal · vis

**Puzzle:** cart yard in the barn. Get the plank cart out of the door.
**After:** the plank cart stands next to the chapel. The bag gets *planken*.

### 1.3 Timmer de deur dicht (9 uur)
> De deur van de kapel heeft gaten.
> Pim heeft planken. Maar wat nog meer?

**Riddle:**
> Ik heb een kop, maar geen ogen.
> Ik heb een steel, maar ik ben geen bloem.
> Ik zeg: tik, tik, tik!
> Wat ben ik?

Answers: **hamer** · bloem · pop · schep

**Puzzle:** *Planken* (new). Cover every hole in the door.
**After:** "Tik, tik, tik! De deur is dicht." The planks stay on the door.

### 1.4 Een vals spoor (10 uur)
> Hugo stuurt eerst zijn geiten vooruit.
> Ze volgen elk spoor.
> Barend heeft een slim plan.

**Riddle:**
> Ik ben nat en bruin.
> Stap je in mij?
> Dan zak je weg.
> Wat ben ik?

Answers: **modder** · steen · brug · gras

**Puzzle:** Barend's program. Barend's hoof prints must pass the marked spots
and end in the mud.
**After:** "Plof! De geiten zakken in de modder. Mopperend gaan ze terug."

### 1.5 Licht op de duinen (11 uur)
> Het is pikdonker op de duinen.
> Zo ziet de wacht de rovers niet.

**Riddle:**
> Kijk in mij.
> Wie zie je dan?
> Jij!
> Wat ben ik?

Answers: **spiegel** · raam · deur · bord

**Puzzle:** lantern light. The moonstones are now beacons on the dunes.
**After:** "Daar! De wacht ziet de rovers komen."

### 1.6 Twaalf uur
> Bim bam! Het is twaalf uur.
> De rovers kunnen niet door de deur.
> Dan vliegen ze op hun geiten naar de toren!

(In the folklore, bokkenrijders ride their goats through the air.)

**Riddle:**
> Ik ben wit en zacht.
> Ik zweef in de mist.
> Ik pas op de kapel.
> Wie ben ik?

Answers: **de Witte Dame** · Hugo · wolk · schaap

**Puzzle:** candles. Light every window of the chapel.
(Seed: the flying goats' eyes glow purple.)
**After:**
> De kapel straalt.
> Daar is de Witte Dame. „Boe!” zegt ze zacht.
> De rovers schrikken. Ze vliegen hard weg.

**Finale and cliffhanger**
> Het dorp juicht. De schat is veilig!
> Maar ver weg op de hei moppert Hugo.
> „Die slimme geit… Die wil ik hebben!”
>
> De volgende ochtend is de stal leeg.
> Barend is weg!
> Er ligt alleen een rode veer. Van de hoed van Hugo.

Hugo's **red** feather matters again in Book 3.

---

## Book 2: Red Barend!

Hugo took Barend because his own goats aren't clever: he wants Barend to
teach them tricks. This is an escape-room story. It uses the haunted house's
building with a different map, and a talking portrait gives the riddles.

**Intro**
> Hugo heeft Barend meegenomen!
> Hij wil dat Barend zijn geiten slim maakt.
> Pim gaat naar het huis van Hugo.
> Hij is een beetje bang.
> Maar Barend is zijn vriend!

### 2.1 Het hek
> Het hek zit op slot.
> Er hangt een slot met drie wieltjes.

**Riddle (the riddle is the code):**
> Tel de geiten op het hek.
> Tel de ramen in de toren.
> Tel de sterren boven het dak.
> Dat is de code!

**Puzzle:** *Slot* (new). Count the things in the scene and set the three
wheels.
**After:** "Klik! Het hek gaat open."

### 2.2 De gang
> Binnen loopt een rover.
> Hij slaapwandelt! Zzz…
> Pim mag geen geluid maken.

**Riddle:**
> Ik lig op de vloer.
> Je loopt over mij.
> Maar je hoort je voeten niet.
> Wat ben ik?

Answers: **kleed** · trom · bel · emmer

**Puzzle:** the road game in a corridor. Lay a runner (*loper*) past the
sleepwalker, using the Witte Dame's patrol rule.
**After:** "Pim sluipt zacht langs de rover."

### 2.3 De kelder
> De sleutel van de toren ligt in de kelder.
> Hij ligt op een vlotje, ver weg in het water.

**Riddle:**
> Ik ben klein en van ijzer.
> Ik pas in een slot.
> Draai mij om.
> Dan gaat de deur open!
> Wat ben ik?

Answers: **sleutel** · lepel · vork · munt

**Puzzle:** pipes. Make the water flow, and the raft floats over to Pim.
**After:** the bag gets *sleutel*.

### 2.4 De bibliotheek
> Wie praat daar? Het is een schilderij!
> Het is Oma Hilde, de oma van Hugo.
> „Hugo is een stoute jongen,” zegt ze. „Ik help je.”

**Riddle (from Oma Hilde):**
> Ik heb veel bladen,
> maar ik ben geen boom.
> Ik heb een rug,
> maar ik loop niet.
> Wat ben ik?

Answers: **boek** · boom · stoel · hond

**Puzzle:** sliding portrait. Put the torn drawing of the house back
together.
**After:** "Kijk! Barend zit boven in de toren." The bag gets *kaart*.
Oma Hilde also says "Pas op met toveren, Hugo!", which sets up the spookhuis.
(Seed: a black stone glows on the shelf. „Dat is de steen van Opa Bram. Raak
hem nooit aan!”)

### 2.5 De toren
> De sleutel past! De trap gaat omhoog.
> Boven is nog een deur. Daar zit Barend!
> Maar die deur heeft een grendel. Aan de kant van Barend.

**Riddle:**
> Ik heb een baard,
> maar ik ben geen opa.
> Ik eet alles, ook je sok!
> Ik zeg: mèèè!
> Wie ben ik?

Answers: **Barend** · Hugo · koe · kat

**Puzzle:** Barend's program. Pim slides the arrow cards under the door, and
Barend walks to the bolt. Barend half-rescues himself.
**After:** "Klik! „Mèèè!” Pim en Barend knuffelen."

### 2.6 Weg hier!
> „Wie is daar?” roept Hugo. Hij is wakker!
> Snel, Pim. Niet de trap af!

**Riddle:**
> Ik ben van glas.
> Je kijkt door mij naar buiten.
> Doe mij open,
> dan kun je weg!
> Wat ben ik?

Answers: **raam** · bril · glas · deur

**Puzzle:** chess, *capture all*, with a knight. "Barend springt als een
paard!" He jumps over the ditch along every stepping stone in the fewest
jumps.
**After:**
> Pim en Barend rennen naar huis.
> Hugo stampt boos op de grond.
> „Ik word de engste van allemaal!”
> Hij roept een toverspreuk… Boem!
> Alle kaarsen in zijn huis gaan uit.

This leads into the existing mode **Het spookhuis van Hugo**. Its ending,
"Ik zal nooit meer stelen", is the starting point of Book 3. The spookhuis
does not have to be played: Book 3's intro sums it up.

---

## Book 3: Wie heeft het klokje gestolen?

A mystery with a **suspect board** that stays on screen for the whole book:
Hugo, Hugo's goat, Knor the robber, the farmer's cat, the owl and the
magpie (ekster). The child turns suspects over as clues arrive. No villain
in the end: the culprit is a magpie that loves shiny things.

**Intro**
> Hugo zat vast in een schilderij. Pim hielp hem eruit.
> Sinds die dag is Hugo lief. Hij steelt nooit meer.
> Maar op een ochtend… het klokje van de kapel is weg!
> „Dat was Hugo!” roept het dorp.
> Hugo huilt. „Ik was het niet!”
> Pim pakt zijn vergrootglas. „Wij zoeken het uit, Barend.”

### 3.1 Wat is er anders?
> Kijk goed. Gisteren en vandaag.

**Puzzle:** *Wat is er anders?* (new). Differences: the klokje is gone,
a feather lies on the step, and there are no footprints in the sand.

**Riddle (about the clue):**
> Ik ben licht.
> Ik kom van een vogel.
> Blaas maar, dan zweef ik weg.
> Wat ben ik?

Answers: **veer** · blad · ei · steen

**After:** the feather goes into the bag. It is **black and white**, and
Hugo's feather was red. That is the first doubt.

### 3.2 Wie kan vliegen?
> Er zijn geen voetstappen in het zand.
> De dief kwam door de lucht!

**Riddle (tap every right answer):**
> Wie kan vliegen?
> Tik ze allemaal aan!

Right: ekster · uil · Hugo's geit (they fly in the folklore). Wrong: kat ·
Knor. On the board, the cat and Knor turn over.

**Puzzle:** number sequences. The owl was awake: "Los mijn sommen op, dan
vertel ik wat ik zag."
**After:** "Ik zag iets vliegen. Het had iets dat glom!" The owl was
watching, not stealing, so she turns over.

### 3.3 Het schaakbord van Hugo
> De koster zegt: „Hugo was bij mij!
> We speelden de hele nacht schaak.
> Het spel is nog niet af.”

**Riddle:**
> Ik ben de baas op het bord.
> Toch zet ik maar één stap.
> Wie ben ik?

Answers: **de koning** · het paard · de toren · de pion

**Puzzle:** chess, mate in two, from "their" unfinished game.
**After:** "Het klopt! Hugo was het niet." Hugo and his goat (asleep in the
stable) turn over. One suspect is left: „De ekster!”

### 3.4 Het verenpad
> Overal liggen zwart-witte veren.
> Ze wijzen de weg.

**Riddle:**
> Ik ben groot.
> Ik heb een stam en veel blad.
> Vogels wonen in mij.
> Wat ben ik?

Answers: **boom** · huis · berg · bloem

**Puzzle:** the road game in the woods. The feathers are the numbered
treasures, picked up in order, up to the big tree.

### 3.5 Het nest
> Hoog in de boom ligt een nest.
> Er glimt van alles in. Maar het is donker.

**Riddle:**
> Ik ben rond.
> Ik ben van takjes.
> Een vogel legt er eitjes in.
> Wat ben ik?

Answers: **nest** · mand · hoed · bal

**Puzzle:** lantern light. Bounce the moonlight onto every shiny thing; the
last moonstone is the klokje.
(Seed: the black stone from Hugo's shelf lies in the nest too. The magpie
took it.)

### 3.6 Ruilen
> „Het klokje glimt. Het is van mij!” zegt de ekster.
> Hugo denkt na. „Ik heb ook iets dat glimt…”

**Riddle:**
> Ik ben rond en ik glim.
> Ik zit op een jas.
> Ik maak je jas dicht.
> Wat ben ik?

Answers: **knoop** · munt · bal · maan

**Puzzle:** pairs. The magpie only collects things in twos; find the pairs
of Hugo's shiny buttons. Then, as the finale, **bells**: Hugo rings the
klokje's tune.

**Finale**
> Het klokje hangt weer in de toren.
> „Sorry, Hugo,” zegt het dorp.
> Hugo mag de klok luiden. Bim bam!
> Pim, Barend en Hugo zijn nu vrienden.
> Einde.

And one more picture, with no text: the nest at night, and the black stone
starts to glow.

---

## Book 4: De Nachtbok

The final. Long ago, Hugo's grandfather, **Opa Bram**, locked a curse in a
black stone: the *bokkenvloek*, which made goats fly so they could carry the
robbers through the night. When Hugo promised never to steal again, the
curse woke up, alone and angry, and grew into **de Nachtbok**: a giant goat
made of storm and shadow.

It is a boss fight in phases. The **Nachtbok-meter** shows how big it is,
and every phase makes it smaller. Each phase is a puzzle Pim already knows,
and each time a friend from the earlier books helps. Pim and Barend stay
together the whole time; for once, Pim flies on Barend.

**Intro**
> Het feest is voorbij. Iedereen slaapt.
> Maar in het nest gloeit de zwarte steen.
> Krak! De steen breekt open.
> Er komt een storm. Een grote, zwarte storm.
> In de storm staat een reus van een bok: de Nachtbok!
> „Alle geiten zijn van mij!” bromt hij.
> Alle geiten zweven de lucht in. Barend ook!
> Pim houdt Barend goed vast.
> Nu vliegt Pim zelf!

Meter: **zo groot als een berg**.

### 4.1 Door de storm
> Hugo vliegt mee op zijn geit. „Ik help je, Pim!”
> De uil en de ekster wijzen de weg.
> Pas op voor de bliksem!

**Riddle:**
> Ik ben wit en zacht.
> Ik zweef in de lucht.
> Soms huil ik regen.
> Wat ben ik?

Answers: **wolk** · schaap · ballon · veer

**Puzzle:** the road game in the sky. The road pieces are clouds, and
lightning flashes along a fixed loop (the Witte Dame's patrol rule).
**After:** "Daar is de Nachtbok! Hij is zo groot als een berg."

### 4.2 De mist
> Om de Nachtbok hangt dikke mist.
> Daar is de Witte Dame. „Neem mijn licht, Pim.”

**Riddle:**
> Ik brand in het donker.
> Ik hang aan je hand.
> Ik maak de nacht licht.
> Wat ben ik?

Answers: **lantaarn** · tas · bel · maan

**Puzzle:** lantern light. The Dame's lantern and mirrors; the moonstones are
the weak spots in the mist.
**After:** "De mist is weg. De Nachtbok krimpt!" Meter: **zo groot als een
huis**.

### 4.3 Maak de geiten los
> Alle geiten zitten vast aan de Nachtbok.
> Met linten van paars licht.
> Hugo heeft het schilderij van Oma Hilde bij zich.
> „Dit is de vloek van Opa Bram,” zegt Oma.
> „Maak de linten los. Maar let op:
> elk lint zit vast aan het lint ernaast.”

**Riddle:**
> Ik ben lang en dun.
> Ik zit in je haar,
> of om een cadeau.
> Trek aan mij, dan ga ik los.
> Wat ben ik?

Answers: **lint** · slang · potlood · sok

**Puzzle:** candles (lights out). Each knot is a candle: undoing one flips
the knots next to it. Undo them all.
**After:**
> Alle geiten zweven zacht naar beneden.
> Alleen Barend en de geit van Hugo vliegen nog.
> „Wij zijn nog niet klaar!”

Meter: **zo groot als een boom**.

### 4.4 Zet de Nachtbok vast
> De Nachtbok wil wegvluchten.
> Hugo en het dorp helpen. Zet hem vast!

**Riddle:**
> Ik sta op de hoek van het bord.
> Ik ben van steen.
> Ik ga recht, nooit schuin.
> Wat ben ik?

Answers: **toren** · loper · paard · pion

**Puzzle:** chess, *mate a lone king* (Vang de hoofdman). The Nachtbok is
the lone king. Hugo, now on Pim's side, is one of the two rooks. Use a small
board, with hints.
**After:** "Schaakmat! De Nachtbok kan niet meer weg." Meter: **zo groot als
een paard**.

### 4.5 De drie raadsels
> De Nachtbok kijkt Pim aan.
> „Raad mijn raadsels,” bromt hij.
> „Dan ben ik weg.”

This chapter has no other puzzle: the riddles are the fight. That makes
reading, the skill the whole saga practises, the final weapon. Each right
answer shrinks the Nachtbok.

**Riddle 1:**
> Ik ben er als het licht is.
> Ik loop met je mee.
> Ik ben zwart, maar ik doe niks.
> Wat ben ik?

Answers: **schaduw** · kat · kraai · nacht
**After:** "De Nachtbok was maar een grote schaduw!"

**Riddle 2:**
> Ik kom elke ochtend op.
> Ik ben geel en warm.
> Dan is de nacht voorbij.
> Wat ben ik?

Answers: **zon** · maan · ster · lamp
**After:** the first sunlight comes over the dunes, and the Nachtbok shrinks
to the size of a dog.

**Riddle 3:**
> Ik was heel lang alleen.
> In een steen, in het donker.
> Wat wil ik het liefst?

Answers: **een vriend** (two goats cuddling) · een schat · een storm · een
taart. A wrong answer gets a gentle reply, for example for the cake:
„Mmm, taart is lekker. Maar dat is het niet.”

**Finale**
> Pof! De Nachtbok is weg.
> Daar staat een klein, zwart bokje. Het rilt.
> „Ik was zo alleen,” piept het.
> Barend geeft het bokje een kopje. „Mèè. Kom maar mee.”
> De steen breekt in duizend sterren.
> Alle geiten zijn vrij. Geen geit vliegt meer voor de rovers.
> De spookmist is voor altijd weg.
> Het bokje woont nu bij Barend in de stal.
> Feest bij de kapel! Iedereen is er.
> Einde van de saga.

The last picture is the party: Pim, Barend and the little goat, Hugo, the
Witte Dame, Oma Hilde's painting, the owl, the magpie, boer Teun and the
village.

---

## Open points

1. **English** (open). Riddles don't translate word for word, so the
   English version needs its own riddles with the same answers. The saga is
   in Dutch only for now; English comes afterwards.
2. **Reading aloud** (open). An optional "Lees voor" switch in the adult
   menu could use the browser's speech (`speechSynthesis`). Dutch voices
   aren't available on every TV browser, so it could only ever be an extra.
3. **Raadselboek** (open). Riddles already solved could be collected in a
   book to read again. It's cheap to add and good reading practice.
4. **Pace** (decided). Each chapter's puzzle is one hand-picked, gentle
   level, easier than the same engine's late stages: the story is the
   reward, not the difficulty.
5. **Naming the little goat** (decided, built). In 4.5 the child picks the
   bokje's name from three pictures: Nachtje (a moon), Pikkie (a bow) or
   Sterre (a star). The name and its look appear in the finale and on the
   finished map.
6. **The chess phase (4.4)** (decided). Instead of mating a lone king with
   two rooks, it is a mate in two on a 5×5 board with two rooks and a king,
   with one key move. A wrong move is shown and undone, and the hint shows
   each move in turn.

## How it is built

- The first entry in the mode menu, **📖 Het grote verhaal**: a bookshelf,
  a map per book (chapters as stops along a path), progress saved per
  chapter.
- Each chapter is data: story pages, a riddle, the puzzle (engine plus one
  frozen level, with a story skin) and the items gained. One JSON file per
  book in `web/levels/saga/`, checked by `make validate` like the other
  packs.
- The existing play screens take one given level, a story skin and the
  story's own words through small opt-in hooks, and report back when they
  are won. The code is in `web/modes/saga/`; README.md describes it.
