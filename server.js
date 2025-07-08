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
  const payload = JSON.parse(req.body.payload);
  const actionId = payload.actions[0].action_id;
  const userId = payload.user.id;
  const channel = payload.container.channel_id;
  const ts = payload.container.message_ts;
  const token = process.env.SLACK_BOT_TOKEN;

  let updatedBlocks = payload.message.blocks;
  let reactionsToAdd = [];
  let reactionsToRemove = [];
  let newContextLine = "";

  // 🔁 Logic based on button clicked
  switch (actionId) {
    case "acknowledge_alert":
      reactionsToAdd.push("loading");
      reactionsToRemove.push("handovers");
      newContextLine = `*Currently assigned to:* <@${userId}>`;

      // remove assign button
      updatedBlocks = removeButtonByActionId(payload.message.blocks, "acknowledge_alert");
      break;

    case "handoff_alert":
      reactionsToAdd.push("handovers");
      reactionsToRemove.push("loading");
      newContextLine = `*Was previously assigned to:* <@${userId}>`;

      // re-add assign button
      updatedBlocks = addAssignButtonIfMissing(payload.message.blocks);
      break;

    case "validated_alert":
      reactionsToAdd.push("check");
      newContextLine = `*Issue validated by:* <@${userId}>`;
      updatedBlocks = payload.message.blocks.filter(block => block.type !== "actions");
      break;

    default:
      console.log("Unknown action_id:", actionId);
  }

  // 🌀 Add and remove reactions
  for (const name of reactionsToRemove) {
    await fetch("https://slack.com/api/reactions.remove", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, channel, timestamp: ts })
    });
  }

  for (const name of reactionsToAdd) {
    await fetch("https://slack.com/api/reactions.add", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, channel, timestamp: ts })
    });
  }

  // 🧱 Append or replace context line
  const blocksWithoutContext = updatedBlocks.filter(block => block.type !== "context");

  blocksWithoutContext.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: newContextLine
      }
    ]
  });

  // 📨 Respond via response_url
  await fetch(payload.response_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      replace_original: true,
      blocks: blocksWithoutContext
    })
  });

  res.send(); // done!
});

function removeButtonByActionId(blocks, actionIdToRemove) {
  return blocks.map(block => {
    if (block.type === "actions") {
      const filtered = block.elements.filter(btn => btn.action_id !== actionIdToRemove);
      return { ...block, elements: filtered };
    }
    return block;
  });
}

function addAssignButtonIfMissing(blocks) {
  return blocks.map(block => {
    if (block.type === "actions") {
      const hasAssign = block.elements.some(btn => btn.action_id === "acknowledge_alert");
      if (!hasAssign) {
        block.elements.unshift({
          type: "button",
          text: { type: "plain_text", text: ":loading: Assign to me!" },
          action_id: "acknowledge_alert"
        });
      }
      return block;
    }
    return block;
  });
}