/* jshint esnext:true */
/* global Meteor, React, ReactMeteorData, Accounts */
"use strict";

import { _, Router, ReactBootstrap } from 'app-deps';
import { Servers } from 'lib/models';
import Loading from './loading';

var { Alert, Button, Input } = ReactBootstrap;

export default React.createClass({
    displayName: 'Authenticate',
    mixins: [ReactMeteorData, React.addons.LinkedStateMixin, Router.Navigation],

    getInitialState: function() {
        return {
            host: "",
            error: false
        };
    },

    getMeteorData: function() {
        var handle = Meteor.subscribe("servers");

        return {
            ready: handle.ready(),
            servers: Servers.find({}, {sort: {name: 1}}).fetch()
        };
    },

    render: function() {

        if(!this.data.ready) {
            return <Loading />;
        }

        return (
            <div className="container">
                <form className="form-signin" onSubmit={this.onSubmit}>
                    <h2 className="form-signin-heading">Authenticate with JIRA</h2>

                    <p className="help-block">
                        Choose a JIRA server to let JiraFlow to make
                        queries on your behalf. Your JIRA username and password
                        will <em>not</em> be accessible to JiraFlow.
                    </p>

                    {this.state.error? <Alert bsStyle="danger">An error occurred - please try again.</Alert> : ""}

                    <Input type="select" labelClassName="sr-only" label="Host" required placeholder="Role" valueLink={this.linkState('host')}>
                        {this.data.servers.map(s => {
                            return (<option key={s.host} value={s.host}>{s.name}</option>);
                        })}
                    </Input>

                    <Button bsStyle="primary" block type="submit">Authorise</Button>
                </form>
            </div>
        );
    },

    onSubmit: function(e) {
        e.preventDefault();

        Meteor.loginWithJira({
            jiraHost: this.state.host
        }, (err) => {
            if(err) {
                console.log(err);
                this.setState({
                    error: true
                });
            } else {
                this.transitionTo("home");
            }
        });
    }
});
