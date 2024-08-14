//  Author: Daragh Sweeney
//  Project: Large Music Data Visualization
//  server.js: this is the main server file that controls the application

import express from 'express';
import fetch from 'node-fetch';
import session from 'express-session';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { env } from 'node:process';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(session({secret: 'your-secret-key',resave: false,saveUninitialized: true,cookie: { secure: false }}));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(__dirname));


// function to get the local IP of the machine
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '0.0.0.0';
}


// set up the hompage url and add spotify credentials
const localIP = getLocalIP();
const localPort = 3000;
const hostname = env.REDIRECT_HOSTNAME || `${localIP}:${localPort}`;
const redirect_uri = `http://${hostname}/callback`;
const client_id = await fs.readFile('/run/secrets/spotify-client_id', { encoding: 'utf8' });
const client_secret = await fs.readFile('/run/secrets/spotify-client_secret', { encoding: 'utf8' });

app.get("/", (req, res) => {
  res.render("index");
});


// set up the route to the spotify authorisation process
app.get("/authorize", (req, res) => {
  var auth_query_parameters = new URLSearchParams({
    response_type: "code",
    client_id: client_id,
    scope: "user-library-read",
    redirect_uri: redirect_uri,
  });

  res.redirect("https://accounts.spotify.com/authorize?" + auth_query_parameters.toString());
});


//
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  var body = new URLSearchParams({
    code: code,
    redirect_uri: redirect_uri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "post",
    body: body,
    headers: {
      "Content-type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
  });

  const data = await response.json();
  req.session.access_token = data.access_token;

  res.redirect("/dashboard");
});


// This is a helper function that will make calls to the spotify API
async function getData(endpoint, access_token) {
  try {
    const response = await fetch("https://api.spotify.com/v1" + endpoint, {
      method: "get",
      headers: { Authorization: "Bearer " + access_token },
    });

    if (!response.ok) {
      // Check if the access token is invalid or expired
      if (response.status === 401) {
        throw new Error("Invalid or expired access token");
      }
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}


// This is the route to the dashboard page
app.get("/dashboard", async (req, res) => {

  const access_token = req.session.access_token;
  if (!access_token) {return res.redirect('/');}

  // get users info and tracks from the spotify API and pass into the dashboard page
  const userInfo = await getData("/me", access_token);
  const tracks = await getData("/me/tracks?limit=50", access_token);
  res.render("dashboard", { user: userInfo, tracks: tracks.items });
});





// The
app.get('/getGenre', (req, res) => {
  const { previewUrl } = req.query;

  if (!previewUrl) {return res.status(400).send('Missing previewUrl parameter');}

  const pythonPath = 'python3';  // Update to your correct Python path
  const scriptPath = path.join(__dirname, '/models/getGenre.py');
  const pythonProcess = spawn(pythonPath, [scriptPath, previewUrl]);

  let pythonOutput = '';

  pythonProcess.stdout.on('data', (data) => {pythonOutput += data.toString();});

  pythonProcess.stdout.on('end', () => {
    console.log(`Python script output: ${pythonOutput}`);
    res.send(pythonOutput);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Error from Python script: ${data}`);
    // res.status(500).send(`Error from Python script: ${data}`);
  });
});





app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid', { path: '/' });
    res.redirect('/');
  });
});

let listener = app.listen(`${localPort}`, `${localIP}`, function () {
  console.log(`Your app is listening on http://${listener.address().address}:${listener.address().port}`);
  console.log("To access from other devices on the same network, use this address");
});
