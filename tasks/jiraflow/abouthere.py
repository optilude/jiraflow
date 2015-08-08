from jira import JIRA
import getpass

from cycletime import StatusTypes, CycleTimeQueries

url = 'https://abouthere.atlassian.net'

print "Connecting to", url
username = raw_input("Username: ")
password = getpass.getpass("Password: ")

print "Please wait..."

jira = JIRA({'server': url}, basic_auth=(username, password))

options = dict(
    project='DYB',

    issue_types=['Feature'],
    valid_resolutions=["Done"],
    epics=None,

    epic_link_field='Epic Link',
    release_field='Fix Version/s',
    size_field='Tech impact',
    rank_field='Rank',
    team_field='Feature Team',

    cycle=[
        {
            "name": 'Backlog',
            "type": StatusTypes.backlog,
            "statuses": ["Open", "Reopened"],
        },
        {
            "name": 'Elaboration kickoff',
            "type": StatusTypes.accepted,
            "statuses": ["Elaboration kick-off"],
        },
        {
            "name": 'Elaboration',
            "type": StatusTypes.accepted,
            "statuses": ["Elaboration", "Conceptual design"],
        },
        {
            "name": 'Elaboration Complete',
            "type": StatusTypes.accepted,
            "statuses": ["Ready for Build"],
        },
        {
            "name": 'Build',
            "type": StatusTypes.accepted,
            "statuses": ["Detailed design", "Ready for Dev", "In Progress", "Review"],
        },
        {
            "name": 'Build Complete',
            "type": StatusTypes.complete,
            "statuses": ["Build Complete"],
        },
        {
            "name": 'Integrate',
            "type": StatusTypes.accepted,
            "statuses": ["Integrate"],
        },
        {
            "name": 'Test',
            "type": StatusTypes.accepted,
            "statuses": ["E2E", "UAT", "Regression Test", "Ready for CAT", "Corporate Assurance Testing"],
        },
        {
            "name": 'Test Complete',
            "type": StatusTypes.accepted,
            "statuses": ["Ready for Deployment"],
        },
        {
            "name": 'Done',
            "type": StatusTypes.complete,
            "statuses": ["Done", "Closed"],
        },
    ]
)

q = CycleTimeQueries(jira, **options)

# Query JIRA
cycle_data = q.cycle_data()

# Write out cycle data

cycle_names = [s['name'] for s in q.settings['cycle']]
cycle_data.to_csv('cycle-data.csv',
    columns=['key', 'url', 'summary'] + cycle_names + ['issue_type', 'status', 'resolution', 'size', 'team', 'release'],
    header=['ID', 'Link', 'Name'] + cycle_names + ['Type', 'Status', 'Resolution', 'Size', 'Team', 'Release'],
    index=False
)

# Write out CFD data
q.cfd(cycle_data).to_csv('cfd.csv')

# Write out percentiles from scatterplot
q.scatterplot(cycle_data)['percentiles'].to_csv('percentiles.csv')

print "Wrote cycle-data.csv, cfd.csv and percentiles.csv"
