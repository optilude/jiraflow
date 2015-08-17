These are *TEST* keys. Do not use in production. Replace with actual
keys and make sure they are readably only by the meteor process.

$ openssl genrsa -out jiraflow.pem 1024
$ openssl rsa -in jiraflow.pem -pubout -out jiraflow.pub

