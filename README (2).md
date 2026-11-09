# Kolkata Tourist Guide

Starter website based on the requested design and feature flow.

## Current structure
- Home/search page
- Six starter places in `public/data/places.json`
- Location permission after search
- Place details interface
- Name prompt before group chat
- Real-time group chat using Socket.IO
- Live location sharing foundation using Socket.IO
- Dark/light mode
- Share button
- Google Maps button
- Hotel/restaurant image hooks
- Metro booking URL hook

## Run
1. Install Node.js.
2. Open this folder in VS Code.
3. Run:
   `npm install`
4. Run:
   `npm start`
5. Open:
   `http://localhost:3000`

## Important
The six places currently have placeholder detail fields so you can fill in your own data later.

For production live maps, connect `map.html` to a map provider and add latitude/longitude to each place. The current Socket.IO layer is already prepared for group location events.

## GitHub Pages
This package is prepared for a repository project site such as `/KTG/`. The contents of `public/` are moved to the repository root, `.nojekyll` is included, and `/data/places.json` is loaded using project-relative URLs. Admin hotel/restaurant edits are stored in browser localStorage in static mode because GitHub Pages cannot run the Express server or write back to JSON files. For shared server-side persistence, run the existing Node/Express server on a server host.


## Edit/Save persistence
The Edit system writes changes to the JSON place-data files when the Node/Express server is running. GitHub Pages remains static and uses browser-only fallback storage unless a separate backend is configured. See `EDIT_SAVE_SETUP.md`.


## User profiles and personal Gemini AI

- On first visit, each browser asks the visitor to create a local profile with a display name and optional profile photo.
- Profile photos are resized/compressed in the browser and stored at no more than 300 KB.
- The profile name and photo are reused in the group chat; the name is not requested again on that browser.
- The visitor may add their own Gemini API key and model from the Profile button. The key is stored only in that browser's local storage and is sent directly from that browser to Google's Gemini API when the visitor uses the place AI chat. The KTG server does not store visitors' Gemini keys. Do not save a personal API key on a shared/public device.
- Location permission is requested after first profile creation. Location remains optional; features requiring it need browser permission and a secure context (HTTPS or localhost).
- These local profiles are browser/device profiles, not verified accounts. Clearing browser data or changing browser/device removes access to that local profile. Cross-device accounts require a separate authentication/database service.
