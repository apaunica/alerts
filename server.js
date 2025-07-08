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
  const channel = payload.container.channel_id;
  const ts = payload.container.message_ts;
  const userId = payload.user.id;
  const userName = payload.user.username;
  const token = process.env.SLACK_BOT_TOKEN;

  // ✅ 1. Add ✅ reaction
  const reactResult = await fetch("https://slack.com/api/reactions.add", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "loading",
      channel: channel,
      timestamp: ts
    })
  });
  const reactJson = await reactResult.json();
  console.log("Reaction result:", reactJson);

  // ✅ 2. Update original message to include assignment line
  await fetch(payload.response_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replace_original: true,
      blocks: [
        ...payload.message.blocks,
        {
          "type": "context",
          "elements": [
            {
              "type": "mrkdwn",
              "text": `*Currently assigned to:* <@${userId}>`
            }
          ]
        }
      ]
    })
  });

  // ✅ 3. Send simple confirmation back to Slack
  res.send({
    text: `✅ Acknowledged and assigned to <@${userId}>`
  });
});

