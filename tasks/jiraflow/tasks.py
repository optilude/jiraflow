from __future__ import absolute_import

from jira import JIRA

from jiraflow.celery import app

@app.task
def jql(options, jql):
    client = JIRA(options['host'], oauth=options['oauth'])
    issues = client.search_issues(jql)

    return [i.key for i in issues]
