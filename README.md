# IBRAHIM DERIV GATE

A private personal gateway for connecting to Deriv through OAuth 2.0.

## Features

- Luxury Black interface
- Gold cinematic design
- Responsive design for phone and desktop
- Login with Deriv
- OAuth 2.0 authorization
- PKCE protection
- Server-side OAuth credentials
- Secure session cookie
- Official Deriv Bot link
- Official Deriv website link
- Logout

## Important

This website is a gateway only.

It does not contain or execute:

- Trading strategies
- HILO logic
- MATCHES logic
- Trading signals
- Martingale
- Automatic trade execution
- Embedded Deriv Bot XML

Trading strategies remain separate and are imported manually into the official Deriv Bot.

## Environment Variables

Configure these variables in the hosting provider:

DERIV_CLIENT_ID=
DERIV_CLIENT_SECRET=
DERIV_REDIRECT_URI=
PORT=3000
SESSION_SECRET=

## Run Locally

Install dependencies:

npm install

Start the server:

npm start

## OAuth Redirect

The Deriv OAuth redirect URI must exactly match the redirect URI registered in the Deriv OAuth application.

## Deployment

The application is designed to run as a Node.js web service.

The server listens on:

0.0.0.0

and uses the port supplied by the hosting provider.

## Official Links

Deriv:

https://deriv.com/

Deriv Bot:

https://bot.deriv.com/
