const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Google AI (Dialogflow) 設置
const dialogflow = google.dialogflow('v2');
const sessionClient = new dialogflow.SessionsClient();
const sessionPath = sessionClient.projectAgentSessionPath(process.env.GOOGLE_PROJECT_ID, process.env.DIALOGFLOW_SESSION_ID);

// LINE 設置
const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

app.get('/', (req, res) => {
  res.send('Webhook is running!');
});

// LINE Webhook
app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) {
      return res.status(200).send('No events');
    }

    const event = events[0];
    const userMessage = event.message.text;
    const replyToken = event.replyToken;

    // 呼叫 Google AI (Dialogflow) API
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: userMessage,
          languageCode: 'en',
        },
      },
    };

    const dialogflowResponse = await sessionClient.detectIntent(request);
    const aiReply = dialogflowResponse[0].queryResult.fulfillmentText;

    // 傳送回覆訊息到 LINE
    await axios.post(LINE_REPLY_URL, {
      replyToken: replyToken,
      messages: [{ type: 'text', text: aiReply }],
    }, {
      headers: {
        Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error in /webhook:', error);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
