from flask import Flask, request, jsonify, abort
import logging
import boto3
import json
import re

app = Flask(__name__)
from profanityfilter import ProfanityFilter
pf = ProfanityFilter()


@app.route('/get_profinity', methods=['POST'])
def getText():
    print "request is ", request.get_json()
    data = request.get_json()
    print("data i got is ", data)
    data = json.loads(data)
    print type(data)
    text = data['text']
    profined  = pf.censor(text)
    counter = 0
    code = "AllOK"
    for words in profined.split(' '):
        data = words
        if '*' in words:
            print "found it"
            counter = counter + 1
            
        if 'marry' in words.lower():
            print "found Marryi"
            code =  "M400"
    if counter >2:
       code ="P101"
    if counter >2 or code == "M400":
       send_sns(data)
       profined = "Our content moderation has flagged you message. Your message won't be delivered"
    retdict = {}
    profined = re.sub(r"(\*+)", "beep", profined)
    retdict['message'] = profined
    retdict['count'] = counter
    retdict['code'] = code
    return jsonify(retdict)

def send_sns(message):
    client = boto3.client('sns', region_name="us-west-1")
    arn = "arn:aws:sns:us-west-1:835733446678:profinity"
    response = client.publish(
                   TopicArn = arn,
                       Message=json.dumps({'default': json.dumps(message)}),
                           MessageStructure='json'                        )

if __name__ == "__main__":
    LOG_FORMAT = '[%(asctime)s] %(process)d %(module)-12s %(levelname)-8s %(message)s'
    DATE_FORMAT = '%d/%b/%Y %H:%M:%S %z'
    logging.basicConfig(level=logging.INFO,
                        format=LOG_FORMAT, datefmt=DATE_FORMAT)
    app.run(host="0.0.0.0", port=7080, threaded=True)

