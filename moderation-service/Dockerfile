from ubuntu

RUN apt-get update -y
RUN apt-get install -y python-dev python-setuptools python-pip
RUN pip install awscli boto3 profanityfilter flask requests
ADD profinity.py profinity.py
RUN mkdir -p /root/.aws
EXPOSE 7080/tcp

ENTRYPOINT ["python", "profinity.py" ]
