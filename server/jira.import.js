/* jshint esnext: true */
/* global Meteor, ServiceConfiguration, Assets */
"use strict";

import { JiraClient, moment } from 'app-deps';
import { AnalysisCache, Servers } from 'lib/models';

import Constants from './constants';
import { CycleTime, StatusTypes } from './analysis/cycletime';

/*
 * Cache helpers
 */

function fetchFromCache(id, remove) {
    let now = new Date();

    let cached = AnalysisCache.findOne({ analysisId: id });
    if(cached) {
        if((remove === undefined || remove) && cached.expires < now) {
            removeFromCache(id);
        } else {
            return cached.data;
        }
    }

    return null;
}

function removeFromCache(id) {
    AnalysisCache.remove({ analysisId: id });
}

function storeInCache(id, expires, data) {
    removeFromCache(id);
    AnalysisCache.insert({
        analysisId: id,
        expires: expires,
        data: data
    });
    return data;
}

/*
 * JIRA queries
 */

const referenceDataExpiry = Meteor.settings.referenceDataExpiry || 60; // minutes

export function getJiraClient() {

    let user = Meteor.user();
    if(!user || !user.services.jira) {
        throw new Meteor.Error("not-authenticated-with-jira", "Current user is not authenticated against a JIRA instance");
    }

    let config = ServiceConfiguration.configurations.findOne({service: "jira"});
    if(!config) {
        throw new Meteor.Error("jira-authentication-not-configured", "JIRA authentication is not configured");
    }

    return new JiraClient({
        host: user.services.jira.host,
        oauth: {
            consumer_key: config.consumerKey,
            private_key: Assets.getText(Constants.PrivateKeyPath),
            token: user.services.jira.accessToken,
            token_secret: user.services.jira.accessTokenSecret
        }
    });

}

function jiraCall(obj, func, options) {
    return Meteor.wrapAsync(obj[func], obj)(options);
}

function cachedJiraCall(id, obj, func, options, expiry) {
    let cached = fetchFromCache(id, false);
    if(cached !== null) {
        return cached;
    }

    return storeInCache(
        id,
        expiry,
        jiraCall(obj, func, options)
    );
}


/*
 * Reference data helpers
 */

function cachedReferenceDataJiraCall(id, obj, func, options) {
     return cachedJiraCall(id, obj, func, options, moment().add(referenceDataExpiry, 'minutes').toDate());
}

export function getProjects(jiraClient) {
     return cachedReferenceDataJiraCall(jiraClient.host + ':ref-projects', jiraClient.project, 'getAllProjects', {});
}

export function getProject(jiraClient, key) {
     return cachedReferenceDataJiraCall(jiraClient.host + ':ref-projects-' + key, jiraClient.project, 'getProject', {projectIdOrKey: key});
}

export function getProjectComponents(jiraClient, project) {
    return cachedReferenceDataJiraCall(jiraClient.host + ':ref-projects-components-' + project, jiraClient.project, 'getComponents', { projectIdOrKey: project });
}

export function getProjectVersions(jiraClient, project) {
    return cachedReferenceDataJiraCall(jiraClient.host + ':ref-projects-versions-' + project, jiraClient.project, 'getVersions', { projectIdOrKey: project });
}

export function getProjectStatuses(jiraClient, project) {
    return cachedReferenceDataJiraCall(jiraClient.host + ':ref-projects-statuses-' + project, jiraClient.project, 'getStatuses', { projectIdOrKey: project });
}

export function getResolutions(jiraClient) {
    return cachedReferenceDataJiraCall(jiraClient.host + ':ref-resolutions', jiraClient.resolution, 'getAllResolutions', {});
}

export function getStatuses(jiraClient) {
    return cachedReferenceDataJiraCall(jiraClient.host + ':ref-statuses', jiraClient.status, 'getAllStatuses', {});
}

export function getStatusCategories(jiraClient) {
    return cachedReferenceDataJiraCall(jiraClient.host + ':ref-status-categories', jiraClient.statusCategory, 'getAllStatusCategories', {});
}

export function getFields(jiraClient) {
    return cachedReferenceDataJiraCall(jiraClient.host + ':ref-fields', jiraClient.field, 'getAllFields', {});
}

export function getIssueTypes(jiraClient) {
    return cachedReferenceDataJiraCall(jiraClient.host + ':ref-issue-types', jiraClient.issueType, 'getAllIssueTypes', {});
}

export function getPriorities(jiraClient) {
    return cachedReferenceDataJiraCall(jiraClient.host + ':ref-priorities', jiraClient.priority, 'getAllPriorities', {});
}

/*
 * Meteor methods exposing relevant APIs
 */

Meteor.methods({

    getCycleData: function() {
        let jiraClient = getJiraClient();

        this.unblock();

        let ct = new CycleTime(jiraClient, {
            project: 'DYB',
            issueTypes: ['Feature'],
            validResolutions: ['Done'],

            coreFields: {
                epicLink: 'Epic Link',
                rank: 'Rank',
            },

            customFields: {
                releaseField: 'Fix Version/s',
                sizeField: 'Tech impact',
                teamField: 'Feature Team'
            },

            maxResults: 10,

            cycle: [
                {
                    name: 'Backlog',
                    type: StatusTypes.backlog,
                    statuses: ["Open", "Reopened"],
                    queue: false,
                },
                {
                    name: 'Elaboration kickoff',
                    type: StatusTypes.accepted,
                    statuses: ["Elaboration kick-off"],
                    queue: false,
                },
                {
                    name: 'Elaboration',
                    type: StatusTypes.accepted,
                    statuses: ["Elaboration", "Conceptual design"],
                    queue: false,
                },
                {
                    name: 'Elaboration Complete',
                    type: StatusTypes.accepted,
                    statuses: ["Ready for Build"],
                    queue: true,
                },
                {
                    name: 'Build',
                    type: StatusTypes.accepted,
                    statuses: ["Detailed design", "Ready for Dev", "In Progress", "Review"],
                    queue: false,
                },
                {
                    name: 'Build Complete',
                    type: StatusTypes.completed,
                    statuses: ["Build Complete"],
                    queue: true,
                },
                {
                    name: 'Integrate',
                    type: StatusTypes.accepted,
                    statuses: ["Integrate"],
                    queue: false,
                },
                {
                    name: 'Test',
                    type: StatusTypes.accepted,
                    statuses: ["E2E", "UAT", "Regression Test", "Ready for CAT", "Corporate Assurance Testing"],
                    queue: false,
                },
                {
                    name: 'Test Complete',
                    type: StatusTypes.accepted,
                    statuses: ["Ready for Deployment"],
                    queue: false,
                },
                {
                    name: 'Done',
                    type: StatusTypes.completed,
                    statuses: ["Done", "Closed"],
                    queue: false,
                }
            ]
        });

        return ct.getCycleData();
    },

    getJiraReferenceData: function() {
        let jiraClient = getJiraClient();

        this.unblock();

        var server = Servers.findOne({host: jiraClient.host });
        if(!server) {
            throw new Meteor.Error("server-not-found", "Server configuration not found!");
        }

        var projects = server.projects? server.projects.map(p => { return getProject(jiraClient, p); }) : getProjects(jiraClient);
        var projectInfo = {};

        projects.forEach(p => {
            projectInfo[p.key] = {
                project: p,
                issueTypes: getProjectStatuses(jiraClient, p.key),
            };
        });



        return {
            projects: projectInfo,
            resolutions: getResolutions(jiraClient),
            statuses: getStatuses(jiraClient),
            statusCategories: getStatusCategories(jiraClient),
            fields: getFields(jiraClient),
            issueTypes: getIssueTypes(jiraClient),
            priorities: getPriorities(jiraClient)
        };

    }

});
