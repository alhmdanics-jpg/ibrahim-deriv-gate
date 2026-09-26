import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

const PORT = Number(
  process.env.PORT || 3000
);

const CLIENT_ID =
  process.env.DERIV_CLIENT_ID;

const REDIRECT_URI =
  process.env.DERIV_REDIRECT_URI;

const SESSION_SECRET =
  process.env.SESSION_SECRET;

const sessions = new Map();
const pending = new Map();


function reqEnv(name, value) {

  if (
    !value ||
    value.startsWith("YOUR_") ||
    value.includes("YOUR-REPLIT-DOMAIN")
  ) {

    throw new Error(
      `Missing or placeholder environment variable: ${name}`
    );

  }

}


function b64(buffer) {

  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

}


function rnd(n = 32) {

  return b64(
    crypto.randomBytes(n)
  );

}


function challenge(value) {

  return b64(
    crypto
      .createHash("sha256")
      .update(value)
      .digest()
  );

}


function sig(value) {

  return crypto
    .createHmac(
      "sha256",
      SESSION_SECRET
    )
    .update(value)
    .digest("hex");

}


function setSession(res, id) {

  res.setHeader(
    "Set-Cookie",
    `ibrahim_session=${id}.${sig(id)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`
  );

}


function getSession(req) {

  const match =
    (req.headers.cookie || "").match(
      /(?:^|;\s*)ibrahim_session=([^;]+)/
    );

  if (!match) {
    return null;
  }

  const [id, signature] =
    match[1].split(".");

  if (!id || !signature) {
    return null;
  }

  const expected = sig(id);

  if (
    signature.length !==
      expected.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  ) {

    return null;

  }

  return (
    sessions.get(id) || null
  );

}


app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);

app.use(
  "/bot",
  express.static(
    path.join(
      __dirname,
      "public",
      "bot"
    )
  )
);

app.get(
  "/bot",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "public",
        "bot",
        "index.html"
      )
    );
  }
);

app.get(
  "/auth/deriv",
  async (_req, res) => {

    try {

      reqEnv(
        "DERIV_CLIENT_ID",
        CLIENT_ID
      );

      reqEnv(
        "DERIV_REDIRECT_URI",
        REDIRECT_URI
      );

      reqEnv(
        "SESSION_SECRET",
        SESSION_SECRET
      );


      const state =
        rnd(32);

      const verifier =
        rnd(48);


      pending.set(
        state,
        {
          verifier,
          createdAt:
            Date.now()
        }
      );


      const url =
        new URL(
          "https://auth.deriv.com/oauth2/auth"
        );


      url.searchParams.set(
        "response_type",
        "code"
      );


      url.searchParams.set(
        "client_id",
        CLIENT_ID
      );


      url.searchParams.set(
        "redirect_uri",
        REDIRECT_URI
      );


      url.searchParams.set(
        "scope",
        "trade"
      );


      url.searchParams.set(
        "state",
        state
      );


      url.searchParams.set(
        "code_challenge",
        challenge(verifier)
      );


      url.searchParams.set(
        "code_challenge_method",
        "S256"
      );


      res.redirect(
        url.toString()
      );


    } catch (error) {

      res
        .status(500)
        .send(
          `OAuth configuration error: ${error.message}`
        );

    }

  }
);


app.get(
  "/callback",
  async (req, res) => {

    try {

      const {
        code,
        state,
        error
      } = req.query;


      if (error) {

        return res.redirect(
          `/?error=${encodeURIComponent(
            String(error)
          )}`
        );

      }


      if (!code || !state) {

        return res
          .status(400)
          .send(
            "Missing OAuth code or state."
          );

      }


      const pendingRequest =
        pending.get(state);


      pending.delete(state);


      if (
        !pendingRequest ||
        Date.now() -
          pendingRequest.createdAt >
          600000
      ) {

        return res
          .status(400)
          .send(
            "Invalid or expired OAuth state."
          );

      }


      reqEnv(
        "DERIV_CLIENT_ID",
        CLIENT_ID
      );


      reqEnv(
        "DERIV_REDIRECT_URI",
        REDIRECT_URI
      );


      const tokenResponse =
        await fetch(
          "https://auth.deriv.com/oauth2/token",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded"
            },

            body:
              new URLSearchParams({

                grant_type:
                  "authorization_code",

                code:
                  String(code),

                client_id:
                  CLIENT_ID,

                redirect_uri:
                  REDIRECT_URI,

                code_verifier:
                  pendingRequest.verifier

              })

          }
        );


      const data =
        await tokenResponse.json();


      if (!tokenResponse.ok) {

        return res
          .status(502)
          .send(
            `Deriv token exchange failed: ${JSON.stringify(
              data
            )}`
          );

      }


      const sessionId =
        rnd(32);


      sessions.set(
        sessionId,
        {
          connectedAt:
            Date.now(),

          tokenData:
            data
        }
      );


      setSession(
        res,
        sessionId
      );


      res.redirect(
        "/connected.html"
      );


    } catch (error) {

      res
        .status(500)
        .send(
          `OAuth callback error: ${error.message}`
        );

    }

  }
);


app.get(
  "/api/status",
  (req, res) => {

    const session =
      getSession(req);


    res.json({

      connected:
        Boolean(session),

      connectedAt:
        session?.connectedAt ||
        null

    });

  }
);
app.get(
  "/api/bot-auth",
  async (req, res) => {

    try {

      const session = getSession(req);

      if (!session) {
        return res
          .status(401)
          .json({
            error: "Not authenticated"
          });
      }

      const accessToken =
        session.tokenData?.access_token;

      if (!accessToken) {
        return res
          .status(401)
          .json({
            error: "Missing Deriv access token"
          });
      }

      const response =
        await fetch(
        "https://oauth.deriv.com/oauth2/legacy/tokens",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${accessToken}`
            }
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        return res
          .status(502)
          .json({
            error:
              "Failed to get Deriv bot tokens",
            details: data
          });
      }

      return res.json(data);

    } catch (error) {

      return res
        .status(500)
        .json({
          error:
            "Bot authentication error",
          details:
            error.message
        });

    }

  }
);


app.post(
  "/logout",
  (req, res) => {

    const match =
      (req.headers.cookie || "").match(
        /(?:^|;\s*)ibrahim_session=([^;]+)/
      );


    if (match) {

      const sessionId =
        match[1].split(".")[0];

      sessions.delete(
        sessionId
      );

    }


    res.setHeader(
      "Set-Cookie",
      "ibrahim_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
    );


    res.json({
      ok: true
    });

  }
);


app.get(
  "/health",
  (_req, res) => {

    res.json({

      ok: true,

      service:
        "IBRAHIM DERIV GATE"

    });

  }
);


app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `IBRAHIM DERIV GATE listening on ${PORT}`
    );

  }
);
