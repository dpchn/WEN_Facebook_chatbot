'use strict';

const async = require('async');
const FB = require("./facebook.action");
var bodyParser = require('body-parser');
var request = require('request');
var Bing = require('node-bing-api')({ accKey: "a80f1de4258b44029f52bdeb290c7ca9" });
//var getUserName = require('./index');
let NewsAPI = require('newsapi');
var _ = require('underscore-node');
 
let newsapi = new NewsAPI('77fba5951a884c59a1204a7d3275b6c4');

module.exports = {
    say(recipientId, context, message, cb) {

        if (recipientId) {
            // Yay, we found our recipient!
            // Let's forward our bot response to her.
            FB.sendText(recipientId, message, (err, data) => {
                if (err) {
                    console.log(
                        'Oops! An error occurred while forwarding the response to',
                        recipientId,
                        ':',
                        err
                    );
                }
                // Let's give the wheel back to our bot
                cb();
            });
        } else {
          console.log('Oops! Couldn\'t find user for session:', sessionId);
          // Giving the wheel back to our bot
          cb();
        }
    },

    merge(recipientId, context, entities, message, cb) {
     
        async.forEachOf(entities, (entity, key, cb) => {
            const value = firstEntityValue(entity);
            //console.error("Result", key, value);

            if (value != null && (context[key] == null || context[key] != value)) {

                switch (key) {
                    default:
                        cb();
                }
            }
            else
                cb();

        }, (error) => {
            if (error) {
                console.error(error);
            } else {
                console.log("Context after merge:\n", context);
                cb(context);
            }
        });
    },


  error(recipientId, context, error) {
        console.log(error.message);
    },

    /**** Add your own functions HERE ******/


//////////////////////////////////////////////////GREETING ACTION of hi //////////////
greeting(sessionId, context, cb){
console.log("sessionId ++", context)
fbUserName(sessionId, function (err, result){
  if(err)
    console.log("ERROR");
  else
    cb(result)
});
// context["name"] = getUserName.userName;
//cb(context);
},




////////////////////////////////////////////find weather////////////////////////////////

findWeather(sessionId, context, cb){
    var location  = context.location[0].value;
    
    getWeather(location, function(err, result){
        if(err)
            console.log("ERROR");
        else
            cb(result);
    });
},
/////////////////////////////////////////////////
news(sessionId, context, cb){
  console.log("Helo-0000000000000 ", context.topic[0].value);
  findNews(sessionId ,context.topic[0].value, function (err, result){
    if(err)
      console.log("ERROR")
    else{
        cb(result)
    }
  });
  //cb(context)
}



};



// Helper function to get the first message
const getWeather = ( location, cb) => {
  var weatherEndpoint = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20woeid%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text%3D%22' + location + '%22)&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
  request({
    url: weatherEndpoint,
    json: true
  }, function(error, response, body) {
    try {
      var condition = body.query.results.channel.item.condition;
      var temperature = parseInt(condition.temp);
      var f_to_c = Math.round(((temperature - 32)*5)/9);
      var weather = {};
      weather["temperature"] = f_to_c;
      weather["condition"] = condition.text;
      weather["location"] = location
            cb(null, weather);
      
    } catch(err) {
      console.error('error caught', err);
      //callback("There was an error");
      cb("Incorrect place");
    }
  });
}

///////////////////////////////////////////////////

const fbUserName = (sessionId, cb) => {
  console.log("Inside fbUserName")
        request('https://graph.facebook.com/v2.8/'+sessionId+'?fields=first_name&access_token=EAAbPsO8J2DABAB44KWaDmoR3EJmzP0ZCGwW6PrQWRDPAHmvACK9AiHKnPRBlBptk52WzutiPfmRXph9tI3gILx1fY9YkjN6wdEZBgVEr3hQI256uMpIBdNlOWlLYoS2vr6GVT1ZARxl7OenSpdZCzgaVF1foxfhJE1lkb5sZARAZDZD', function (error, response, body) {
       // console.log('error:', error); // Print the error if one occurred 
       var obj = JSON.parse(response.body);
      // Print the response status code if a response was received 
        var data ={};
        data["name"] = obj.first_name
        cb(null, data);
       // console.log('body:', body); // Print the HTML for the Google homepage. 
      });
}

//////////////////////////////////////////////////////////////


function callSendAPI(messageData) {
  //console.log("callSendAPI==============",messageData.message.attachment.payload.elements)
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: 'EAAbPsO8J2DABAB44KWaDmoR3EJmzP0ZCGwW6PrQWRDPAHmvACK9AiHKnPRBlBptk52WzutiPfmRXph9tI3gILx1fY9YkjN6wdEZBgVEr3hQI256uMpIBdNlOWlLYoS2vr6GVT1ZARxl7OenSpdZCzgaVF1foxfhJE1lkb5sZARAZDZD' },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      // console.log("Successfully sent generic message with id %s to recipient %s", 
      //   messageId, recipientId);
      console.log("Successfully sent");
    } else {
      console.error("Unable to send message.");
    //  console.error(response);
      console.error(error);
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });  
}



const findNews =(recipientId, topic, cb) =>{
  
  // To query articles 
 if(topic == "article" || topic ==null){ 
     newsapi.articles({
       source: 'associated-press', // required 
       sortBy: 'top' // optional 
     }).then(articlesResponse => {
        var messageData = news_content_set(recipientId, articlesResponse);
       callSendAPI(messageData);
     });
}
 else{
     // To query sources 
     newsapi.sources({
       category: "technical", // optional 
       language: 'en', // optional 
      // country: 'us' // optional 
     }).then(sourcesResponse => {
      console.log("sources news++++++++++++++++", sourcesResponse)
      var messageData = news_content_set(recipientId, sourcesResponse);
      callSendAPI(messageData);
 });
}

}
/////////////////////////////////////////////////////////////

// const getNews = (recipientId, topic, cb) =>{
//   Bing.news("ipl", {
//     top: 10,  // Number of results (max 15) 
//     skip: 3   // Skip first 3 results 
//   }, function(error, res, body){
//     console.log("Bing News===============",body.value[0].name);
//     var text = body.value[0]
//     var news_title = _.pluck(text,'name');
//     var news_urls = _.pluck(body.value[0], 'url');
//     var image_urls = _.pluck(body.value[0].image.thumbnail, 'contentUrl');
//     console.log("Name===>", news_title[0])
//     console.log("Name===>", news_urls[0])
//     console.log("Name===>", image_urls[0])
//   });
// }

function news_content_set(recipientId, messageResponse){
        var news_title = _.pluck(messageResponse.articles, 'title');
        var news_urls = _.pluck(messageResponse.articles, 'url');
        var image_urls = _.pluck(messageResponse.articles, 'urlToImage');
            var msg = {
             "recipient": {
               "id": recipientId
             },
             "message":{
            "attachment":{
              "type":"template",
              "payload":{
                "template_type":"generic",
                "elements":[
               
                ]
              }
            }
          }
        }
     
     var all_urls = _.zip(image_urls, news_urls, news_title);
     _.map(all_urls, function(urls){
         msg.message.attachment.payload.elements.push({
                 "title":urls[2],
                 "image_url":urls[0],
                   "item_url": urls[1],
                 "buttons":[
                   {
                     "type":"web_url",
                     "url":urls[1],
                     "title":"View Website"
                   }]      
               });
     });
    return(msg)
}



const firstEntityValue = (entity) => {
  console.log("Inside firstEntityValue");
    const val = entity && Array.isArray(entity) &&
            entity.length > 0 &&
            entity[0].value
        ;
    if (!val) {
        return null;
    }
    
    return typeof val === 'object' ? val.value : val;
};

