/* jshint esnext: true */
/* global Meteor, ServiceConfiguration */
"use strict";

Meteor.methods({

    getJiraConfigurationDetails: function() {
        return ServiceConfiguration.configurations.findOne({service: "jira"}, {
            fields: {
                loginStyle: 1,
                consumerKey: 1,
                publicKey: 1
            }
        });
    }
});
