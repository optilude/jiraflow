import math
import itertools
import datetime
import dateutil.parser
import pandas as pd
import numpy as np

from matplotliblite import date2num

def to_datetime(date):
    """Turn a date into a datetime at midnight.
    """
    return datetime.datetime.combine(date, datetime.datetime.min.time())


def strip_time(datetime):
    """Return a version of the datetime with time set to zero.
    """
    return to_datetime(datetime.date())

class IssueSnapshot(object):
    """A snapshot of the key fields of an issue at a point in its change history
    """

    def __init__(self, change, key, date, status, is_resolved):
        self.change = change
        self.key = key
        self.date = date
        self.status = status
        self.is_resolved = is_resolved

    def __hash__(self):
        return hash(self.key)

    def __repr__(self):
        return "<IssueSnapshot change=%s key=%s date=%s status=%s is_resolved=%s>" % (
            self.change, self.key, self.date.isoformat(), self.status, self.is_resolved
        )

class QueryManager(object):
    """Manage and execute queries
    """

    settings = dict(
        today=None,
        project=None,

        epic_issue_type='Epic',
        story_issue_type='Story',

        epic_start_statuses=["In Progress"],
        epic_end_statuses=["Done", "Closed"],

        story_start_statuses=["In Progress"],
        story_end_statuses=["Done", "Closed"],

        valid_resolutions=["Done"],

        epic_status_cycle=['Open', 'Reopened', 'In Progress', 'Done', 'Closed'],
        story_status_cycle=['Open', 'Reopened', 'In Progress', 'Done', 'Closed'],

        epic_link_field='Epic Link',
        release_field='Fix Version/s',
        size_field='Story Points',
        rank_field='Rank',

        max_results=1000,
    )

    fields = dict(
        epic_link=None,
        release=None,
        size=None,
        rank=None
    )

    def __init__(self, jira, **kwargs):
        self.jira = jira
        self.settings.update(kwargs)
        self.resolve_fields()

    # Helpers

    def resolve_fields(self):
        fields = self.jira.fields()

        for k in self.fields.keys():
            name = getattr(self.settings, '%s_field' % k)
            self.fields[k] = next((f['id'] for f in fields if f['name'] == name))

    def iter_changes(self, issue, include_resolution_changes=True):
        """Yield an IssueSnapshot for each time the issue changed status or
        resolution
        """

        is_resolved = False

        # Find the first status change, if any
        status_changes = filter(
            lambda h: h.field == 'status',
            itertools.chain.from_iterable([c.items for c in issue.changelog.histories])
        )
        last_status = status_changes[0].fromString if len(status_changes) > 0 else issue.fields.status.name

        # Issue was created
        yield IssueSnapshot(
            change=None,
            key=issue.key,
            date=dateutil.parser.parse(issue.fields.created),
            status=last_status,
            is_resolved=is_resolved
        )

        for change in issue.changelog.histories:
            change_date = dateutil.parser.parse(change.created)

            resolutions = filter(lambda i: i.field == 'resolution', change.items)
            is_resolved = (resolutions[-1].to is not None) if len(resolutions) > 0 else is_resolved

            for item in change.items:
                if item.field == 'status':
                    # Status was changed
                    last_status = item.toString
                    yield IssueSnapshot(
                        change=item.field,
                        key=issue.key,
                        date=change_date,
                        status=last_status,
                        is_resolved=is_resolved
                    )
                elif item.field == 'resolution' and include_resolution_changes:
                    if include_resolution_changes:
                        yield IssueSnapshot(
                            change=item.field,
                            key=issue.key,
                            date=change_date,
                            status=last_status,
                            is_resolved=is_resolved
                        )

    # Basic queries

    def find_valid_epics(self):
        jql = 'issueType = "%s"' % self.settings.epic_issue_type

        if self.settings.project:
            jql += ' AND project = %s' % self.settings.project

        jql += ' AND (resolution IS EMPTY OR resolution in (%s))' % ', '.join(['"%s"' % r for r in self.settings.valid_resolutions])
        jql += ' ORDER BY key ASC'

        return self.jira.search_issues(jql, expand='changelog', maxResults=self.settings.max_results)

    def find_valid_stories(self, epics=None):
        jql = 'issueType = "%s"' % self.settings.story_issue_type

        if self.settings.project:
            jql += ' AND project = %s' % self.settings.project

        if epics is not None:
            jql += ' AND %s in (%s)' % (self.settings.epic_link_field, ', '.join([f.key for f in epics]),)

        jql += ' AND (resolution IS EMPTY OR resolution in (%s))' % ', '.join(['"%s"' % r for r in self.settings.valid_resolutions])
        jql += ' ORDER BY key ASC'

        return self.jira.search_issues(jql, expand='changelog', maxResults=self.settings.max_results)

    # Analysis

    def build_epic_data_frame(self, epics):
        """Returns a data frame of all epics with WIP and cycle time calculated.
        """

        today = self.settings.today if self.settings.today is not None else datetime.date.today()
        start_statuses = [s.lower() for s in self.settings.epic_start_statuses]
        end_statuses = [s.lower() for s in self.settings.epic_end_statuses]

        epic_data = []
        for epic in epics:

            size = getattr(epic.fields, self.fields['size'], None)
            release = getattr(epic.fields, self.fields['release'], None)

            epic_data_item = {
                'key': epic.key,
                'summary': epic.fields.summary,
                'status': epic.fields.status.name,
                'size': size.value if size else None,
                'release': release[0].name if release else None,
                'rank': getattr(epic.fields, self.fields['rank'], None),
                'start': np.NaN,
                'end': np.NaN,
                'cycle_time': np.NaN,
                'wip_time': np.NaN,
            }

            for snapshot in self.iter_changes(epic):
                if snapshot.change in (None, 'status') and snapshot.status.lower() in start_statuses:
                    epic_data_item['start'] = snapshot.date.date()
                    epic_data_item['end'] = np.NaN
                elif snapshot.change == 'status' and epic_data_item['end'] is np.NaN and snapshot.status.lower() in end_statuses:
                    epic_data_item['end'] = snapshot.date.date()

            if epic_data_item['start'] is not np.NaN and epic_data_item['end'] is not np.NaN:
                epic_data_item['cycle_time'] = (epic_data_item['end'] - epic_data_item['start']).days
            if epic_data_item['start'] is not np.NaN and epic_data_item['end'] is np.NaN:
                epic_data_item['wip_time'] = (today - epic_data_item['start']).days

            epic_data.append(epic_data_item)

        return pd.DataFrame(epic_data, columns=['key', 'summary', 'status', 'size', 'release', 'rank', 'start', 'end', 'cycle_time', 'wip_time'])

    def build_story_data_frame(self, epic_data_frame, stories):
        """Return a data frame of all stories with WIP and cycle time calculated.
        """

        today = self.settings.today if self.settings.today is not None else datetime.date.today()
        start_statuses = [s.lower() for s in self.settings.story_start_statuses]
        end_statuses = [s.lower() for s in self.settings.story_end_statuses]

        story_data = []
        for story in stories:
            story_data_item = {
                'key': story.key,
                'summary': story.fields.summary,
                'status': story.fields.status.name,
                'epic': getattr(story.fields, self.fields.epic_link),
                'start': np.NaN,
                'end': np.NaN,
                'cycle_time': np.NaN,
                'wip_time': np.NaN,
            }

            for snapshot in self.iter_changes(story):
                if snapshot.change in (None, 'status') and snapshot.status.lower() in start_statuses:
                    story_data_item['start'] = snapshot.date.date()
                    story_data_item['end'] = np.NaN
                elif snapshot.change == 'status' and story_data_item['end'] is np.NaN and snapshot.status.lower() in end_statuses:
                    story_data_item['end'] = snapshot.date.date()

            if story_data_item['start'] is not np.NaN and story_data_item['end'] is not np.NaN:
                story_data_item['cycle_time'] = (story_data_item['end'] - story_data_item['start']).days
            if story_data_item['start'] is not np.NaN and story_data_item['end'] is np.NaN:
                story_data_item['wip_time'] = (today - story_data_item['start']).days

            story_data.append(story_data_item)

        return pd.merge(
            pd.DataFrame(story_data, columns=['key', 'summary', 'status', 'epic', 'start', 'end', 'cycle_time', 'wip_time']),
            epic_data_frame[['key', 'size', 'release']],
            how='left',
            left_on='epic',
            right_on='key'
        )[['key_x', 'summary', 'status', 'epic', 'size', 'release',
           'start', 'end', 'cycle_time', 'wip_time']].rename(columns={'key_x': 'key', 'size': 'epic_size'})

    def build_story_count_data_frame(self, epic_data_frame, story_data_frame):
        """Return a data frame providing a story count for each epic
        """
        return pd.merge(
            story_data_frame[['epic', 'key']].groupby('epic').count().rename(columns={'key': 'num_stories'}),
            epic_data_frame[['key', 'size']],
            how='left',
            left_index=True,
            right_on='key',
        )[['key', 'size', 'num_stories']]

    def build_forecast_data_frame(self, epic_data_frame, story_count_data_frame):
        """Return a data frame which forecasts cycle time and number of stories
        for rows where these are blank, based on the values in the data frame
        already.
        """

        forecast_data_frame = pd.merge(
            epic_data_frame,
            story_count_data_frame,
            how='left'
        ).sort('rank')

        # TODO: This is pretty naive

        overall_mean_cycle_time = epic_data_frame.agg(np.mean).dropna().to_dict()['cycle_time']
        overall_mean_num_stories = story_count_data_frame.agg(np.mean).dropna().to_dict()['num_stories']

        if not overall_mean_cycle_time:
            overall_mean_cycle_time = 0
        if not overall_mean_num_stories:
            overall_mean_num_stories = 0

        mean_cycle_times = epic_data_frame.groupby('size').agg(np.mean).dropna().to_dict()['cycle_time']
        mean_num_stories = story_count_data_frame.groupby('size').agg(np.mean).dropna().to_dict()['num_stories']

        def fill_cycle_time(cycle_time, size, wip_time):
            if not np.isnan(cycle_time):
                return cycle_time

            mean_cycle_time = int(mean_cycle_times.get(size, overall_mean_cycle_time))
            if not np.isnan(wip_time):
                if wip_time < mean_cycle_time:
                    return mean_cycle_time
                else:
                    # Story has already run longer than mean; naively assume another 20% remaining
                    return int(wip_time * 1.2)

            return mean_cycle_time

        def fill_num_stories(num_stories, size):
            if not np.isnan(num_stories):
                return num_stories
            return int(mean_num_stories.get(size, overall_mean_num_stories))

        forecast_data_frame['is_complete'] = np.isfinite(forecast_data_frame.cycle_time)
        forecast_data_frame['cycle_time'] = map(
            fill_cycle_time,
            forecast_data_frame['cycle_time'],
            forecast_data_frame['size'],
            forecast_data_frame['wip_time']
        )
        forecast_data_frame['num_stories'] = map(
            fill_num_stories,
            forecast_data_frame['num_stories'],
            forecast_data_frame['size']
        )

        return forecast_data_frame

    def build_burn_data_frame(self, items, end_date, end_statuses):
        """Return a data frame with a multi-index of issue key and date,
        showing status and resolved (true/false) for each.
        """

        min_date = to_datetime(datetime.date.today())
        end_statuses = [s.lower() for s in end_statuses]

        item_data = {'status': {}, 'resolved': {}}
        for item in items:
            for snapshot in self.iter_changes(item):
                snapshot_date = self.strip_time(snapshot.date)
                min_date = min(min_date, snapshot_date)

                # By stripping time, the status as of the last change each day will stand
                item_data['status'][(snapshot.key, snapshot_date,)] = snapshot.status
                item_data['resolved'][(snapshot.key, snapshot_date,)] = (snapshot.status.lower() in end_statuses)

        item_keys = sorted([f.key for f in items])
        days_range = pd.date_range(min_date, to_datetime(end_date))

        item_data_index = pd.MultiIndex.from_product([item_keys, days_range], names=['key', 'date'])
        item_burn_data_frame = pd.DataFrame(item_data, index=item_data_index, columns=['status', 'resolved'])

        # Forward fill counts on missing days for each item
        item_burn_data_frame = item_burn_data_frame.groupby(level='key').transform(lambda x: x.ffill())
        return item_burn_data_frame

    def build_burn_count_data_frame(self, burn_data_frame):
        """Turn a burn_data_frame into a data frame with dates as keys and
        the count of issues per day: total, resolved, and resolved_diff (change
        from previous day).
        """

        burn_count_data_frame = (
            burn_data_frame
            .groupby(level='date')
            .agg({
                'status': lambda x: x.count(),
                'resolved': lambda x: x[x == True].count()
            })
            .rename(columns={'status': 'total'})
        )

        burn_count_data_frame['resolved_diff'] = burn_count_data_frame['resolved'].diff()
        return burn_count_data_frame

    def build_cfd_data_frame(self, burn_data_frame, status_cycle):
        """Build a data frame suitable for generating a cumulative flow diagram
        """
        return (
            burn_data_frame
            .reset_index()
            .pivot_table(values='key', index='status', columns='date', dropna=False, aggfunc=lambda x: x.count())
            .reindex(reversed(status_cycle))
            .fillna(0)
            .T
        )

    def build_burn_plot_data_frame(self, burn_data_frame, forecast_total, forecast_sampling_window=14):
        """Return the data to plot a burn-up chart of items in burn_data_frame
        (with series `resolved` and `total`), a target line at
        `forecast_total` (an integer), and a trend line based on sampling the
        rolling mean over the past `forecast_sampling_window` periods.
        """

        # Calculate rolling mean and use to plot forecast line
        burn_rolling_mean_data_frame = pd.rolling_mean(
            burn_data_frame['resolved_diff'],
            window=forecast_sampling_window
        )

        latest_resolved_features = burn_data_frame['resolved'][-1]
        current_resolution_rate = burn_rolling_mean_data_frame[-1]
        periods_remaining = int(math.ceil((forecast_total - latest_resolved_features) / current_resolution_rate))

        # Add series for a forecast based on the rolling mean

        last_resolved_count = burn_data_frame['resolved'][-1]

        burn_forecast_series = pd.Series(
            [last_resolved_count] + ([burn_rolling_mean_data_frame[-1]] * (periods_remaining - 1)),
            index=pd.date_range(start=burn_data_frame.index[-1], freq=burn_data_frame.index.freqstr, periods=periods_remaining)
        ).cumsum()

        plot_data_frame = burn_data_frame.reindex(burn_data_frame.index + burn_forecast_series.index)[['total', 'resolved']]

        plot_data_frame['total'].fillna(plot_data_frame['total'].max(), inplace=True)
        plot_data_frame['forecast'] = burn_forecast_series

        # Add series for a forecast based on a polynomal fit

        fit_dates = burn_data_frame.index._mpl_repr()[-forecast_sampling_window:]
        plot_dates = plot_data_frame.index._mpl_repr()

        fit_z = np.polyfit(date2num(fit_dates), burn_data_frame['resolved'][-forecast_sampling_window:], 2)
        fit_fn = np.poly1d(fit_z)

        plot_data_frame['fit'] = fit_fn(date2num(plot_dates))

        # don't render curve before sampling window
        plot_data_frame['fit'][:len(burn_data_frame) - forecast_sampling_window] = np.nan

        return plot_data_frame
