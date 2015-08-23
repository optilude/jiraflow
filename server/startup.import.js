/* jshint esnext: true */
/* global Meteor, Roles, Accounts, System, ServiceConfiguration, Assets */
"use strict";

import { _ } from 'app-deps';

import Constants from './constants';

// imports with side-effects
import 'lib/models';
import './admin';
import './jira';

// Perform application initialisation on startup

Meteor.startup(function () {

    // Service configuration for JIRA login

    ServiceConfiguration.configurations.upsert(
        { service: "jira" },
        {
            $set: {
                loginStyle: Constants.LoginStyle,
                consumerKey: Constants.ConsumerKey,
                publicKey: Assets.getText(Constants.PublicKeyPath),
                privateKey: Assets.getText(Constants.PrivateKeyPath), // XXX: Is this safe?
            }
        }
    );

    // Create roles using the `alanning:roles` package

    if(!Meteor.roles.findOne({name: "read"})) {
        Roles.createRole("read");
    }

    if(!Meteor.roles.findOne({name: "write"})) {
        Roles.createRole("write");
    }

    // Configure the accounts system so that users can't create their own
    // accounts, and configure the URLs that users will be sent to when
    // they are asked to confirm their accounts or reset passwords. These
    // match client-side routes.

    Accounts.config({
        forbidClientAccountCreation: true,
    });

    Accounts.urls.resetPassword = function(token) {
        return Meteor.absoluteUrl('reset-password/' + token);
    };

    // Not configured; we use enrollment emails instead
    // Accounts.urls.verifyEmail = function(token) {
    //     return Meteor.absoluteUrl('verify-email/' + token);
    // };

    Accounts.urls.enrollAccount = function(token) {
        return Meteor.absoluteUrl('enroll-account/' + token);
    };

    // Create the initial admin user if one doesn't exist

    let adminUser = Meteor.users.findOne({username: "admin"});

    if(!adminUser) {
        console.warn("WARNING: Creating default admin user. Log in as 'admin@example.org' with password 'secret' and change the password!");

        let userId = Accounts.createUser({
            'username': 'admin',
            'email': 'admin@example.org',
            'password': 'secret'
        });

        Roles.addUsersToRoles(userId, ['admin']);
    }
});
