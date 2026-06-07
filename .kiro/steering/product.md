# CareerPath — Scholarship Finder

CareerPath is a client-side web app that helps students discover and evaluate scholarships. Users can search, filter, and sort a scholarship catalogue, bookmark favourites, share via WhatsApp, and run an Eligibility Gap Analyzer that scores their academic profile against each scholarship's requirements.

## Key Features
- Full-text search across scholarship name, provider, and country
- Filter by degree level, country, type (international/local), and minimum CGPA
- Deadline countdown badges with urgency colouring (red ≤ 30 d, orange ≤ 60 d, green > 60 d)
- Bookmark / saved-filter toggle with localStorage persistence
- Eligibility Gap Analyzer: qualifies, "close" (CGPA gap ≤ 0.5), or disqualifies each scholarship
- Match score bar shown on analyzer results
- WhatsApp share button per card
- Responsive 3 / 2 / 1-column grid

## Target Users
Students (primarily Pakistan-based) looking for local and international scholarships.

## Problem Statement
Every year thousands of Pakistani students miss life-changing scholarships simply because they didn't know they existed. Information is scattered across hundreds of websites, portals, and social media pages. CareerPath solves this by bringing everything to one place.

## Data Coverage
- 40+ local and international scholarships
- Countries: USA, UK, Germany, China, Turkey, Japan, Australia, South Korea and more
- Providers: HEC, PEEF, Fulbright, Chevening, DAAD, Turkish Government, Chinese CSC and more

## Tech Stack
- HTML, CSS, JavaScript (Vanilla)
- JSON data source
- localStorage for bookmarks
- Built entirely using Kiro IDE