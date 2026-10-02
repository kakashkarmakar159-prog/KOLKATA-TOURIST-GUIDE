# KOLKATA TOURIST GUIDE — Restaurant/Hotel Edit Save

## What changed

The Edit page now has two modes:

1. **Node/Express server mode (persistent)**
   - Edit ID is verified by the server.
   - Edit -> Save sends `PUT /api/admin/entity`.
   - The server writes the updated restaurant/hotel back to the site's JSON data files.
   - The change remains after browser refresh and is available to other users of the same server.
   - A `.bak` backup is created before the data files are replaced.

2. **GitHub Pages/static mode**
   - GitHub Pages cannot write files on the server.
   - Therefore the existing static fallback stores edits in that browser's `localStorage`.
   - This is NOT a shared database.

## For real shared saving

Run the project with Node/Express on a server:

```bash
npm install
npm start
```

Then open the Edit page from that server URL.

If the website itself is hosted on GitHub Pages, the Edit page cannot directly change
the GitHub repository's JSON files. For shared editing from GitHub Pages, deploy the
Node/Express backend separately and connect the frontend to that backend URL.

## Important

Do not put the master Edit ID in client-side JavaScript for production. Set:

```text
KTG_ADMIN_ID=your-secret-master-id
```

in the server environment.
