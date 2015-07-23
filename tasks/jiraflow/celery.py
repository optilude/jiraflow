from __future__ import absolute_import

from celery import Celery

app = Celery('jiraflow',
    broker='amqp://',
    backend='amqp://',
    include=['jiraflow.tasks']
)

# Optional configuration, see the application user guide.
app.conf.update(
    CELERY_TASK_SERIALIZER='json',
    CELERY_RESULT_SERIALIZER='json',
    CELERY_ACCEPT_CONTENT=['json'],
)

if __name__ == '__main__':
    app.start()
