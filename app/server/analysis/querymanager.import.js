/* jshint esnext: true */
/* global Meteor */
"use strict";

import { _, moment } from 'app-deps';

export class Snapshot {
    constructor(data) {
        this.change = data.change || null;
        this.key = data.key || null;
        this.date = data.date || null;
        this.status = data.status || null;
        this.resolution = data.resolution || null;
        this.is_resolved = data.isResolved || false;
    }
}

/**
 * Functionality for searching for issues and iterating over changes to issues.
 * Used as a base class.
 *
 * Initialised with various options to constrain queries: see constructor.
 */
export class QueryManager {

    constructor(jira, options, fields=null) {
        this.jira = jira;
        this.options = _.extend({
            project: null,

            issueTypes: ['Story'],
            validResolutions: ["Done", "Wontfix"],
            epics: null,

            jqlFilter: null,

            coreFields: {
                epicLink: 'Epic Link',
                rank: 'Rank',
            },

            customFields: {}, // add more field names to resolve

            maxResults: 1000
        }, options);

        // Resolve fields, querying JIRA if not passed in

        if(fields === null) {
            fields = Meteor.wrapAsync(jira.field.getAllFields, jira.field)({});
        }

        let fieldLookup = fields.reduce((field, val) => {
            val[field.name] = field.id;
            return val;
        }, {});


        _.each(this.options.coreFields, function(name, field) {
            this.options.coreFields[name] = fieldLookup[field] || null;
        });

        _.each(this.options.customFields, function(name, field) {
            this.options.customFields[name] = fieldLookup[field] || null;
        });
    }

    iterChanges(issue, callback, includeResolutionChanges=true) {

        let statusChanges = issue.changelog.histories.reduce((c, v) => {
            return v.concat(c.items);
        }, []).filter(h => { return h.field === 'status'; });

        let lastStatus = statusChanges.length > 0? statusChanges[0].fromString : issue.fields.status.name;
        let lastResolution = null;
        let isResolved = false;

        // Issue was created
        callback(new Snapshot({
            change: null,
            key: issue.key,
            date: moment(issue.fields.created).toDate(),
            status: lastStatus,
            resolution: null,
            isResolved: false
        }));

        issue.changelog.histories.forEach(change => {
            let changeDate = moment(change.created).toDate();
            let resolutions = change.items.filter(i => { return i.field === 'resolution'; });

            isResolved = resolutions.length > 0? Boolean(resolutions[-1].to) : isResolved;

            change.items.forEach(item => {
                if(item.field === 'status') {
                    lastStatus = item.toString;
                    callback(new Snapshot({
                        change: item.field,
                        key: issue.key,
                        date: changeDate,
                        status: lastStatus,
                        resolution: lastResolution,
                        isResolved: isResolved
                    }));
                } else if(item.field === 'resolution') {
                    lastResolution = item.toString;
                    if (includeResolutionChanges) {
                        callback(new Snapshot({
                            change: item.field,
                            key: issue.key,
                            date: changeDate,
                            status: lastStatus,
                            resolution: lastResolution,
                            isResolved: isResolved
                        }));
                    }
                }
            });
        });
    }

    findIssues(jql=null, epics=null, order='KEY ASC', expand='changelog') {
        let query = [];

        query.push('issueType IN (' + this.options.issueTypes.map(t => { return '"' + t + '"'; }).join(', ') + ')');
        query.push('(resolution IS EMPTY OR resolution IN (' + this.options.validResolutions.map(t => { return '"' + t + '"'; }).join(', ') + '))');

        if(this.options.project) {
            query.push('project = ' + this.options.project);
        }

        if(this.options.jqlFilter) {
            query.push('(' + this.options.jqlFilter + ')');
        }

        if(this.options.epics || epics) {
            epics = this.options.epics.concat(epics);
            query.push(this.options.coreFields.epicLink.name + ' IN (' + epics.map(e => { return e.key; }).join(', ')  + ')');
        }

        if(jql) {
            query.push('(' + jql + ')');
        }

        let queryString = query.join(' AND ') + " ORDER BY " + order;

        return Meteor.wrapAsync(this.jira.search.search, this.jira.search)({
            jql: queryString,
            expand: expand,
            maxResults: this.options.maxResults
        });
    }
}
