/* jshint esnext: true */
/* global Meteor, ServiceConfiguration, Assets, Celery */
"use strict";

import { JiraClient, moment } from 'app-deps';
import { AnalysisCache } from 'lib/models';

import Constants from './constants';
import { CycleTime, StatusTypes } from './analysis/cycletime';

/*
 * Cache helpers
 */

function fetchFromCache(id, remove) {
    let now = new Date();

    let cached = AnalysisCache.find({ analysisId: id });
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
 * Celery helpers
 */

export function runCeleryTask(taskName, ...params) {
     let task = Celery.createTask(taskName);
     return task.invokeSync(params).wait().result;
}

export function runJiraTask(taskName, ...params) {
    let user = Meteor.user();
    if(!user || !user.services.jira) {
        throw new Meteor.Error("not-authenticated-with-jira", "Current user is not authenticated against a JIRA instance");
    }

    let config = ServiceConfiguration.configurations.findOne({service: "jira"});
    if(!config) {
        throw new Meteor.Error("jira-authentication-not-configured", "JIRA authentication is not configured");
    }

    let options = {
        host: 'https://' + user.services.jira.host,
        oauth: {
            consumer_key: config.consumerKey,
            key_cert: Assets.getText(Constants.PrivateKeyPath),
            access_token: user.services.jira.accessToken,
            access_token_secret: user.services.jira.accessTokenSecret
        }
    };

    return runCeleryTask(taskName, [options].concat(params));
}

/*
 * Meteor methods exposing relevant APIs
 */

Meteor.methods({

    getCycleData: function() {
        let jiraClient = getJiraClient();

        this.unblock();

        let ct = new CycleTime(jiraClient, {
            project: 'APE',
            issueTypes: ['Story'],
            validResolutions: ['Done'],
            cycle: [
                {
                    name: 'backlog',
                    type: StatusTypes.backlog,
                    statuses: ["Open", "Reopened"],
                    queue: false
                },
                {
                    name: 'development',
                    type: StatusTypes.accepted,
                    statuses: ["In Progress", "Ready for Development", "Acceptance Criteria Sign-Off", "Awaiting QA"],
                    queue: false
                },
                {
                    name: 'done',
                    type: StatusTypes.complete,
                    statuses: ["Done", "Resolved"],
                    queue: false
                },
            ]
        });

        return ct.getCycleData();
    },

    getJiraReferenceData: function() {
        let jiraClient = getJiraClient();
        let projects = {};

        this.unblock();

        getProjects(jiraClient).forEach(p => {
            projects[p.key] = {
                project: p,
                components: getProjectComponents(jiraClient, p.key),
                versions: getProjectVersions(jiraClient, p.key),
                statuses: getProjectStatuses(jiraClient, p.key),
            };
        });

        return {
            projects: projects,
            resolutions: getResolutions(jiraClient),
            statuses: getStatuses(jiraClient),
            statusCategories: getStatusCategories(jiraClient),
            fields: getFields(jiraClient),
            issueTypes: getIssueTypes(jiraClient),
            priorities: getPriorities(jiraClient)
        };

    }

});