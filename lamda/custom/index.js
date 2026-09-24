/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * Movie Buzz - Alexa skill returning movie ratings from OMDb
 * (IMDb, Rotten Tomatoes, Metacritic).
 **/

'use strict';
const Alexa = require('alexa-sdk');
const https = require("https");

const APP_ID = 'amzn1.ask.skill.faf0bc89-7e6f-48e3-92bd-13b3f4ae804b';
// ponytail: fallback keeps the existing key working until the Lambda env var is set; rotate the key after.
const OMDB_API_KEY = process.env.OMDB_API_KEY || 'fafd9062';

const SKILL_NAME = 'Movie Buzz';
const HELP_MESSAGE = 'You can say tell me the ratings for the movie Venom, or, you can say stop... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';
const GREETMSG = 'Hello, would you like to know the ratings for a movie, tell me the movie\'s name ? ';
const REPROMPTMSG = 'Would you like the ratings for another movie? Just say the movie\'s name.';
const FALLBACK_MESSAGE = 'Sorry, I didn\'t get that. Tell me a movie name and I will fetch its ratings.';
const ERROR_MESSAGE = 'Sorry, I could not reach the ratings service right now. Please try again later.';

function fetchMovie(title, cb) {
    const url = 'https://www.omdbapi.com/?apikey=' + OMDB_API_KEY + '&t=' + encodeURIComponent(title);
    https.get(url, res => {
        res.setEncoding("utf8");
        let body = "";
        res.on("data", data => { body += data; });
        res.on("end", () => {
            if (res.statusCode !== 200) return cb(new Error('OMDb HTTP ' + res.statusCode));
            try {
                cb(null, JSON.parse(body));
            } catch (e) {
                cb(e);
            }
        });
    }).on("error", cb);
}

function buildResponse(movie, title) {
    if (!movie || movie.Response === "False") {
        const msg = `Sorry, could not find info for the movie ${title}. `;
        return { speech: msg, card: msg };
    }
    if (!movie.Ratings || movie.Ratings.length === 0) {
        const msg = `No ratings are available yet for ${movie.Title} released in ${movie.Year}. `;
        return { speech: msg, card: msg };
    }
    let speech = `Ratings for the movie ${movie.Title} released in ${movie.Year} directed by ${movie.Director} is as follows. `;
    let card = speech + "\n\n";
    movie.Ratings.forEach(rateInfo => {
        const stmt = `${rateInfo.Source} rated ${rateInfo.Value.replace("/", " out of ")} . `;
        speech += stmt;
        card += stmt + "\n\n";
    });
    return { speech, card };
}

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
        const slot = this.event.request.intent.slots.movieName;
        const title = slot && slot.value;
        if (!title) {
            this.response.speak(FALLBACK_MESSAGE).listen(REPROMPTMSG);
            this.emit(':responseReady');
            return;
        }
        fetchMovie(title, (err, movie) => {
            if (err) {
                console.error('OMDb fetch failed', err);
                this.response.cardRenderer(SKILL_NAME, ERROR_MESSAGE);
                this.response.speak(ERROR_MESSAGE);
                this.emit(':responseReady');
                return;
            }
            const out = buildResponse(movie, title);
            this.response.cardRenderer(SKILL_NAME + ' Ratings', out.card);
            this.response.speak(out.speech + REPROMPTMSG).listen(REPROMPTMSG);
            this.emit(':responseReady');
        });
    },
    'AMAZON.HelpIntent': function () {
        this.response.speak(HELP_MESSAGE).listen(HELP_REPROMPT);
        this.emit(':responseReady');
    },
    'AMAZON.FallbackIntent': function () {
        this.response.speak(FALLBACK_MESSAGE).listen(REPROMPTMSG);
        this.emit(':responseReady');
    },
    'AMAZON.NavigateHomeIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function () {
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'Unhandled': function () {
        this.response.speak(FALLBACK_MESSAGE).listen(REPROMPTMSG);
        this.emit(':responseReady');
    },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

// ponytail: local smoke check, run `node index.js` (needs network for the last assert)
if (require.main === module) {
    const assert = require('assert');
    assert.strictEqual(buildResponse({ Response: 'False' }, 'x').speech, 'Sorry, could not find info for the movie x. ');
    assert.ok(buildResponse({ Title: 'T', Year: '2000', Ratings: [] }).speech.startsWith('No ratings'));
    assert.ok(buildResponse({ Title: 'T', Year: '2000', Director: 'D', Ratings: [{ Source: 'IMDb', Value: '8/10' }] }).speech.includes('IMDb rated 8 out of 10'));
    fetchMovie('Inception', (err, m) => { assert.ifError(err); assert.strictEqual(m.Title, 'Inception'); console.log('ok'); });
}
