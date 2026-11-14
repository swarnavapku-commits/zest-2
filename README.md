<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/eeed967d-765a-4a26-9ab7-fb534b350721

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
3. Open the app, click the gear icon (Settings) and paste your own Gemini API key. It is stored only in your browser.


## Deploy (Vercel / Netlify / any static host)

- Build command: `npm run build`, output directory: `dist`.
- No backend is required: AI calls run in the browser with each user's own Gemini key; data syncs through Firestore.
- For Google sign-in, add your site's domain in Firebase Console > Authentication > Settings > Authorized domains.
