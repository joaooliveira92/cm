import { NATION_CODES, type NationCode } from "./nations.js";

/**
 * Given names and surnames by nation — the pool a generated player's name is drawn from.
 *
 * This sits under `nations.ts`'s **factual and stable** heading, not its **gameplay priors**
 * heading. Common given names and surnames in a country carry no more legal or interpretive weight
 * than the country's languages, which already sit in `NationProfile`; the same reasoning keeps city
 * names out of the content pack.
 *
 * It is deliberately **not** content-pack data. The pack exists for replaceable commercial
 * identities and ships *before* a world is generated, so it cannot name players who do not yet
 * exist, and a generated fictional name has no licensed counterpart to be swapped for. A player's
 * identifier is already a canonical id; the name is an attribute hanging off it.
 *
 * **On the caricature risk.** `nations.ts`'s safeguard — a prior shifts a distribution, and
 * individual variance must exceed the national modifier — does not map onto names, because a name
 * is drawn wholly from one pool with no variance term to dominate the national one. The defensible
 * ground is the factual/prior split above: these are linguistic frequencies, not claims about
 * people. A project unwilling to make that claim per nation keeps one shared pool and accepts that
 * every league in the world reads alike.
 *
 * **Pool size is part of the decision, and these pools are far short of it.** The target is roughly
 * 100 given names and 200 surnames per nation — 20,000 combinations, so that at ~40,000 players a
 * nation a full name recurs about twice, which is how a real league reads. What ships here is the
 * nation-keyed *structure* and a head start; `namePools.test.ts` fixes the recurrence property, and
 * growing the lists behind that test is content work needing no code change.
 */

export interface NamePool {
  readonly givenNames: readonly string[];
  readonly surnames: readonly string[];
}

/**
 * Typed as a complete record over `NATION_CODES`, so a nation added to the nation list without a
 * name pool is a compile error rather than a runtime surprise.
 */
export const NAME_POOLS: Readonly<Record<NationCode, NamePool>> = {
  ENG: {
    givenNames: [
      "Harry", "Jack", "Oliver", "Charlie", "Thomas", "George", "Alfie", "Joseph",
      "Lewis", "Ethan", "Daniel", "Samuel", "Reece", "Callum", "Nathan", "Owen",
      "Marcus", "Jordan", "Kyle", "Dominic",
    ],
    surnames: [
      "Smith", "Jones", "Taylor", "Brown", "Wilson", "Evans", "Thomas", "Roberts",
      "Walker", "Wright", "Thompson", "Robinson", "Wood", "Hall", "Green", "Clarke",
      "Baker", "Harrison", "Turner", "Hughes", "Edwards", "Collins", "Bell", "Ward",
    ],
  },
  ESP: {
    givenNames: [
      "Alejandro", "Javier", "Sergio", "Carlos", "Daniel", "Pablo", "Adrián", "Iker",
      "Rubén", "Marcos", "Álvaro", "Hugo", "Diego", "Jorge", "Raúl", "Óscar",
      "Nacho", "Unai", "Borja", "Iván",
    ],
    surnames: [
      "García", "Fernández", "González", "Rodríguez", "López", "Martínez", "Sánchez", "Pérez",
      "Gómez", "Martín", "Jiménez", "Ruiz", "Hernández", "Díaz", "Moreno", "Álvarez",
      "Romero", "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos", "Gil", "Serrano",
    ],
  },
  PRT: {
    givenNames: [
      "João", "Tiago", "Rui", "Bruno", "Ricardo", "Nuno", "Pedro", "André",
      "Miguel", "Diogo", "Gonçalo", "Rafael", "Vítor", "Hélder", "Fábio", "Duarte",
      "Sérgio", "Paulo", "Luís", "Márcio",
    ],
    surnames: [
      "Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins",
      "Jesus", "Sousa", "Fernandes", "Gonçalves", "Gomes", "Lopes", "Marques", "Alves",
      "Almeida", "Ribeiro", "Pinto", "Carvalho", "Teixeira", "Moreira", "Correia", "Mendes",
    ],
  },
  FRA: {
    givenNames: [
      "Lucas", "Hugo", "Théo", "Enzo", "Nathan", "Maxime", "Antoine", "Julien",
      "Clément", "Baptiste", "Romain", "Florian", "Adrien", "Quentin", "Kylian", "Mathis",
      "Corentin", "Bastien", "Loïc", "Yanis",
    ],
    surnames: [
      "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand",
      "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David",
      "Bertrand", "Roux", "Vincent", "Fournier", "Morel", "Girard", "André", "Mercier",
    ],
  },
  DEU: {
    givenNames: [
      "Lukas", "Jonas", "Leon", "Felix", "Maximilian", "Niklas", "Tim", "Julian",
      "Florian", "Sebastian", "Moritz", "Jannik", "Philipp", "Marcel", "Fabian", "Dominik",
      "Tobias", "Simon", "Erik", "Kilian",
    ],
    surnames: [
      "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
      "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf",
      "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger", "Hofmann", "Lange", "Werner",
    ],
  },
  BRA: {
    givenNames: [
      "Gabriel", "Lucas", "Matheus", "Rafael", "Bruno", "Felipe", "Thiago", "Vinícius",
      "Douglas", "Rodrigo", "Caio", "Everton", "Wesley", "Marcelo", "Danilo", "Renato",
      "Igor", "Murilo", "Otávio", "Léo",
    ],
    surnames: [
      "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Carvalho",
      "Almeida", "Nascimento", "Araújo", "Ribeiro", "Rocha", "Barbosa", "Cardoso", "Gomes",
      "Moura", "Freitas", "Teixeira", "Cavalcante", "Monteiro", "Pinheiro", "Correia", "Dias",
    ],
  },
  AND: {
    givenNames: [
      "Marc", "Jordi", "Pol", "Aleix", "Ferran", "Roger", "Bernat", "Guillem",
      "Arnau", "Oriol", "Martí", "Biel", "Nil", "Quim", "Xavier", "Genís",
      "Ramon", "Joan", "Sergi", "Andreu",
    ],
    surnames: [
      "Areny", "Riba", "Font", "Puig", "Vidal", "Mas", "Roca", "Serra",
      "Coma", "Bonet", "Aleix", "Casals", "Torres", "Miquel", "Rossell", "Llovera",
      "Naudi", "Calvó", "Duró", "Sansa", "Betriu", "Gilabert", "Moles", "Cerni",
    ],
  },
  ITA: {
    givenNames: [
      "Lorenzo", "Matteo", "Andrea", "Francesco", "Alessandro", "Riccardo", "Davide", "Federico",
      "Simone", "Marco", "Luca", "Giacomo", "Nicolò", "Gabriele", "Stefano", "Antonio",
      "Emanuele", "Filippo", "Tommaso", "Pietro",
    ],
    surnames: [
      "Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci",
      "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Mancini", "Costa",
      "Giordano", "Rizzo", "Lombardi", "Moretti", "Barbieri", "Fontana", "Santoro", "Mariani",
    ],
  },
};

/** Every full name a nation's pool can produce. The recurrence property is a function of this. */
export const poolCombinations = (code: NationCode): number => {
  const pool = NAME_POOLS[code];
  return pool.givenNames.length * pool.surnames.length;
};

/** Nations whose pool is empty — a defect in the shipped data, caught by a test over this module
 *  rather than by a runtime failure during generation. */
export const nationsWithEmptyPools = (): readonly NationCode[] =>
  NATION_CODES.filter(
    (code) => NAME_POOLS[code].givenNames.length === 0 || NAME_POOLS[code].surnames.length === 0,
  );
