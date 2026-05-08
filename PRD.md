# Product Requirements Document — Friluftskompis

**Version:** 0.1 (Draft)  
**Date:** 2026-05-08  
**Status:** In Progress

---

## 1. Overview

**Friluftskompis** ("Outdoor Companion") is a Norwegian mobile-first application that makes planning, coordinating, and executing outdoor hiking and cabin trips dramatically easier. It combines topographic maps, real-time weather, AI-powered recommendations, group coordination tools, and trip logistics into one seamless experience — from the first spark of inspiration through to post-trip memories and expense settlement.

---

## 2. Problem Statement

Planning a hiking or cabin trip in Norway involves juggling a fragmented set of tools and information sources: separate apps for maps, weather, cabin availability, transport, packing, and group coordination. This leads to:

- Lost time hunting across multiple platforms
- Poor group alignment on dates, routes, and logistics
- Inadequate preparation (packing, food, safety)
- Friction during the trip itself (navigation, safety, expense tracking)
- No single place for post-trip memories and reuse

Friluftskompis consolidates all of these into a single, intelligent companion.

---

## 3. Target Users / Personas

| Persona | Description |
|---|---|
| **Kari — Turplanlegger** (Trip Planner) | Initiates and organizes trips for a group. Needs to search routes, check availability, coordinate participants, and handle logistics. |
| **Henrik — Gruppeleder** (Group Leader) | Manages the group during the trip. Needs navigation, safety tools, and real-time coordination. |
| **Eirik — Turdeltaker** (Trip Participant) | Joins trips organized by others. Needs to see their personal packing list, vote on options, and track expenses. |
| **Morten — Soloturer** (Solo Hiker) | Plans and executes solo trips. Needs safety features, offline access, and personal trip history. |
| **System — Administrator** | Manages API integrations, data sources, and system configuration for the platform. |

---

## 4. Goals & Success Metrics

### Product Goals
- Reduce the time to plan a complete multi-day group trip from hours to minutes.
- Increase confidence and safety for hikers through better pre-trip preparation and on-trail tools.
- Make group coordination (invites, voting, splitting costs) frictionless.

### Key Metrics (to be defined with data targets)
- Time from app open to complete trip plan created
- Group invitation acceptance rate
- Packing list completion rate before departure
- DAU/MAU ratio
- Expense settlement completion rate post-trip
- User retention (trips planned per user per season)

---

## 5. User Journey & Feature Requirements

The product is structured around **7 phases** of the trip lifecycle:

---

### Phase 1 — Discover

*Users explore and find trip inspiration.*

| ID | Feature | Priority |
|---|---|---|
| D1 | Search by area, cabin name, or mountain peak | High (MVP) |
| D2 | Topographic Norway map with DNT cabins as a map layer | High (MVP) |
| D2b | Commercial cabins from iNatur and AirBnB as an additional map layer alongside DNT cabins | Medium |
| D11 | Selected route drawn on map with elevation profile, distance, and estimated time | High |
| D3 | Trip suggestions based on area, duration, level, and number of persons via a wizard | High |
| D4 | Predefined classic cabin routes as curated suggestions | Medium |
| D5 | Nearby day-trip suggestions based on position and weather | Medium |
| D6 | Filter trips by category (day trip, weekend, family-friendly, ski, paddling) | Medium |
| D7 | Save trips to lists and browse lists others have shared | Medium |
| D8 | Trip suggestions weighted against personal trip history and profile preferences | Medium |
| D9 | Age-appropriate suggestions when the group includes children | Medium |
| D10 | Create a holiday plan with multiple days and varied activities (day trips, paddling, excursions) | Medium |

---

### Phase 2 — Decide

*Users evaluate options and lock in a plan.*

| ID | Feature | Priority |
|---|---|---|
| B1 | Weather forecast for selected location and period | High (MVP) |
| B3 | Route planning between cabins with distance, time, and elevation per leg | High (MVP) |
| B6 | Day-by-day view for multi-day trips | High (MVP) |
| B7 | Snow conditions, avalanche warnings, and markings for routes and areas | Medium |
| B9 | Real-time weather (NowCast) for an area in addition to the forecast | Low |
| B4 | Drive time and public transport route to the trailhead | Medium |
| B5 | Cost estimate per person per day | Low |
| B8 | AI assessment of whether the route is realistic for the group | Medium |
| B12 | Proceed to purchase a recommended public transport journey from the trip plan | Medium |
| B2 | Check availability for individual cabins on selected dates | High |
| B2b | Check chain availability for all cabins in a multi-day route simultaneously | High |
| B11 | Book or reserve directly from the app where API access exists | Medium |
| B11b | Deep-link to the provider's booking page with date and number of guests pre-filled when direct booking is unavailable | Medium |
| B13 | Suggest optimal dates based on weather forecast and cabin availability | High |
| B14 | AI-generated comparison of cabins in an area | Medium |
| B10 | Proactive replanning suggestion when the weather forecast changes significantly | High |
| B10b | Accept a replanning suggestion and have the timeline, packing list, and participant notifications updated automatically | High |

---

### Phase 3 — Gather

*Users coordinate with their group.*

| ID | Feature | Priority |
|---|---|---|
| G1 | Create a trip and invite participants via a shareable link | High (MVP) |
| G3 | Sign up for parts of a trip | Medium |
| G4 | See who has responded, who is pending, and who has declined | High |
| G5 | A comment thread per trip where the group can discuss details | Medium |
| G8 | Alternative route and meeting point when a participant joins only part of a multi-day trip | Medium |
| G9 | Invite someone to "drop in" on a specific day or leg mid-trip | Low |
| G2 | Vote on alternatives when the group disagrees on date or cabin | Medium |
| G7 | AI-generated compromise suggestion when the group cannot agree | Medium |
| G6 | Register preferences and experience level in a participant profile | Medium |
| G10 | Coordinate driving to the trailhead — who drives, who is a passenger, who needs a pickup | Medium |

---

### Phase 4 — Prepare

*Users get ready for departure.*

| ID | Feature | Priority |
|---|---|---|
| P1 | AI-generated packing list based on weather, duration, and number of persons | High (MVP) |
| P1b | Packing list automatically updated when weather, plan, or group composition changes | Medium |
| P2 | Distribute gear across the group with confirmation check-off | High |
| P3 | Personal packing list showing both own items and assigned shared items | Medium |
| P5 | AI-generated meal plan per leg with quantities scaled to number of participants | Medium |
| P5b | Combined shopping list from the meal plan with distribution of shopping responsibility | Medium |
| P6 | Estimated carry weight per person based on packing list, food, and shared gear | Low |
| P7 | Combined pre-purchase list for consumables beyond food (gas, batteries, first aid, etc.) | Low |
| P4 | Set reminders X days before departure | Low |

---

### Phase 5 — Go

*Users are on the trail.*

| ID | Feature | Priority |
|---|---|---|
| T1 | Access to offline maps and route info for assigned legs | High (MVP) |
| T2 | Parking info and coordinates for the trailhead | Medium |
| T5 | Export GPX route to watch or other GPS device | Medium |
| T8 | Follow the route in real time with compass and directional guidance to next waypoint | High |
| T6 | Emergency contacts and emergency phone numbers available offline | High |
| T7 | Share estimated arrival time with a contact person | Low |
| T3 | Share position with the group during the trip | Low |
| T4 | Check in on arrival at a cabin | Low |

---

### Phase 6 — Return

*Users wrap up after the trip.*

| ID | Feature | Priority |
|---|---|---|
| R1 | Register expenses along the way and get a fair split calculation | Medium (MVP) |
| R1b | Send payment requests via Vipps directly from the app | Low |
| R2 | Upload photos to a shared trip album | Low |
| R3 | Reuse a previous trip as a template for next year | Medium |
| R4 | View trip history and statistics for completed trips | Low |
| R5 | Write a short review of the trip and share it with the community | Low |
| R6 | View graphical elevation profile and aggregate statistics for completed trips | Low |

---

### Phase 7 — System & Administration

*Backend and platform requirements.*

| ID | Feature | Priority |
|---|---|---|
| S1 | Configure API keys and data source access for all integrations | High |
| S2 | Provide fallback data when an external API is down or unavailable | High |
| S3 | Clear distinction for the user when AI is suggesting something versus when data is factual | High |

---

## 6. MVP Scope

The MVP focuses on delivering the core end-to-end trip planning loop for a group. The following 9 stories are prioritised for the first release:

| ID | Feature |
|---|---|
| D1 | Search by area, cabin name, or mountain peak |
| D2 | Topographic Norway map with DNT cabins |
| B1 | Weather forecast for selected location and period |
| B3 | Route planning between cabins (distance, time, elevation per leg) |
| B6 | Day-by-day view for multi-day trips |
| G1 | Create a trip and invite participants via shareable link |
| P1 | AI-generated packing list (weather, duration, group size) |
| T1 | Offline maps and route info |
| R1 | Expense tracking and fair split calculation |

All MVP stories are currently in **Not Ready** status and require refinement before development can begin.

---

## 7. Key Integrations & Data Sources

| Source | Purpose |
|---|---|
| DNT (Den Norske Turistforening) | Cabin data, route data, availability |
| Yr / NowCast (MET Norway) | Weather forecasts and real-time conditions |
| Varsom / Avalanche API | Avalanche warnings and snow conditions |
| iNatur | Commercial cabin listings |
| AirBnB API | Commercial accommodation layer |
| Public transport APIs | Route and cost to trailhead |
| Vipps | In-app payment requests for expense splits |
| GPS / Map providers | Topographic base map, routing, offline tiles |

---

## 8. AI Features

Friluftskompis makes significant use of AI to reduce planning friction. All AI-generated content must be clearly labelled as such (see S3):

- **Trip suggestions** — weighted by profile, history, group composition
- **Packing list generation** — based on weather, duration, number of persons
- **Meal plan generation** — with quantities and shopping list
- **Route feasibility assessment** — is this route realistic for this group?
- **Cabin comparison** — AI-generated summary of options in an area
- **Date optimisation** — optimal dates based on weather + availability
- **Compromise suggestions** — when the group cannot agree on a date or cabin
- **Proactive replanning** — suggestions triggered by significant weather changes

---

## 9. Non-Functional Requirements

- **Offline-first:** Core navigation, maps, emergency contacts, and packing lists must function without a network connection.
- **Performance:** Map rendering and search results must feel snappy on mid-range mobile hardware.
- **Accessibility:** UI must meet WCAG 2.1 AA standards.
- **Privacy:** Location data shared between participants requires explicit opt-in.
- **Resilience:** Graceful degradation when external APIs (weather, cabin availability) are unavailable (see S2).
- **AI transparency:** Every AI-generated output must be visually distinguished from factual data (see S3).

---

## 10. Out of Scope (for now)

- International trips outside Norway
- Equipment rental or purchasing integrations
- Social/community features beyond shared lists and trip reviews
- Integration with fitness trackers or health data

---

## 11. Open Questions

1. What is the primary mobile platform target — iOS, Android, or both simultaneously?
2. Will the app require user accounts, or can some features be used without registration (e.g., shared trip links)?
3. What is the commercial model — freemium, subscription, or partnership with DNT/cabin providers?
4. Who are the key API partners already confirmed vs. still to be negotiated?
5. What defines "Not Ready" for MVP stories — is there a definition of ready/done to align on?
6. What are the target markets beyond Norway — e.g., Sweden, Finland?

---

*This PRD is based on the Friluftskompis user story map (Avion) and is intended as a foundation for implementation planning.*
