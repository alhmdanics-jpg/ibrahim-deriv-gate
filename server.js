import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
dotenv.config();

const app=express(), __dirname=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const CLIENT_ID=process.env.DERIV_CLIENT_ID, CLIENT_SECRET=process.env.DERIV_CLIENT_SECRET;
const REDIRECT_URI=process.env.DERIV_REDIRECT_URI, SESSION_SECRET=process.env.SESSION_SECRET;
const sessions=new Map(), pending=new Map();

function reqEnv(n,v){if(!v||v.startsWith("YOUR_")||v.includes("YOUR-REPLIT-DOMAIN"))throw Error(`Missing or placeholder environment variable: ${n}`)}
function b64(b){return b.toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
function rnd(n=32){return b64(crypto.randomBytes(n))}
function challenge(v){return b64(crypto.createHash("sha256").update(v).digest())}
function sig(v){return crypto.createHmac("sha256",SESSION_SECRET).update(v).digest("hex")}
function setSession(res,id){res.setHeader("Set-Cookie",`ibrahim_session=${id}.${sig(id)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`)}
function getSession(req){
  const m=(req.headers.cookie||"").match(/(?:^|;\\s*)ibrahim_session=([^;]+)/); if(!m)return null;
  const [id,s]=m[1].split("."); if(!id||!s)return null;
  const expected=sig(id); if(s.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(expected)))return null;
  return sessions.get(id)||null;
}
app.use(express.static(path.join(__dirname,"public")));

app.get("/auth/deriv",async(_req,res)=>{
  try{
    reqEnv("DERIV_CLIENT_ID",CLIENT_ID); reqEnv("DERIV_CLIENT_SECRET",CLIENT_SECRET);
    reqEnv("DERIV_REDIRECT_URI",REDIRECT_URI); reqEnv("SESSION_SECRET",SESSION_SECRET);
    const state=rnd(32), verifier=rnd(48);
    pending.set(state,{verifier,createdAt:Date.now()});
    const u=new URL("https://auth.deriv.com/oauth2/auth");
    u.searchParams.set("response_type","code"); u.searchParams.set("client_id",CLIENT_ID);
    u.searchParams.set("redirect_uri",REDIRECT_URI); u.searchParams.set("scope","trade");
    u.searchParams.set("state",state); u.searchParams.set("code_challenge",challenge(verifier));
    u.searchParams.set("code_challenge_method","S256"); res.redirect(u.toString());
  }catch(e){res.status(500).send(`OAuth configuration error: ${e.message}`)}
});

app.get("/callback",async(req,res)=>{
  try{
    const {code,state,error}=req.query;
    if(error)return res.redirect(`/?error=${encodeURIComponent(String(error))}`);
    if(!code||!state)return res.status(400).send("Missing OAuth code or state.");
    const p=pending.get(state); pending.delete(state);
    if(!p||Date.now()-p.createdAt>600000)return res.status(400).send("Invalid or expired OAuth state.");
    reqEnv("DERIV_CLIENT_ID",CLIENT_ID); reqEnv("DERIV_CLIENT_SECRET",CLIENT_SECRET); reqEnv("DERIV_REDIRECT_URI",REDIRECT_URI);
    const r=await fetch("https://auth.deriv.com/oauth2/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({grant_type:"authorization_code",code:String(code),client_id:CLIENT_ID,client_secret:CLIENT_SECRET,redirect_uri:REDIRECT_URI,code_verifier:p.verifier})});
    const data=await r.json(); if(!r.ok)return res.status(502).send(`Deriv token exchange failed: ${JSON.stringify(data)}`);
    const id=rnd(32); sessions.set(id,{connectedAt:Date.now(),tokenData:data}); setSession(res,id); res.redirect("/connected.html");
  }catch(e){res.status(500).send(`OAuth callback error: ${e.message}`)}
});

app.get("/api/status",(req,res)=>{const s=getSession(req);res.json({connected:Boolean(s),connectedAt:s?.connectedAt||null})});
app.post("/logout",(req,res)=>{
  const m=(req.headers.cookie||"").match(/(?:^|;\\s*)ibrahim_session=([^;]+)/); if(m){sessions.delete(m[1].split(".")[0])}
  res.setHeader("Set-Cookie","ibrahim_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"); res.json({ok:true});
});
app.get("/health",(_req,res)=>res.json({ok:true,service:"IBRAHIM DERIV GATE"}));
app.listen(PORT,()=>console.log(`IBRAHIM DERIV GATE listening on ${PORT}`));
