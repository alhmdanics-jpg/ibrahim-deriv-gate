# IBRAHIM DERIV GATE

Private personal Deriv OAuth gateway. The gateway does not contain a trading strategy and does not execute trades.

## Setup
1. Register an OAuth 2.0 app with Deriv.
2. Obtain `client_id` and `client_secret`.
3. Deploy over HTTPS.
4. Register the exact callback URL `https://YOUR-DOMAIN/callback`.
5. Copy `.env.example` to `.env` and fill the values.
6. Run `npm install` then `npm start`.

The app requests only the `trade` scope. It does not request `payment` or `account_manage`.

After OAuth it opens links to the official Deriv Bot and Deriv sites. Import your XML manually inside Deriv Bot.

Never expose `DERIV_CLIENT_SECRET` in browser code or commit `.env`.
