# Friluftskompis — Prosjektoversikt

Hackathon 2026-prosjekt. Én app for hele planleggingen av friluftsturer — fra idé til oppgjør.

## Problem

Turplanlegging lever i dag i 10+ separate tjenester: Yr (vær), UT.no (ruter), DNT/iNatur (hytter), Google Maps (kjøretid), Entur (kollektivt), Google Docs (pakkeliste), Excel (kostnader) — pluss en uoversiktlig gruppechat. Ingen av dem håndterer gruppebeslutninger. Planen endrer seg dynamisk (vær snur, hytte fullbooket, én person faller fra).

## Løsning

Friluftskompis er én flate der hele planleggingsreisen skjer. Aldri lenk ut til eksterne tjenester når man kan integrere dem. Alltid data i kontekst av turen. AI forenkler — legger ikke til flere valg.

## Fire scenarioer

| Scenario | Bruker | Tur |
|----------|--------|-----|
| Vennegjengen | Kari (34), Ola, Marie | Helgetur Rondane, mars |
| Hytteruta | Eirik (52) + 3 venner | 5 dager Jotunheimen, juli |
| Familien | Henrik + Silje, barn 8+11 år | 2 uker familiehytte Hemsedal |
| Spontanturen | Morten (28) | Dagstur lørdag morgen |

## Brukerreisens 6 faser

### 1. Discover
Finn tur via kart, wizard eller klassiske ruter. Topografisk kart med DNT-hytter + kommersielle hytter. Søk med autofullfør. Alderstilpassede forslag for familier.

### 2. Decide
Værvarsel (Yr), hytte-tilgjengelighet (inkl. kjede-tilgjengelighet for flerdagsturer), ruteplanlegging med høydemeter per etappe, dag-for-dag-tidslinje, snø/skredvarsel (Varsom), kjøretid og kollektivrute (Entur). AI foreslår optimale datoer og omplanlegger når været snur.

### 3. Gather
Inviter via delbar lenke (ingen app-installering). Deltakerprofiler med erfaringsnivå. Stemming på alternativer. Deltidsdeltakere (kun noen dager). Kjørekoordinering. AI-kompromissforslag ved fastlåste diskusjoner.

### 4. Prepare
AI-generert pakkeliste basert på vær, varighet og gruppe. Fordeling av fellesutstyr med avkvittering. Matplan per etappe. Samlet handleliste. Estimert bærevekt per person.

### 5. Go
Offline-kart og navigasjon. GPX-eksport til klokke. Parkeringskoordinater. Delt posisjon (opt-in). Nødkontakter offline. ETA-deling for soloturere.

### 6. Return
Kostnadssplit med Vipps-integrasjon. Delt bildealbum. Turhistorikk og statistikk. «Gjenta denne turen» gjenbruker rute og deltakere med nye datoer.

## AI-bruk

- Pakkeliste generert fra vær + varighet + gruppe + erfaring
- Turforslag fra område + dato + aktivitetsnivå
- Omplanleggingsforslag når vær endrer seg
- Hytte-sammenligning
- Rutevurdering opp mot gruppas nivå
- Kompromissforslag ved uenighet

**Prinsipp:** AI-generert innhold alltid tydelig merket. Alltid vist som forslag, aldri som fakta.

## Brukerroller

| Rolle | Beskrivelse |
|-------|-------------|
| Turplanlegger | Starter tur, tar hovedansvar |
| Turdeltaker | Invitert, ikke initiativtaker |
| Soloturer | Planlegger og går alene |
| Gruppeleder | Koordinerer logistikk og kostnader |
| Administrator | Systemrolle, API-nøkler og konfigurasjon |

## MVP (9 brukerhistorier)

| ID | Fase | Beskrivelse |
|----|------|-------------|
| D1 | Discover | Fritekstsøk med autofullfør |
| D2 | Discover | DNT-hytter på topografisk kart |
| B1 | Decide | Værvarsel for turperioden |
| B3 | Decide | Foreslått rute mellom hytter med etappedata |
| B6 | Decide | Dag-for-dag-tidslinje |
| G1 | Gather | Inviter deltakere via delbar lenke |
| P1 | Prepare | AI-generert pakkeliste |
| T1 | Go | Offline-kart og ruteinformasjon |
| R1 | Return | Utgiftsregistrering og splitt |

Disse 9 gir sammenhengende flyt: søk → kart+vær → rute+tidslinje → inviter → pakkeliste → naviger offline → gjør opp.

## Datakilder

Yr, Kartverket, DNT, iNatur, AirBnB, Varsom, Entur, Vegvesenet, Google Maps, Vipps

## Brukerhistorier (komplett)

Alle brukerhistorier er organisert etter fase med prioritet (Høy/Medium/Lav) og Gitt/Når/Så-akseptansekriterier. Se `Brukerhistorier.docx` for fullstendig liste (~60 historier).

**Prioritering per fase:**
- **Discover:** D1, D2, D11 = Høy; D3–D10 = Medium
- **Decide:** B1, B2, B2b, B3, B6, B10, B10b, B13 = Høy; B4, B7, B8, B11, B11b, B12, B14 = Medium; B5, B9 = Lav
- **Gather:** G1, G4 = Høy; G2, G3, G5, G6, G7, G8, G10 = Medium; G9 = Lav
- **Prepare:** P1, P2 = Høy; P1b, P3, P5, P5b = Medium; P4, P6, P7 = Lav
- **Go:** T1, T6, T8 = Høy; T2, T5 = Medium; T3, T4, T7 = Lav
- **Return:** R1 = Medium; R1b, R2, R4, R5, R6 = Lav; R3 = Medium
- **System:** S1, S2, S3 = Høy
