/* jshint esnext:true */
/* global Meteor, Mongo, SimpleSchema, Roles */
"use strict";

import { _ } from 'app-deps';

var Server = new SimpleSchema({
    name: {
        type: String,
    },
    host: {
        type: String,
    }
});

export var Servers = new Mongo.Collection("Servers");
Servers.attachSchema(Server);
Servers.allow({
    insert: function(userId, doc) {
        return (userId && Roles.userIsInRole(userId, ['admin']));
    },
    update: function(userId, doc, fields, modifier) {
        return (userId && Roles.userIsInRole(userId, ['admin']));
    },
    remove: function(userId, doc) {
        return (userId && Roles.userIsInRole(userId, ['admin']));
    }
});

// This allows users to update their own preferences, but noone else's

Meteor.users.allow({
    update: function(userId, user, fields, modifier) {
        return userId && userId === user._id;
    }
});

if(Meteor.isServer) {

    Meteor.publish("servers", function() {
        return Servers.find({}, {fields: {consumerKey: 0}});
    });

    Meteor.publish("userData", function () {
        if (this.userId) {
            return Meteor.users.find({_id: this.userId}, {
                fields: {'profile': 1}
            });
        } else {
            this.ready();
        }
    });

} else if(Meteor.isClient) {
    Meteor.subscribe("userData");
}
