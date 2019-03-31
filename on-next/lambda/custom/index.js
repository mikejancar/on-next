/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'Welcome to On Next, your guide to the next episode showing for all your favorite TV shows!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('On Next', speechText)
      .getResponse();
  },
};

const DefaultIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'DefaultIntent';
  },
  async handle(handlerInput) {
    var lambda = new AWS.Lambda();
    var callParams = {
      FunctionName: 'on-next-api-dev-getNextEpisodeDate',
      InvocationType: 'RequestResponse',
      LogType: 'Tail',
    };

    let speechText = `I could not determine the show requested. Please try again.`;

    if (handlerInput.requestEnvelope.request.intent.slots.Show) {
      const showRequested = handlerInput.requestEnvelope.request.intent.slots.Show.value;
      callParams.Payload = JSON.stringify({ query: showRequested });

      const response = await lambda.invoke(callParams).promise();

      if (response.FunctionError) {
        console.error(`On Next API call failed: ${err.message}`);
      } else {
        const responseData = JSON.parse(response.Payload);
        if (responseData.nextAirDate) {
          speechText = `The next episode of ${responseData.query} is showing on ${responseData.nextAirDate}`;
        } else {
          speechText = `I could not find any upcoming episodes of ${responseData.query}`;
        }
        return handlerInput.responseBuilder
          .speak(speechText)
          .withSimpleCard('On Next', speechText)
          .getResponse();
      }
    }
    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('On Next', speechText)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can use On Next by saying, Alexa, ask on next about Game of Thrones.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('On Next', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('On Next', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I didn\'t get that. Please try again.')
      .reprompt('Sorry, I didn\'t get that. Please try again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    DefaultIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
