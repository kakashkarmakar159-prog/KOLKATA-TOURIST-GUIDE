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
