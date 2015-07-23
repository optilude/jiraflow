/* jshint esnext: true */
/* global Meteor, ServiceConfiguration, Assets, Celery */
"use strict";

import { JiraClient } from 'app-deps';

import Constants from './constants';

export const getJiraClient = function() {

    var user = Meteor.user();
    if(!user || !user.services.jira) {
        throw new Meteor.Error("not-authenticated-with-jira", "Current user is not authenticated against a JIRA instance");
    }

    var config = ServiceConfiguration.configurations.findOne({service: "jira"});
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

};

Meteor.methods({

    runJQL: function(jql) {
        var task = Celery.createTask('jiraflow.tasks.jql');

        var user = Meteor.user();
        if(!user || !user.services.jira) {
            throw new Meteor.Error("not-authenticated-with-jira", "Current user is not authenticated against a JIRA instance");
        }

        var config = ServiceConfiguration.configurations.findOne({service: "jira"});
        if(!config) {
            throw new Meteor.Error("jira-authentication-not-configured", "JIRA authentication is not configured");
        }

        var options = {
            host: 'https://' + user.services.jira.host,
            oauth: {
                consumer_key: config.consumerKey,
                key_cert: Assets.getText(Constants.PrivateKeyPath),
                access_token: user.services.jira.accessToken,
                access_token_secret: user.services.jira.accessTokenSecret
            }
        };

        this.unblock();
        return task.invokeSync([options, jql]).wait().result;
    }

});
