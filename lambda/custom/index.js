const AWS = require('aws-sdk');
const translate = new AWS.Translate();
const polly = new AWS.Polly();
const s3 = new AWS.S3();
const alexa = require('ask-sdk');

const messages = {
  WELCOME: 'Greetings! Welcome to Compassion. I can help you send a message to your sponsored child. To begin, please say your name',
  GREETINGS: 'Hello welcome back ',
  WHAT_DO_YOU_WANT: 'You can say, Send a Message or listen to my messages. What do you like to do?',
  REPROMPT_WHAT_DO_YOU_WANT: 'What do you like to do?',
  ERROR: 'Uh Oh. Looks like something went wrong',
  SUBSCRIPTION: 'Please say your subscription number to continue',
  NEXT: 'What do you want me to do next?',
  REPEAT_NA: 'Looks like there is nothing to repeat. You can ask Language Teacher to say something in different languages. What do you want to ask?',
  GOODBYE: 'Bye!',
  UNHANDLED: 'I don\'t know that but I\'m learning. Say "help" to hear the options, or ask something else.',
  HELP: 'You can ask Language Teacher to say something in different languages. For example, you can say: "Ask Language Teacher to say Hello", or "Ask Language Teacher to repeat" to listen to the translation again. To set the language - just say: "Ask Language Teacher to set the language to Japanese". What do you want to do?'
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
  fr: 'French'
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

const LaunchRequest = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {

      const attributesManager = handlerInput.attributesManager;
      const persistenceAttributes = attributesManager.getPersistentAttributes();
      let message = messages.WELCOME;
      // if(persistenceAttributes.sponsorName != undefined) {
         //message = messages.GREETINGS + persistenceAttributes +"."+ messages.WHAT_DO_YOU_WANT ;
      // }

    return handlerInput.responseBuilder.speak(message)
      .reprompt("Please say your name.")
      .getResponse();
  },
};

const SendMessageIntent = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'SendMessageIntent';
    },
    handle(handlerInput) {
        //TODO check dynamodb message array
        const attributesManager = handlerInput.attributesManager;
        const persistenceAttributes = attributesManager.getPersistentAttributes();
        const sessionAttribute = attributesManager.getSessionAttributes();
        let childName ="";
        if(handlerInput.requestEnvelope.request.intent.slots.childName != undefined) {
            childName  = handlerInput.requestEnvelope.request.intent.slots.childName.value;
        }

        if(sessionAttribute.CHILDNAME != undefined) {
            childName  = sessionAttribute.CHILDNAME;
        }
        console.log(JSON.stringify(persistenceAttributes)   + "SendMessageIntent" + JSON.stringify(sessionAttribute));

        let message = ""; let reprompt="Say the name of the person who you want to send the message. ";

        if(sessionAttribute.currentUser.name != undefined && childName != "") {
          message = "Please say, Jesus love you and then say your message. ";
            persistenceAttributes.TochildName = childName;

        } else if (sessionAttribute.currentUser.name != undefined && childName === "") {
            message = "How would you like to send message to?";
            let sponsorName = sessionAttribute.currentUser.name;
            persistenceAttributes.STATE = "GET_CHILD_NAME";
            sessionAttribute.STATE = "GET_CHILD_NAME";
        } else {
            message = "What is your name.";
            reprompt="Go ahead and say your name. ";
        }
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
    handle(handlerInput) {
      //TODO check dynamodb message array
        const attributesManager = handlerInput.attributesManager;
        const persistenceAttributes = attributesManager.getPersistentAttributes();
        const sessionAttribute = attributesManager.getSessionAttributes();
        console.log(JSON.stringify(persistenceAttributes)   + "ListenMessageIntent" + JSON.stringify(sessionAttribute));


        //TODO get the name and fetch the object from persistence
        let name = sessionAttribute.currentUser.name;

        let message; let reprompt;
        let count = 0; //TODO get the persistence count

        if (count > 1) {
          message = "You have " + count  + "messages. Here's your first message " + count;//TODO get the message, and gt next messages
        } else if (count === 1) {
            message = "You have " + count  + "message. Here's your message " + count;//TODO get the message
        } else {
          message = "You don't have any messages. Would you like to send a message";
        }
        reprompt = "You can say, send a message or stop to exist.";
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

        if (sessionAttribute.STATE === "GET_CHILD_NAME") {
            sessionAttribute.CHILDNAME = name;
            SendMessageIntent.handle(handlerInput);
        } else {

          sessionAttributes.currentUser.name = name;

          //TODO check and get the object if name is found then fetch from db and save in session or persist into db and then save to session
        }

        return handlerInput.responseBuilder
            .speak(messages.WHAT_DO_YOU_WANT)
            .reprompt(messages.REPROMPT_WHAT_DO_YOU_WANT)
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
      response = `Ok, I set the language to ${language}. ` + messages.NEXT;
      reprompt = messages.NEXT;
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
    const sessionAttributes = await attributesManager.getPersistentAttributes();
    const phrase = handlerInput.requestEnvelope.request.intent.slots.phrase.value;
    const devId = handlerInput.requestEnvelope.context.System.device.deviceId;
    const prefix = require('crypto').createHash('md5').update(devId).digest("hex").toString();
    var translation = '';

    attributesManager.setSessionAttributes(sessionAttributes);

    if (!sessionAttributes.targetLanguage) {
      console.log(sessionAttributes.targetLanguage);
      sessionAttributes.targetLanguage = 'ru';
    }

    //TODO the api call
      

    return new Promise((resolve) => {

      doTranslate(phrase, sessionAttributes.targetLanguage)
      .then((data) => {
        translation = data;
        doSynthesize(data, voices[sessionAttributes.targetLanguage])
        .then((data) => {
          writeToS3(data,prefix)
          .then(() => {
              console.log(prefix);
              resolve(handlerInput.responseBuilder
              .speak(`This is how phrase ${phrase} will sound in ${languages[sessionAttributes.targetLanguage]}:\
              <audio src="https://s3.amazonaws.com/${process.env.BUCKET}/${prefix}/speech.mp3"/>\
              Say "repeat" to listen again, or ask something else to get a new translation`)
              .reprompt('Say "repeat" to listen again, or ask something else to get a new translation')
              .withStandardCard(
              'Language Teacher',
              `Original phrase: ${phrase}\nTranslation in ${languages[sessionAttributes.targetLanguage]}: ${translation}`,
              card_small,
              card_big)
              .getResponse());
          });
        });
      });

    });
  },
};

const RepeatIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'RepeatIntent';
  },
  async handle(handlerInput) {
    const devId = handlerInput.requestEnvelope.context.System.device.deviceId;
    const prefix = require('crypto').createHash('md5').update(devId).digest("hex").toString();

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

exports.handler = skillBuilder
  .addRequestHandlers(
    AskIntentHandler,
    SetLanguageIntent,
    RepeatIntentHandler,
    LaunchRequest,
      ListenMessageIntent,
      SendMessageIntent,
      NameIntent,
    HelpIntent,
    CancelIntent,
    UnhandledIntent,
    SessionEndedRequestHandler
  )
  .withTableName(`${process.env.TABLE}`)
  .withAutoCreateTable(true)
  .lambda();
