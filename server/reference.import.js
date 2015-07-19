/* jshint esnext: true */
/* global Meteor, ServiceConfiguration */
"use strict";

Meteor.methods({

    getJiraConfigurationDetails: function() {
        var value = ServiceConfiguration.configurations.findOne({service: "jira"}, {
            fields: {
                loginStyle: 1,
                consumerKey: 1,
                publicKey: 1
            }
        });

        // paranoia - just in case someone modifies the field spec above and
        // fails to exclude the private key
        if(value && value.privateKey !== undefined) {
            throw new Error("PEBCAK");
        }

        return value;
    }
});
