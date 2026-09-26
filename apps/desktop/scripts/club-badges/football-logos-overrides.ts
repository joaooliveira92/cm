import { badgeSlug } from "./slug.js";

/**
 * Every decision the slug rule can't make for the `football-logos` dump.
 *
 * The dump spells one club differently across seasons ("Arsenal" in 2021-22, "Arsenal FC" since),
 * and the slug rule reads those as two clubs. Left alone, one club would get two keys, and a pack
 * mapped to the older one would wear a stale crest. Each group below is one club: its first name is
 * the spelling whose slug becomes the key (the newest, unless noted), and every later spelling is
 * mapped onto it. Newest-wins still picks the file, whichever spelling it sits under.
 *
 * The groups were drafted from two kinds of evidence inside one country: byte-identical files under
 * different names, and names differing only by a club-form affix (FC, FK, SK, Boldklub), a founding
 * year, a city, punctuation or an abbreviation. Each was then checked as the same club. Spellings
 * that look alike but are different clubs stay separate on purpose: CSKA 1948 and CSKA Sofia,
 * Metalist Kharkiv and Metalist 1925 Kharkiv, Górnik Łęczna and Górnik Zabrze.
 *
 * Only the extra spellings get an override. The first name still reaches its key by the slug rule,
 * so a genuinely different club that slugs the same still stops the import as a collision.
 */
const SAME_CLUB: ReadonlyArray<readonly [nation: string, name: string, ...spellings: Array<string>]> = [
  ["aut", "Red Bull Salzburg", "RB Salzburg"],

  ["bel", "Beerschot VA", "Beerschot V.A."],
  ["bel", "Club Brugge KV", "Club Brugge"],
  ["bel", "Oud-Heverlee Leuven", "OH Leuven"],
  ["bel", "Royal Antwerp FC", "Royal Antwerp"],
  ["bel", "Royal Charleroi SC", "R Charleroi SC", "RSC Charleroi"],
  ["bel", "Union Saint-Gilloise", "Royale Union Saint Gilloise"],
  ["bel", "Zulte Waregem", "SV Zulte Waregem"],

  ["bgr", "CSKA Sofia", "CSKA-Sofia"],

  ["che", "FC Basel 1893", "FC Basel"],
  ["che", "FC St. Gallen 1879", "FC St. Gallen"],

  ["cze", "1.FC Slovacko", "Slovacko"],
  ["cze", "Bohemians Prague 1905", "FC Bohemians Prague 1905"],
  ["cze", "FC Banik Ostrava", "Banik Ostrava"],
  ["cze", "FC Slovan Liberec", "Slovan Liberec"],
  ["cze", "FC Viktoria Plzen", "Viktoria Plzen"],
  ["cze", "FC Zlin", "FC Trinity Zlin"],
  ["cze", "SK Slavia Prague", "Slavia Prague"],

  ["deu", "1.FC Köln", "1. FC Köln"],
  ["deu", "Bayern Munich", "FC Bayern"],
  ["deu", "Borussia Mönchengladbach", "Bor. M'gladbach"],
  ["deu", "Eintracht Frankfurt", "E. Frankfurt"],

  ["dnk", "Lyngby Boldklub", "Lyngby BK"],
  ["dnk", "Odense Boldklub", "Odense BK"],
  ["dnk", "Sönderjyske Fodbold", "Sönderjyske", "SönderjyskE"],
  ["dnk", "Vejle Boldklub", "Vejle BK"],

  ["eng", "Arsenal FC", "Arsenal"],
  ["eng", "Brighton & Hove Albion", "Brighton"],
  ["eng", "Burnley FC", "Burnley"],
  ["eng", "Chelsea FC", "Chelsea"],
  ["eng", "Manchester City", "Man City"],
  ["eng", "Southampton FC", "Southampton"],
  ["eng", "Tottenham Hotspur", "Spurs"],
  ["eng", "West Ham United", "West Ham"],

  ["esp", "Athletic Bilbao", "Athletic"],
  ["esp", "Deportivo Alavés", "Alavés"],
  ["esp", "FC Barcelona", "Barcelona"],
  ["esp", "RCD Espanyol Barcelona", "Espanyol"],
  ["esp", "Valencia CF", "Valencia"],

  ["fra", "Angers SCO", "SCO Angers"],
  ["fra", "Montpellier HSC", "Montpellier"],
  ["fra", "Olympique Marseille", "Marseille"],
  ["fra", "Paris Saint-Germain", "Paris SG"],
  ["fra", "Stade Rennais FC", "Stade Rennais"],

  ["grc", "AE Kifisia", "AE Kifisias"],
  ["grc", "Aris Thessaloniki", "Aris Saloniki"],
  // Asteras Tripolis has played as Asteras Aktor, its sponsor's name, since 2024.
  ["grc", "Asteras Aktor", "Asteras Tripolis", "Asteras Tripoli"],
  ["grc", "Atromitos Athens", "Atromitos Athen"],
  ["grc", "Levadiakos", "APO Levadiakos"],
  ["grc", "OFI Crete", "OFI Crete FC"],
  ["grc", "Olympiacos Piraeus", "Olympiacos"],
  ["grc", "Panathinaikos", "Panathinaikos FC", "Panathinaikos Athens"],
  ["grc", "Panetolikos", "Panetolikos GFS"],
  ["grc", "Volos NFC", "Volos NPS"],

  ["hrv", "GNK Dinamo Zagreb", "Dinamo Zagreb"],
  ["hrv", "HNK Hajduk Split", "Hajduk Split"],
  ["hrv", "NK Istra 1961", "NK Istra"],

  ["ita", "Juventus FC", "Juventus"],
  ["ita", "SS Lazio", "Lazio"],
  ["ita", "UC Sampdoria", "Sampdoria"],
  ["ita", "US Sassuolo", "Sassuolo"],
  ["ita", "Venezia FC", "Venezia"],

  ["nld", "Ajax Amsterdam", "Ajax"],
  ["nld", "FC Twente Enschede", "Twente Enschede FC"],
  ["nld", "Feyenoord Rotterdam", "Feyenoord"],
  ["nld", "SC Cambuur Leeuwarden", "SC Cambuur-Leeuwarden", "SC Cambuur"],
  ["nld", "SC Heerenveen", "Heerenveen"],
  ["nld", "Vitesse Arnhem", "Vitesse"],
  ["nld", "Willem II Tilburg", "Willem II"],

  // Not the newest spelling: "FK BodøGlimt" drops the space the club's name (Bodø/Glimt) needs.
  ["nor", "FK Bodø Glimt", "FK BodøGlimt"],

  ["pol", "Bruk-Bet Termalica Nieciecza", "Termalica"],
  ["pol", "Jagiellonia Bialystok", "Jagiellonia"],
  ["pol", "Raków Częstochowa", "Rakow Czestochowa"],

  ["prt", "CD Santa Clara", "Santa Clara"],
  ["prt", "CF Estrela Amadora", "CF Estrela Amadora SAD"],
  ["prt", "CS Marítimo", "Marítimo"],
  ["prt", "FC Arouca", "Arouca"],
  ["prt", "GD Estoril Praia", "Estoril Praia"],
  ["prt", "Portimonense SC", "Portimonense"],
  ["prt", "SL Benfica", "Benfica"],
  ["prt", "Vitória Guimarães SC", "Vit. Guimarães"],

  ["rou", "FK Csikszereda Miercurea Ciuc", "AFK Csikszereda Miercurea Ciuc"],
  ["rou", "Universitatea Craiova", "CS Universitatea Craiova"],

  ["rus", "Akron Tolyatti", "Akron Togliatti"],
  ["rus", "FC Khimki", "FK Khimki", "Khimki"],
  ["rus", "FC Krasnodar", "FK Krasnodar", "Krasnodar"],
  ["rus", "FC Orenburg", "FK Orenburg"],
  ["rus", "FC Pari Nizhniy Novgorod", "FK Nizhny Novgorod"],
  ["rus", "FC Rostov", "FK Rostov"],
  ["rus", "FC Sochi", "Sochi"],
  ["rus", "Zenit St. Petersburg", "Zenit S-Pb"],

  ["sco", "Heart of Midlothian FC", "Heart of Midl."],
  ["sco", "Rangers FC", "Rangers"],
  ["sco", "St. Johnstone FC", "St. Johnstone"],
  ["sco", "St. Mirren FC", "St. Mirren"],

  ["srb", "FK Cukaricki", "FK Čukarički", "Cukaricki"],
  ["srb", "FK Mladost Lucani", "Mladost"],
  ["srb", "FK Radnicki 1923 Kragujevac", "Radnicki 1923"],
  ["srb", "FK Radnik Surdulica", "Radnik"],
  ["srb", "FK Spartak Subotica", "Spartak"],
  ["srb", "FK Vozdovac", "Vozdovac"],
  ["srb", "FK Zeleznicar Pancevo", "Zeleznicar Pancevo"],
  ["srb", "Red Star Belgrade", "Red Star"],

  ["swe", "AIK", "AIK Solna"],

  ["tur", "Basaksehir FK", "Istanbul Basaksehir FK", "Basaksehir"],
  ["tur", "Besiktas JK", "Besiktas"],
  ["tur", "Fatih Karagümrük", "Karagümrük"],
  ["tur", "Fenerbahce", "Fenerbahce SK"],
  ["tur", "Galatasaray", "Galatasaray A.S."],

  ["ukr", "Chornomorets Odesa", "Chornomorets Odessa"],
  ["ukr", "FC Oleksandriya", "FK Oleksandriya"],
  ["ukr", "Metalist 1925 Kharkiv", "Metalist 1925"],
  ["ukr", "NK Veres Rivne", "Veres Rivne"],
  ["ukr", "Obolon Kyiv", "FK Obolon Kyiv"],
  ["ukr", "Polissya Zhytomyr", "FK Polissya Zhytomyr"],
  ["ukr", "Shakhtar Donetsk", "Shakhtar D."],
];

/** `<nation>/<Club Name as the dump spells it>` -> slug. */
export const FOOTBALL_LOGOS_OVERRIDES: Readonly<Record<string, string>> = Object.fromEntries(
  SAME_CLUB.flatMap(([nation, name, ...spellings]) =>
    spellings.map((spelling) => [`${nation}/${spelling}`, badgeSlug(name)] as const),
  ),
);
