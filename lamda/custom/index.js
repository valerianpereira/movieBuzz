/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills
 * nodejs skill development kit.
 * This sample supports multiple lauguages. (en-US, en-GB, de-DE).
 * The Intent Schema, Custom Slots and Sample Utterances for this skill, as well
 * as testing instructions are located at 
 * githubLink
 **/

'use strict';
const Alexa = require('alexa-sdk');
const https = require("https");

//=========================================================================================================================================
//TODO: The items below this comment need your attention.
//=========================================================================================================================================

//Replace with your app ID (OPTIONAL).  You can find this value at the top of your skill's page on http://developer.amazon.com.
//Make sure to enclose your value in quotes, like this: const APP_ID = 'amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1';
const APP_ID = undefined;

const SKILL_NAME = 'Movie Buzz';
const HELP_MESSAGE = 'You can say tell me the ratings for the movie Venom, or, you can say stop... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';
const GREETMSG = 'Hello, would you like to know the ratings for a movie, tell me the movie\'s name ? ';
const REPROMPTMSG = 'Would you like to hear some other info ?';

//=============================================================
//Editing anything below this line might break your skill.
//=============================================================

const handlers = {
    'LaunchRequest': function () {
        this.emit('GreetUser');
    },
    'GreetUser': function () {
        this.response.cardRenderer(SKILL_NAME, GREETMSG);
        this.response.speak(GREETMSG).listen(GREETMSG);
        this.emit(':responseReady');
    },
    'movieRatings': function () {
        const varrNa = this.event.request.intent.slots.movieName.value;
        if (!varrNa) {
            this.response.cardRenderer(SKILL_NAME, `Invalid Movie Name ${varrNa}`);
            this.response.speak("Sorry, could not identify this movie.");
            this.emit(':responseReady');
        } else {
            let speechOutput = "";

            https.get('https://www.omdbapi.com/?apikey=fafd9062&t=' + varrNa, res => {
                res.setEncoding("utf8");
                let body = "";
                let cardInfo = "";
                let stmmt = "";
                let ratingsVal = "";
                res.on("data", data => {
                    body += data;
                });
                res.on("end", () => {
                    body = JSON.parse(body);
                    
                    if (body.Response == "False") {
                        speechOutput = `Sorry, could not find info for the movie ${varrNa}`;
                        cardInfo = `Sorry, could not find info for the movie ${varrNa}`;
                    } else {
                        speechOutput += `Ratings for the movie ${body.Title} released in ${body.Year} directed by ${body.Director} is as follows. `;
                        cardInfo = speechOutput + "\n\n";

                        body.Ratings.map(rateInfo => {
                            ratingsVal = rateInfo.Value.replace("/", " out of ");
                            stmmt = `${rateInfo.Source} rated ${ratingsVal} . `;
                            speechOutput = speechOutput + stmmt;
                            cardInfo += stmmt + "\n\n";
                        });
                    }
                    
                    this.response.cardRenderer(SKILL_NAME + 'Movie Buzz Ratings', cardInfo);
                    this.response.speak(speechOutput);
                    this.emit(':responseReady');
                });
            });
        }
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
    'EndSessionIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
