/* jshint esnext:true */
/* global Meteor, Mongo, SimpleSchema, Roles */
"use strict";

import { _ } from 'app-deps';

// JIRA servers

const Server = new SimpleSchema({
    name: {
        type: String,
    },
    host: {
        type: String,
    },
    editors: {
        type: [String],
    },
    projects: {
        type: [String],
        optional: true
    }
});

export const Servers = new Mongo.Collection("Servers");
Servers.attachSchema(Server);
Servers.allow({ // only (non-OAuth) admin users can manage servers
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

// Analysis parameters

const Analysis = new SimpleSchema({
    serverId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    name: {
        type: String
    },
    'parameters.project': {
        type: String
    },
    'paramters.issueTypes': {
        type: [String]
    },
    'parameters.validResolutions': {
        type: [String]
    },
    'parameters.customFields': {
        type: Object  // fieldName: "Name of field"
    },
    'parameters.jqlFilter': {
        type: String,
        optional: true
    },

    'parameters.cycle.$.name': {
        type: String,
    },
    'parameters.cycle.$.type': {
        type: String
    },
    'parameters.cycle.$.statuses': {
        type: [String]
    },
    'parameters.cycle.$.queue': {
        type: Boolean
    }

});

export const Analyses = new Mongo.Collection("Analyses");
Analyses.attachSchema(Analysis);

// to create, update or remove an analysis, the user must either be a
// (non-OAuth) admin user, or be listed in the `editors` list for the
// server that matches the host the user logged in against

function allowAnalysisModification(userId, doc, fields) {
    let user = Meteor.user();
    if(!user) {
        return false;
    }

    if(user.services.jira) {
        let host = user.services.jira.host,
            username = user.services.jira.username;

        let server = Servers.findOne({host: host});
        if(!server) {
            return false;
        }

        if(server.editors.indexOf(username) < 0) {
            return false;
        }

        if(doc.serverId !== server._id || (fields !== undefined && fields.indexOf('serverId') >= 0)) {
            return false;
        }

        return true;
    } else {
        return Roles.userIsInRole(userId, ['admin']);
    }
}

Analyses.allow({
    insert: allowAnalysisModification,
    update: allowAnalysisModification,
    remove: allowAnalysisModification
});

// Analysis cache - caches results from the task queue

const AnalysisCacheEntry = new SimpleSchema({
    analysisId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    expires: {
        type: Date
    },
    data: {
        type: Object
    }
});

export const AnalysisCache = new Mongo.Collection("AnalysisCache");
AnalysisCache.allow({ // server-side only!
    insert: function(userId, doc) {
        return  false;
    },
    update: function(userId, doc, fields, modifier) {
        return false;
    },
    remove: function(userId, doc) {
        return false;
    }
});


// This allows users to update their own preferences, but noone else's

Meteor.users.allow({
    update: function(userId, user, fields, modifier) {
        return userId && userId === user._id;
    }
});

if(Meteor.isServer) {

    Meteor.startup(function() {
        Servers._ensureIndex('host', { unique: true, sparse: true });

        AnalysisCache._ensureIndex('analysisId', { unique: false, sparse: true });
        AnalysisCache._ensureIndex('expires', { unique: false, sparse: true });

        // Clear cache periodically, default every 5 minutes
        Meteor.setInterval(function() {
            let now = new Date();
            AnalysisCache.remove({ "expires": { $lte: now } });
        }, 1000 * 60 * (Meteor.settings.clearCacheInterval || 5));
    });

    Meteor.publish("servers", function() {
        return Servers.find({}, {fields: {consumerKey: 0}});
    });

    Meteor.publish("analyses", function() {
        if (!this.userId) {
            return;
        }

        let user = Meteor.users.findOne({_id: this.userId});

        if(Roles.userIsInRole(this.userId, ['admin'])) {
            return Analyses.find();
        } else if(user.services.jira) {
            return Analyses.find({
                serverId: user.services.jira.host
            });
        }
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
