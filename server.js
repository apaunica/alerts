// server.js
// where your node app starts

// init project
const fetch = require('node-fetch');
const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// we've started you off with Express,
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});


app.post("/slack/actions", async (req, res) => {
  console.log("🔔 Button click received!");

  const payload = JSON.parse(req.body.payload);
  console.log("Payload:", payload);

  const { channel, ts } = payload.message;
  const user = payload.user.username;
  const token = process.env.SLACK_BOT_TOKEN;

  try {
    const result = await fetch("https://slack.com/api/reactions.add", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "white_check_mark",
        channel: channel,
        timestamp: ts
      })
    });

    const json = await result.json();
    console.log("Reaction result:", json);

    res.send({
      text: `✅ Acknowledged by @${user}`
    });
  } catch (err) {
    console.error("❌ Error reacting:", err);
    res.status(500).send("Error");
  }
});