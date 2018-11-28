# Compassion Sponsor-to-Child Alexa Skill
## Background
This repository contains code for an Alexa Skill and the associated backend which was created to meet a challenge from Compassion International at the AWS Non-Profit Hackathon for Social Good at re:Invent 2018. Compassion International works to rescue children living in poverty by connecting sponsors in developed countries to these children. 

In addition to the holistic sponsorship of the child's food, clothing, education, and spirituality, sponsors have historically been encouraged to communicate with the children they sponsor via letters. Compassion has seen that this communication is important in helping to break the poverty cycle to lift the child and future generations out of poverty. Historically, the children are protected by a moderation team that reviews every letter sent between the sponsor and child. People are also employed in translating the letters to and from the relevant languages.

This project builds on Compassion's long-running pen-pal tradition that the sponsors and their sponsored children have shared. This new project's goal is for near-real time communication, translation, and moderation. 

## Architecture Diagram
![](https://raw.githubusercontent.com/ashwiniverma/NonProfitCompassion/master/architecture.png)

## Deployment Pre-requisites
- Create IAM roles
  - Lambda: access to Alexa, Translate, Polly, and DynamoDB
  - EC2: access to SNS API
- [Setup the AWS CLI - Install and Configure](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html)
- [Alexa Skills Kit Quick Start - Steps 1, 2, and 3](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html)

## Deployment Procedure
- Deploy the integration service
```bash
cd interaction-service
ask deploy
```
- Attach the IAM role to the Lambda.
- Deploy the moderation service. This can be done by building and deploying a Docker container (see `moderation-service/Dockerfile`) or by running the equivalent commands on an EC2 instance.
- Attach the IAM role to the instance.

## Our approach to the judging citeria
### Social Impact & Value
This Alexa Skill has a large potential social impact, as it can assist in Compassion's goal of rescuing its current 2 million sponsored children out of poverty. Increasing and modernizing should drive sponsorship growth (which ultimately means more children are lifted out of poverty).

### Originality
While other translation skills/apps exist for near-real time translation, this app has the unique value-add of protecting these children through moderation of the communication. A moderation webservice filters out harmful words and phrases before the message is delivered to the child. If certain thresholds are crossed, communication is ended and the moderation team is notified to review.

### Feasibility
What we have created is MVP at best. We have made signifcant comprimises in order to meet the challenge's acceptance criteria and the hackathon's judging criteria. That being said, due to our heavy use of AWS hosted services, we believe what we started here should be able to be built on for a production launch in 12-18 months. The hackathon team has created this [notes document](./NOTES.md) for the next development team that picks this up.

### Usability
We make heave use of the Alexa Skills Kit's ability to prompt the user for appropriate actions. The minimum flows we specced based on accpetance criteria are all accounted for. As you would expect for an app developed in this timeframe, more work is needed additional conversational flows to make it feel even more natural.

### Engagement
The product encourages re-engagment by being easy to use and a much faster (relative to the historic pen-pal methods) interaction between sponsor and child.

### Go-To-Market Strategy & Promotion
We recommend a phased rollout.
- Start with a single partner church that has a small number of children and a high tolerance for working through issues. We recommend the development team take in bugs and feature requests in an agile fashion.
- Roll out to the remainder of that partner church's country/language before tackling other countries/languages
- Rollout to new languages one at a time, addressing feedback as it comes up.