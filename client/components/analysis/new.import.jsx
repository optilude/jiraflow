/* jshint esnext:true */
/* global Meteor, React, ReactMeteorData */

"use strict";

import { _, ReactBootstrap, ReactSelect as Select} from 'app-deps';

import Loading from '../loading';
import KanbanSetup from './kanban';
import { StatusTypes } from 'lib/models';

const { Input, Button } = ReactBootstrap;

const AnalysisForm = React.createClass({
    displayName: "AnalysisForm",
    mixins: [React.addons.LinkedStateMixin],

    propTypes: {
        referenceData: React.PropTypes.object.isRequired,
        onSubmit: React.PropTypes.func.isRequired
    },

    getInitialState: function() {
        return {
            invalid: false,

            name: null,
            project: null,
            issueTypes: null,
            validResolutions: null,
            customFields: null,
            jqlFilter: null,
            cycle: null
        };
    },

    render: function() {

        const selectLink = (field, multiple) => {
            return (v, m) => {
                let opts = {};
                opts[field] = multiple? _.pluck(m, 'value') : v;
                this.setState(opts);
            };
        };

        const optionRenderer = opt => {
            return <div title={opt.title}>{opt.label}</div>;
        };

        let projects = _.sortBy(_.values(this.props.referenceData.projects).map(p => {
            return {
                value: p.project.key,
                label: p.project.name + " (" + p.project.key + ")"
            };
        }), 'label');

        let issueTypes = null; // only available once project selected
        if(this.state.project && this.props.referenceData.projects[this.state.project]) {
            issueTypes = _.sortBy(this.props.referenceData.projects[this.state.project].project.issueTypes.map(v => {
                return {
                    value: v.name,
                    label: v.name,
                    title: v.description
                };
            }), 'label');
        }

        let resolutions = _.sortBy(this.props.referenceData.resolutions.map(v => {
            return {
                value: v.name,
                label: v.name,
                title: v.description
            };
        }), 'label');

        let customFields = _.sortBy(this.props.referenceData.fields.map(v => {
            return {
                value: v.id,
                label: v.name,
                title: v.description
            };
        }), 'label');

        let statuses = null; // only available once project selected
        if(this.state.project && this.props.referenceData.projects[this.state.project]) {
            let issueTypesAndStatuses = this.props.referenceData.projects[this.state.project].statuses;
            let selectedIssueTypes = this.state.issueTypes || [];

            statuses =
            _.uniq(
                _.sortBy(
                    _.flatten(
                        _.pluck(
                            _.filter(
                                issueTypesAndStatuses,
                                issueType => { return _.includes(selectedIssueTypes, issueType.name); }
                            ),
                            'statuses'
                        )
                    ),
                    'name'
                ),
                true,
                'name'
            );
        }

        return (
            <form className="form-horizontal" onSubmit={this.onSubmit}>

                <div className="form-group">
                    <label htmlFor="inputName" className="col-xs-3 control-label">Name</label>
                    <div className="col-xs-9">
                        <input id="inputName" type="text" className="form-control" placeholder="My analysis" valueLink={this.linkState('name')} required />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="inputProject" className="col-xs-3 control-label">Project</label>
                    <div className="col-xs-9">
                        <Select
                            id="inputProject"
                            name="project"
                            options={projects}
                            optionRenderer={optionRenderer}
                            value={this.state.project}
                            onChange={selectLink('project')}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="inputIssueTypes" className="col-xs-3 control-label">Issue types</label>
                    <div className="col-xs-9">
                        <Select
                            multi={true}
                            id="inputIssueTypes"
                            name="issueTypes"
                            options={issueTypes}
                            optionRenderer={optionRenderer}
                            disabled={issueTypes === null}
                            placeholder={issueTypes === null? "Please select a project first" : "Select..."}
                            value={this.state.issueTypes}
                            onChange={selectLink('issueTypes', true)}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="inputResolutions" className="col-xs-3 control-label">Valid resolutions</label>
                    <div className="col-xs-9">
                        <Select
                            multi={true}
                            id="inputResolutions"
                            name="validResolutions"
                            options={resolutions}
                            optionRenderer={optionRenderer}
                            value={this.state.validResolutions}
                            onChange={selectLink('validResolutions', true)}
                        />
                    </div>
                </div>


                <div className="form-group">
                    <label htmlFor="inputFields" className="col-xs-3 control-label">Additional fields</label>
                    <div className="col-xs-9">
                        <Select
                            multi={true}
                            id="inputFields"
                            name="customFields"
                            options={customFields}
                            optionRenderer={optionRenderer}
                            value={this.state.customFields}
                            onChange={selectLink('customFields', true)}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="inputJQL" className="col-xs-3 control-label">Additional JQL filter</label>
                    <div className="col-xs-9">
                        <input id="inputJQL" type="text" className="form-control" valueLink={this.linkState('jqlFilter')} />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="inputCycle" className="col-xs-3 control-label">Cycle</label>
                    <div className="col-xs-9">
                        <KanbanSetup statuses={statuses} value={this.state.cycle} onChange={selectLink('cycle')} />
                    </div>
                </div>

                <div className="form-group">
                    <div className="col-xs-offset-3 col-xs-9">
                        <button type="submit" className="btn btn-primary">Create</button>
                    </div>
                </div>

            </form>
        );
    },

    onSubmit: function(e) {
        e.preventDefault();

        // TODO: Validate

        this.props.onSubmit(_.omit(this.state, 'invalid'));
    }


});


export default React.createClass({
    displayName: 'NewAnalysis',
    mixins: [ReactMeteorData],

    getMeteorData: function() {
        let handle = Meteor.subscribe("analyses");

        return {
            ready: handle.ready()
        };
    },

    getInitialState: function() {
        return {
            loading: true,
            referenceData: null
        };
    },

    componentDidMount: function(){
        Meteor.call("getJiraReferenceData", (err, value) => {
            if(this.isMounted()) {
                this.setState({
                    loading: false,
                    referenceData: value
                });
            }
        });
    },

    render: function() {

        if(this.state.loading || !this.data.ready) {
            return <Loading />;
        }

        return (
            <div>
                <h1 className="page-header">New analysis</h1>

                <div className="row">
                    <div className="col-xs-8">
                        <AnalysisForm referenceData={this.state.referenceData} onSubmit={this.create}/>
                    </div>
                    <div className="col-xs-3 col-xs-offset-1 help-block">
                        <p>
                            Use this form to configure an analysis. Others who log in against
                            the same JIRA instance will be able to view it. Anyone in
                            the list of editors will be able to edit it.
                        </p>
                        <p>
                            The analysis will run on issues in the selected project and of
                            the selected type(s).
                        </p>
                        <p>
                            Choose one or more resolutions to allow. This will usually
                            include <em>Done</em>. Unresolved issues are included, but
                            other issues will be ignored.
                        </p>
                        <p>
                            By choosing additional fields to include, you can allow the
                            user viewing the analysis to apply further filters and slices.
                        </p>
                        <p>
                            If you need to filter on anything else, add a snippet
                            of JQL to the <em>Additional JQL filter</em> box.
                        </p>
                        <p>
                            You must then configure the <em>cycle</em> that describes your
                            workflow. Click the empty column (+) to create a new
                            state, and designate it as describing work items either in
                            the backlog (unstarted), in progress, queuing or done.
                            You can re-order states by dragging the columns. Then
                            drag JIRA statuses from the list of unmapped statuses
                            into the appropriate column.
                        </p>
                    </div>
                </div>


            </div>
        );
    },

    create: function(data) {
        console.log(data);
    }

});
