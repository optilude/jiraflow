/* jshint esnext: true */
/* global Meteor */
"use strict";

export default {
    LoginStyle: Meteor.settings.loginStyle || "popup",
    ConsumerKey: Meteor.settings.consumerKey || "JiraFlow",
    PublicKeyPath: Meteor.settings.publicKeyPath || "keys/jiraflow.pub",
    PrivateKeyPath: Meteor.settings.privateKeyPath || "keys/jiraflow.pem"
};
