'use strict';

const config = require('./config');
const bodyParser = require('body-parser');
const express = require('express');
var request = require('request');
const Wit = require('node-wit').Wit;
const FB = require('./facebook.action');
const async = require('async');
// var userName;
//var show;
// Webserver parameter
const PORT = process.env.PORT || 3000;

// Messenger API parameters
if (!config.FB_PAGE_ID) {
    throw new Error('missing FB_PAGE_ID');
}
if (!config.FB_PAGE_TOKEN) {
    throw new Error('missing FB_PAGE_TOKEN');
}

// See the Webhook reference
// https://developers.facebook.com/docs/messenger-platform/webhook-reference
const getFirstMessagingEntry = (body) => {
    const val = body.object == 'page' &&
            body.entry &&
            Array.isArray(body.entry) &&
            body.entry.length > 0 &&
            body.entry[0] &&
            body.entry[0].id === config.FB_PAGE_ID &&
            body.entry[0].messaging &&
            Array.isArray(body.entry[0].messaging) &&
            body.entry[0].messaging.length > 0 &&
            body.entry[0].messaging[0]
        ;
    return val || null;
};

var sessions = {};
const findOrCreateSession = (sessions, fbid, cb) => {

    if (!sessions[fbid]) {
        console.log("New Session for:", fbid);
        sessions[fbid] = {context: {}};
    }

    cb(sessions, fbid);
};

// Wit.ai bot specific code

// Import our bot actions and setting everything up
const actions = require('./wit.actions');
const wit = new Wit(config.WIT_TOKEN, actions);

// Starting our webserver and putting it all together
const app = express();
app.set('port', PORT);
app.listen(app.get('port'));
app.use(bodyParser.json());

// Webhook setup
app.get('/', (req, res) => {
    if (!config.FB_VERIFY_TOKEN) {
        throw new Error('missing FB_VERIFY_TOKEN');
    }
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === config.FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);
    } else {
        res.sendStatus(400);
    }
});
                                  
     
// Message handler
app.post('/', (req, res) => {
    // Parsing the Messenger API response
    const messaging = getFirstMessagingEntry(req.body);
    if (messaging && messaging.recipient.id === config.FB_PAGE_ID) {
        // Yay! We got a new message!
     //   console.log(req)
        // We retrieve the Facebook user ID of the sender
        const sender = messaging.sender.id;

        // We retrieve the user's current session, or create one if it doesn't exist
        // This is needed for our bot to figure out the conversation history
        findOrCreateSession(sessions, sender, (sessions, sessionId) => {
            // We retrieve the message content

            //First do Postbacks -> then go with this context to wit.ai
            async.series(
                [
                    function (callback) {
                        if (messaging.postback) {
                            //POSTBACK
                            const postback = messaging.postback;

                            if (postback) {
                                var context = sessions[sessionId].context;
                                FB.handlePostback(sessionId, context, postback.payload, (context) => {
                                    callback(null, context);
                                });
                            }
                            } else {
                            callback(null, {});
                        }
                    },
                    function (callback) {
                    //   var show = 123456;
                    //   exports.show = show;
                    //   request('https://graph.facebook.com/v2.6/1409237165800151?fields=first_name&access_token=EAAbPsO8J2DABAB44KWaDmoR3EJmzP0ZCGwW6PrQWRDPAHmvACK9AiHKnPRBlBptk52WzutiPfmRXph9tI3gILx1fY9YkjN6wdEZBgVEr3hQI256uMpIBdNlOWlLYoS2vr6GVT1ZARxl7OenSpdZCzgaVF1foxfhJE1lkb5sZARAZDZD', function (error, response, body) {
                    //  // console.log('error:', error); // Print the error if one occurred 
                    //  var obj = JSON.parse(response.body);
                    //  console.log('statusCode:========================', obj.first_name ); // Print the response status code if a response was received 
                    // console.log("===========================================================")
                    // exports.userName = obj.first_name;
                    //  // console.log('body:', body); // Print the HTML for the Google homepage. 
                    // });
                  //    console.log("===================================", messaging)
                        if (messaging.message) {
                            //MESSAGE
                            const msg = messaging.message.text;
                            const atts = messaging.message.attachments;

                            if (atts) {
                                // We received an attachment
                                // Let's reply with an automatic message
                                console.log("File is Voie", atts)
                                FB.sendText(
                                    sender,
                                    'Sorry I can only process text messages for now.'
                                );
                                callback(null, {});

                            } else {

                                console.log("Run wit with context", sessions[sessionId].context);
                                console.log("context ", msg)
                                // Let's forward the message to the Wit.ai Bot Engine
                                // This will run all actions until our bot has nothing left to do
                                wit.runActions(
                                    sessionId, // the user's current session
                                 //   messaging,
                                    msg, // the user's message
                                    sessions[sessionId].context, // the user's current session state
                               (error, context) => {
                                        if (error) {
                                            console.log('COops! Got an error from Wit:', error);
                                        } else {
                                            // Our bot did everything it has to do.
                                            // Now it's waiting for further messages to proceed.
                                            
                                            console.log('Waiting for futher messages.');

                                            // Based on the session state, you might want to reset the session.
                                            // This depends heavily on the business logic of your bot.
                                            // Example:
                                            // if (context['done']) {
                                            //   delete sessions[sessionId];
                                            // }

                                            // Updating the user's current session state
                                            callback(null, context);
                                        }
                                    }
                                );
                            }
                        } else {
                            //delivery confirmation
                            //mids etc

                            callback(null, {});
                            }
                    },
                ],
                function (err, results) {

                    /* var newContext = sessions[sessionId].context;
                     console.log("Old context", newContext);
                     for (let context_return of results) {

                     newContext = newContext.concat(context_return);
                     console.log("New after adding", context_return, newContext);
                     }

                     sessions[sessionId].context = newContext;*/

                    console.log("Session context", sessions[sessionId].context);
                }
            );

            }
        );
    }
    res.sendStatus(200);
});



