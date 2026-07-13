# PixCraft

AI-powered web app that transforms your photo into designed templates — festival greetings, ID cards, birthday posters, and professional banners — using Gemini image generation.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## Overview

PixCraft lets a user upload a personal photo and instantly generate it into one of several pre-designed templates. Instead of manual editing, the app uses Gemini's image generation model to intelligently compose the photo into the chosen design — no design skills required.

## Features

- **Photo-to-template generation** — upload a photo, pick a template, get a designed result in seconds
- **Four template styles** — Festival Greeting, Professional ID Card, Birthday Poster, LinkedIn Banner
- **Face and object modes** — choose whether the upload is a face photo or a general subject, so composition adapts accordingly
- **Multiple result variations** — generates two options per request so you can pick your favorite
- **Authentication** — email/password and Google sign-in via Firebase Auth
- **Persistent usage tracking** — every generation is logged to Firestore, with an admin dashboard for activity insights
- **Download & share** — save or copy the finished image directly from the app
- **Graceful error handling** — clear, friendly messages for failed uploads, rate limits, and generation errors, with retry support

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js |
| Authentication | Firebase Authentication |
| Database | Firestore |
| AI / Image Generation | Google Gemini API (`gemini-2.5-flash-image`) |
| Hosting | Google Cloud Run / Render |

## Architecture

```
User uploads photo
      │
      ▼
React frontend (template picker, mode selector)
      │
      ▼
Node.js backend (API key stays server-side only)
      │
      ▼
Gemini API — generates templated image
      │
      ▼
Result returned to user → download / copy / regenerate
      │
      ▼
Generation logged to Firestore (user, template, status)
```

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- A Firebase project with Authentication and Firestore enabled
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Installation

```bash
git clone https://github.com/yourusername/pixcraft.git
cd pixcraft
npm install
```

### Environment Variables

Create a `.env` file in the project root (never commit this file):

```
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
```

### Run locally

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Deployment

PixCraft is deployed via [Google Cloud Run](https://cloud.google.com/run) through AI Studio's Starter Tier, with an alternative deployment path supported on [Render](https://render.com).

**Important:** When deploying to a new domain, add it to Firebase Console → Authentication → Settings → Authorized domains, or sign-in will fail.

## Known Limitations

- Generated output can vary between attempts, since it relies on generative AI rather than a fixed template engine
- Free-tier API usage is rate-limited; high traffic may occasionally show a "high demand" message
- Best results come from clear, well-lit photos

## Roadmap

- [ ] Additional template styles
- [ ] User generation history page
- [ ] Style intensity / color customization controls

## License

This project is licensed under the MIT License.

## Author

Built by Rajesh — [GitHub](https://github.com/yourusername) · [Portfolio](#)
