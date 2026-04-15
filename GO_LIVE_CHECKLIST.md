# Go-Live Checklist

## 1. Backend deployment

- Deploy from this repository using [render.yaml](render.yaml)
- Set these environment variables in your host dashboard:
  - APP_ENV=production
  - API_KEY=<strong-random-secret>
  - DATABASE_URL=<your-postgres-connection-string>
  - ALLOWED_ORIGINS=<your-mobile-web-client-origin-if-needed>
  - ENABLE_HTTPS_REDIRECT=true
  - RATE_LIMIT_PER_MINUTE=120

## 2. Verify backend

After deploy, confirm:

- Health endpoint opens successfully
- Response contains healthy status and the expected database type
- Logs show requests without startup errors

## 3. Mobile production setup

Inside the mobile app, create an environment file from [mobile/.env.example](mobile/.env.example) and set:

- EXPO_PUBLIC_API_URL=https://your-live-backend-url

## 4. Release builds

From the mobile folder you can use:

- npm run eas:build:android
- npm run eas:build:ios
- npm run eas:submit:android
- npm run eas:submit:ios

## 5. Final checks

- Test sign in and stock search
- Test portfolio save/load
- Test alerts and news endpoints
- Confirm production database persistence
- Confirm no localhost URLs remain in the release app
