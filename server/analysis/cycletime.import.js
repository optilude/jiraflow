/* jshint esnext: true */
/* global Meteor */
"use strict";

import { moment, _ } from 'app-deps';
import { QueryManager } from './querymanager';

import { StatusTypes } from 'lib/models';

/**
 * Find and export cycle time data.
 *
 * Must be configured with the "cycle" of JIRA statuses that make up for a
 * logical cycle. This should have at least one "accepted" step and at
 * least one "completed" step. For example:
 *
 * let ct = new CycleTime(jiraClient, {
 *     project: 'ABC',
 *     issueTypes: ['Story'],
 *     validResolutions: ["Done"],
 *     cycle: [  //flow steps, types, and mapped JIRA statuses
 *          {
 *              name: 'todo',
 *              type: StatusTypes.backlog,
 *              statuses: ["Open", "To Do"],
 *              queue: false
 *          },
 *          {
 *              name: 'analysis',
 *              type: StatusTypes.accepted,
 *              statuses: ["Analysis"],
 *              queue: false
 *          },
 *          {
 *              name: 'analysis-done',
 *              type: StatusTypes.accepted,
 *              statuses: ["Analysis Done"],
 *              queue: true
 *          },
 *          {
 *              name: 'development',
 *              type: StatusTypes.accepted,
 *              statuses: ["In Progress"],
 *              queue: false
 *          },
 *          {
 *              name: 'done',
 *              type: StatusTypes.completed,
 *              statuses: ["Done", "Closed"],
 *              queue: false
 *          },
 *      ]
 *  }
 */
export class CycleTime extends QueryManager {

    constructor(jira, options) {

        options = _.extend({
            cycle: [
                {
                    name: 'todo',
                    type: StatusTypes.backlog,
                    statuses: ["Open", "To Do"],
                    queue: false
                },
                {
                    name: 'development',
                    type: StatusTypes.accepted,
                    statuses: ["In Progress"],
                    queue: false
                },
                {
                    name: 'done',
                    type: StatusTypes.completed,
                    statuses: ["Done", "Closed"],
                    queue: false
                },
            ]
        }, options);

        options.cycleLookup = options.cycle.reduce((val, step, idx) => {
            step.statuses.forEach(s => {
                val[s] = {
                    index: idx,
                    name: step.name,
                    type: step.type,
                    queue: step.queue
                };
            });
            return val;
        }, {});

        super(jira, options);
    }

    /**
     * Return the data required to build cycle time analytics. Return a list of
     * objects with keys `key`, `url`, `issueType`, `summary`, `status`,
     * `resolution`, `cycleTime` (the time elapsed between the first `completed`
     * cycle step and the first `accepted` cycle step encountered for each
     * item), `completedTimestamp`, as well as one key for each custom field
     * listed in `options` and one key for each step the cycle. The latter
     * holds the date that step was entered.
     */
    getCycleData() {
        let cycleNames = _.pluck(this.options.cycle, 'name');
        let acceptedSteps = _.pluck(this.options.cycle.filter(s => { return s.type === StatusTypes.accepted; }), 'name');
        let completedSteps = _.pluck(this.options.cycle.filter(s => { return s.type === StatusTypes.completed; }), 'name');

        let results = this.findIssues();

        return results.issues.map(issue => {

            let item = {
                key: issue.key,
                url: 'https://' + this.jira.host + "/browse/" + issue.key,
                issueType: issue.fields.issuetype.name,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                resolution: issue.fields.resolution? issue.fields.resolution.name : null,
                cycleTime: null,
                completedTimestamp: null
            };

            _.each(this.options.coreFields, (id, name) => {
                let value = issue.fields[id];
                item[name] = value && value.value? value.value : value;
            });

            _.each(this.options.customFields, (id, name) => {
                let value = issue.fields[id];
                item[name] = value && value.value? value.value : value;
            });

            cycleNames.forEach(cycleName => {
                item[cycleName] = null;
            });

            // Record date of status changes against each cycle step

            this.iterChanges(issue, snapshot => {
                let cycleStep = this.options.cycleLookup[snapshot.status];
                if(cycleStep) {
                    item[cycleStep.name] = snapshot.date;
                }
            }, false);

            // Wipe timestamps if items have moved backwards; calculate cycle time

            let previousTimestamp = null;
            let acceptedTimestamp = null;
            let completedTimestamp = null;

            cycleNames.forEach(cycleName => {
                if (
                    item[cycleName] !== null &&
                    previousTimestamp !== null &&
                    item[cycleName] < previousTimestamp
                ) {
                    item[cycleName] = null;
                }

                if(item[cycleName] !== null) {
                    previousTimestamp = item[cycleName];

                    if(acceptedTimestamp === null && previousTimestamp !== null && _.contains(acceptedSteps, cycleName)) {
                        acceptedTimestamp = previousTimestamp;
                    }
                    if(completedTimestamp === null && previousTimestamp !== null && _.contains(completedSteps, cycleName)) {
                        completedTimestamp = previousTimestamp;
                    }
                }
            });


            if(acceptedTimestamp !== null && completedTimestamp !== null) {
                item.cycleTime = moment(completedTimestamp).diff(acceptedTimestamp, 'days') + 1;
                item.completedTimestamp = completedTimestamp;
            }

            return item;
        });

    }

}
