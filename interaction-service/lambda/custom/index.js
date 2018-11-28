const AWS = require('aws-sdk');
const translate = new AWS.Translate();
const polly = new AWS.Polly();
const s3 = new AWS.S3();
const alexa = require('ask-sdk');
const apiservice = require('apiservice');
const i18n = require('i18next');

const messages = {
  WELCOME: 'Greetings! Welcome to Compassion. I can help you send a messages to  your dear ones. To begin, please say your name',
  GREETINGS: 'Hello welcome back ',
  WHAT_DO_YOU_WANT: 'You can say, Send a Message or listen to my messages. What do you like to do?',
  REPROMPT_WHAT_DO_YOU_WANT: 'What do you like to do?',
  REPROMPT_SAY_NAME : 'Please say your name.',
  REPROMPT_RECIPIENT_NAME: 'Say the name of the person who you want to send the message.',
  SEND_MESSAGE: 'Please say, Hello and then say your message. ',
  ERROR: 'Uh Oh. Looks like something went wrong',
  SUBSCRIPTION: 'Please say your subscription number to continue',
  NEXT: 'What do you want me to do next?',
  REPEAT_NA: 'Looks like there is nothing to repeat. You can ask Compassion to say something in different languages. What do you want to ask?',
  GOODBYE: 'Bye!',
  UNHANDLED: 'I don\'t know that but I\'m learning. Say "help" to hear the options, or ask something else.',
  HELP: 'You can ask Compassion to send and receive messages. For example, you can say: "Ask Compassion to send a message", or "Ask Compassion to listen to my messages" to listen to your messages'
};

const card_small = `https://s3.amazonaws.com/${process.env.BUCKET_PICS}/language/globe_small.png`;
const card_big = `https://s3.amazonaws.com/${process.env.BUCKET_PICS}/language/globe_big.png`;

const voices = {
  es: 'Enrique',
  ru: 'Maxim',
  pt: 'Cristiano',
  ja: 'Takumi',
  it: 'Giorgio',
  de: 'Hans',
  fr: 'Mathieu'
};

const languages = {
  es: 'Spanish',
  ru: 'Russian',
  pt: 'Portuguese',
  ja: 'Japanese',
  it: 'Italian',
  de: 'German',
  fr: 'French',
  en: 'English'
};

function doTranslate(text,language) {

  let result = new Promise((resolve, reject) => {

    var inputText = text;
    var params = {
        Text: inputText,
        SourceLanguageCode: 'en',
        TargetLanguageCode: language
    };

    translate.translateText(params, function(err, data) {
      if (err) {
              console.error(err, err.stack); // an error occurred
              reject(err);
      }
      else {
              console.log(data);           // successful response
              resolve(data.TranslatedText);
      }
    });

  });

  return result;

}

function doSynthesize(text,voice) {

  let result = new Promise((resolve, reject) => {

    var params = {
      OutputFormat: "mp3",
      SampleRate: "22050",
      Text: `<speak><amazon:effect name="drc"><p>${text}</p></amazon:effect>
      <prosody rate="slow"><amazon:effect name="drc"><p>${text}</p></amazon:effect></prosody></speak>`,
      TextType: "ssml",
      VoiceId: voice
    };

    polly.synthesizeSpeech(params, function(err, data) {
      if (err) {
          console.error(err, err.stack); // an error occurred
          reject(err);
      }
      else {
          resolve(data.AudioStream);
      }
    });

  });

  return result;

}

function writeToS3(data,prefix) {

  let result = new Promise((resolve, reject) => {

    var putParams = {
      Bucket: `${process.env.BUCKET}`,
      Key: `${prefix}/speech.mp3`,
      Body: data,
      ACL: 'public-read',
      StorageClass: 'REDUCED_REDUNDANCY'
    };

    console.log('Uploading to S3');

    s3.putObject(putParams, function (putErr, putData) {
      if (putErr) {
          console.error(putErr);
          reject(putErr);
      } else {
          resolve(putData);
      }
    });

  });

  return result;

}

function getFromS3(prefix) {

    let result = new Promise((resolve, reject) => {

        var putParams = {
            Bucket: `${process.env.BUCKET}`,
            Key: `${prefix}/speech.mp3`,
        };

        console.log('Fetching to S3');

        s3.getObject(putParams, function (putErr, putData) {
            if (putErr) {
                console.error(putErr);
                return false;
            } else {
                return true;
            }
        });

    });

    return result;

}

//s3.getObject(params, function(err, data) { if (err) console.log(err, err.stack); // an error occurred else console.log(data); // successful response });

const LaunchRequest = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {

      const attributesManager = handlerInput.attributesManager;
      let persistenceAttributes = attributesManager.getPersistentAttributes();
      const sessionAttribute = attributesManager.getSessionAttributes();

      let message = messages.WELCOME;
      // if(persistenceAttributes.sponsorName != undefined) {
         //message = messages.GREETINGS + persistenceAttributes +"."+ messages.WHAT_DO_YOU_WANT ;
      // }
      persistenceAttributes.STATE = "SENDER_NAME";
      sessionAttribute.STATE = "SENDER_NAME";
      attributesManager.setPersistentAttributes(persistenceAttributes);
      await attributesManager.savePersistentAttributes();

    return handlerInput.responseBuilder.speak(message)
      .reprompt(messages.REPROMPT_SAY_NAME)
      .getResponse();
  },
};

const SendMessageIntent = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'SendMessageIntent';
    },
    async handle(handlerInput) {
        //TODO check dynamodb message array
        const attributesManager = handlerInput.attributesManager;
        const persistenceAttributes = attributesManager.getPersistentAttributes();
        const sessionAttribute = attributesManager.getSessionAttributes();
        let childName = undefined;

        if(handlerInput.requestEnvelope.request.intent.slots.childName != undefined) {
            childName  = handlerInput.requestEnvelope.request.intent.slots.childName.value;
        }

        if(sessionAttribute.CHILDNAME != undefined) {
            childName  = sessionAttribute.CHILDNAME;
        }
        console.log(JSON.stringify(persistenceAttributes)   + "SendMessageIntent" + JSON.stringify(sessionAttribute) + " Name " + childName);

        let message = "";
        let reprompt=messages.REPROMPT_RECIPIENT_NAME;//"Say the name of the person who you want to send the message. ";

        if(sessionAttribute.currentUser != undefined && childName != undefined) {
          message = "Please say, Hello and then say your message. ";
            persistenceAttributes.TochildName = childName;

        } else if (sessionAttribute.currentUser != undefined && childName === undefined) {
            message = "Who would you like to send message to?";
            let sponsorName = sessionAttribute.currentUser;
            persistenceAttributes.STATE = "GET_CHILD_NAME";
            sessionAttribute.STATE = "GET_CHILD_NAME";
        } else {
            message = "What is your name.";
            reprompt="Go ahead and say your name. ";
        }
        attributesManager.setPersistentAttributes(persistenceAttributes);
        await attributesManager.savePersistentAttributes();
        return handlerInput.responseBuilder
            .speak(message)
            .reprompt(reprompt)
            .getResponse();
    },
};

const ListenMessageIntent = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'ListenMessageIntent';
    },
    async handle(handlerInput) {
        //TODO check dynamodb message array
        const attributesManager = handlerInput.attributesManager;
        const persistenceAttributes = await attributesManager.getPersistentAttributes();
        const sessionAttribute = attributesManager.getSessionAttributes();
        console.log(JSON.stringify(persistenceAttributes) + "ListenMessageIntent" + JSON.stringify(sessionAttribute));

        let count = 0;

        //TODO get the name and fetch the object from persistence
        // let messages = persistenceAttributes.receivedMessages;
        // let name = sessionAttribute.currentUser;
        let message;
        let reprompt;

        const prefix = await handlerInput.attributesManager.getSessionAttributes().currentUser;

        if(getFromS3(prefix)) {
           return handlerInput.responseBuilder
                .speak(`<audio src="https://s3.amazonaws.com/${process.env.BUCKET}/${prefix}/speech.mp3"/>`)
                .reprompt('What would you like to do next? You can say, Send a Message or listen to my messages.')
                .getResponse()
        } else {
            message = "You don't have any messages. Would you like to send a message";
        }

        // if(messages != undefined)
        //     count = messages.count; //TODO get the persistence count
        //
        // if (count > 1) {
        //     message = name + "You have " + count + "messages. Your first message is from " + messages[0].user+". " + messages[0].message +". ";
        // } else if (count === 1) {
        //     message = name + "You have " + count + "message. Your message is from " + messages[0].user+". " + messages[0].message +". ";
        // } else {
        //     message = "You don't have any messages. Would you like to send a message";
        // }
        reprompt = "You can say, send a message or stop to exit.";
        return handlerInput.responseBuilder
            .speak(message)
            .reprompt(reprompt)
            .getResponse();
    },
};

const YesIntent = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'YesIntent';
    },
    handle(handlerInput) {
        //TODO check dynamodb message array
        const attributesManager = handlerInput.attributesManager;
        const persistenceAttributes = attributesManager.getPersistentAttributes();
        let messages = persistenceAttributes.messages;

        let messageObject = messages[0];

        return handlerInput.responseBuilder
            .speak("You have a message from " + messageObject + ". Here is your message.")
            .reprompt("You can say yes to hear the message. What do you want to do?")
            .getResponse();
    },
};


const NameIntent = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'NameIntent';
    },
    handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const persistenceAttributes = attributesManager.getPersistentAttributes();
        const sessionAttribute = attributesManager.getSessionAttributes();
        let name;
        if(handlerInput.requestEnvelope.request.intent.slots.username != undefined) {
          name  = handlerInput.requestEnvelope.request.intent.slots.username.value;
        }

        console.log(JSON.stringify(persistenceAttributes)   + "NameIntent" + JSON.stringify(sessionAttribute) + " Name "+ name);

        let message = messages.WHAT_DO_YOU_WANT;
        let reprompt = messages.REPROMPT_WHAT_DO_YOU_WANT;

        if(persistenceAttributes.STATE === "SENDER_NAME" || sessionAttribute.STATE === "SENDER_NAME") {
            message = "Welcome " + name + ". " + message;
        }

        if (sessionAttribute.STATE === "GET_CHILD_NAME") {
            sessionAttribute.CHILDNAME = name;
            console.log(JSON.stringify(persistenceAttributes)   + "NameIntent2" + persistenceAttributes.targetLanguage);
            if (persistenceAttributes.targetLanguage === undefined) {
                message = "Please say which language you want to send the message";
                reprompt="To set the language - just say: \" Set the language to French, Spanish, Japanese, Russian, Portuguese, Italian, German\". What do you want to do? ";
            } else {
                SendMessageIntent.handle(handlerInput);
            }
        } else {

            sessionAttribute.currentUser = name;

          //TODO check and get the object if name is found then fetch from db and save in session or persist into db and then save to session
        }

        return handlerInput.responseBuilder
            .speak(message)
            .reprompt(reprompt)
            .getResponse();
    },
};

const UnhandledIntent = {
  canHandle() {
    return true;
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(messages.UNHANDLED)
      .reprompt(messages.UNHANDLED)
      .getResponse();
  },
};

const HelpIntent = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(messages.HELP)
      .reprompt(messages.WHAT_DO_YOU_WANT)
      .getResponse();
  },
};

const SetLanguageIntent = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    return request.type === 'IntentRequest' && request.intent.name === 'SetLanguage';
  },
  async handle(handlerInput) {

    const attributesManager = handlerInput.attributesManager;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    var response = 'I don\'t know this language but I\'m learning.\
    Please choose the language from Italian, Spanish, Japanese, German, Russian, Portuguese or French';
    var reprompt = 'Which language do you want to choose?';

    if(currentIntent.slots.language.resolutions &&
      currentIntent.slots.language.resolutions.resolutionsPerAuthority[0] &&
      currentIntent.slots.language.resolutions.resolutionsPerAuthority[0].status &&
      currentIntent.slots.language.resolutions.resolutionsPerAuthority[0].status.code == 'ER_SUCCESS_MATCH'){
      const language = currentIntent.slots.language.resolutions.resolutionsPerAuthority[0].values[0].value.name;
      sessionAttributes.targetLanguage = currentIntent.slots.language.resolutions.resolutionsPerAuthority[0].values[0].value.id;
      attributesManager.setPersistentAttributes(sessionAttributes);
      await attributesManager.savePersistentAttributes();
      response = `Ok, I set the language to ${language}. ` + "Please say, Hello and then say your message. ";
      reprompt = "Please say, hello and then say your message. ";
    }

    return handlerInput.responseBuilder
      .speak(response)
      .reprompt(reprompt)
      .getResponse();
  },
};

const CancelIntent = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    return request.type === 'IntentRequest' &&
    (request.intent.name === 'AMAZON.CancelIntent' || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(messages.GOODBYE)
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

const AskIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'AskIntent';
  },
  async handle(handlerInput) {

    const attributesManager = handlerInput.attributesManager;
    const persistanceAttributes = await attributesManager.getPersistentAttributes();
    const sessionAttributes = await attributesManager.getPersistentAttributes();
    let phrase = handlerInput.requestEnvelope.request.intent.slots.phrase.value;
    const devId = handlerInput.requestEnvelope.context.System.device.deviceId;
    const prefix = handlerInput.attributesManager.getSessionAttributes().CHILDNAME;//require('crypto').createHash('md5').update(devId).digest("hex").toString();
    var translation = '';

    attributesManager.setSessionAttributes(persistanceAttributes);

    if (!persistanceAttributes.targetLanguage) {
      console.log(persistanceAttributes.targetLanguage);
      persistanceAttributes.targetLanguage = 'ru';
    }
      let fromName = sessionAttributes.name;
      let toName = sessionAttributes.CHILDNAME;
      let responseCode = "AllOK";
    //TODO the api call
      const apiFetchedQuestion = await Promise.resolve(apiservice.getCleanTranslation(phrase, fromName, toName)).then((response) => {
          console.error("*****************SUCCESS Calling Question Api ***************** " + response);

          responseCode = response.code;
          phrase = response.message;
          phrase = phrase.replace("*", "beep");
          console.error("*****************SUCCESS Calling phrase ***************** " + phrase);

      }).catch((error) => {
          console.error("*****************ERROR Calling Question Api ***************** " + error);
          //Game.askQuestion(handlerInput, false, ctx.t('QUESTIONS'));
      });

      if(responseCode === "AllOK") {
          console.error("*****************SUCCESS Calling responseCode ***************** " + responseCode);
          return new Promise((resolve) => {
              doTranslate(phrase, persistanceAttributes.targetLanguage)
                  .then((data) => {
                      translation = data;
                      doSynthesize(data, voices[persistanceAttributes.targetLanguage])
                          .then((data) => {
                              writeToS3(data,prefix)
                                  .then(() => {
                                      console.log(prefix);
                                      resolve(handlerInput.responseBuilder
                                          .speak(`This is how phrase ${phrase} will sound in ${languages[persistanceAttributes.targetLanguage]}:\
                        <audio src="https://s3.amazonaws.com/${process.env.BUCKET}/${prefix}/speech.mp3"/>`)
                                          .withStandardCard(
                                              'Compassion App',
                                              `Original phrase: ${phrase}\nTranslation in ${languages[persistanceAttributes.targetLanguage]}: ${translation}`,
                                              card_small,
                                              card_big)
                                          .getResponse());
                                  });

                          });
                  });

          });
      } else {
          return handlerInput.responseBuilder
              .speak(`${phrase} . Exiting now`)
              .withShouldEndSession(true)
              .getResponse()
      }
  },
};

const RepeatIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'RepeatIntent';
  },
  async handle(handlerInput) {
    const devId = handlerInput.requestEnvelope.context.System.device.deviceId;
    const prefix = await handlerInput.attributesManager.getSessionAttributes().CHILDNAME;//require('crypto').createHash('md5').update(devId).digest("hex").toString();

     return new Promise((resolve, reject) => {

      var Params = {
          Bucket: `${process.env.BUCKET}`,
          Key: `${prefix}/speech.mp3`
      };

      console.log('Heading an existing object in S3');

      s3.headObject(Params, function (Err, Data) {
        if (Err) {
            resolve(handlerInput.responseBuilder
            .speak(messages.REPEAT_NA)
            .reprompt(messages.WHAT_DO_YOU_WANT)
            .getResponse());
        } else {
            resolve(handlerInput.responseBuilder
            .speak(`<audio src="https://s3.amazonaws.com/${process.env.BUCKET}/${prefix}/speech.mp3"/>\
            Say "repeat" to listen again, or ask something else to get a new translation`)
            .reprompt('Say "repeat" to listen again, or ask something else to get a new translation')
            .getResponse());
        }
      });
    });
  },
};

const skillBuilder = alexa.SkillBuilders.standard();

const RequestLog = {
    async process(handlerInput) {
        console.log(`REQUEST ENVELOPE = ${JSON.stringify(handlerInput.requestEnvelope)}`);
        let {
            attributesManager,
            requestEnvelope
        } = handlerInput;
        let ctx = attributesManager.getRequestAttributes();
        const localizationClient = i18n.init({
            lng: handlerInput.requestEnvelope.request.locale,
            resources: messages,
            returnObjects: true,
            fallbackLng: 'en'
        });
        ctx.t = function (...args) {
            return localizationClient.t(...args);
        };
        // return;
    },
};


exports.handler = skillBuilder
  .addRequestHandlers(
    AskIntentHandler,
    SetLanguageIntent,
    RepeatIntentHandler,
    LaunchRequest,
      ListenMessageIntent,
      SendMessageIntent,
      NameIntent,
      YesIntent,
    HelpIntent,
    CancelIntent,
    UnhandledIntent,
    SessionEndedRequestHandler
  )
  // .addRequestInterceptors(RequestLog)
  .withTableName(`${process.env.TABLE}`)
  .withAutoCreateTable(true)
  .lambda();
