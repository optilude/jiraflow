/* jshint esnext: true */
/* global Meteor, React, ReactMeteorData */
"use strict";

import { _, Router, ReactBootstrap, bootbox } from 'app-deps';
import { Servers } from 'lib/models';

import Loading from '../loading';

const { Link } = Router;
const { Alert, Input, Button, ButtonToolbar, PanelGroup, Panel, Modal } = ReactBootstrap;

export default React.createClass({
    displayName: 'AdminServers',
    mixins: [ReactMeteorData],

    getMeteorData: function() {
        let handle = Meteor.subscribe("servers");

        return {
            ready: handle.ready(),
            servers: Servers.find({}, {sort: {name: 1}}).fetch()
        };
    },

    getInitialState: function() {
        return {
            configurationDetails: null
        };
    },

    componentDidMount: function(){
        Meteor.call("getJiraConfigurationDetails", (err, value) => {
            if(this.isMounted()) {
                this.setState({
                  configurationDetails: value
                });
            }
        });
    },

    render: function() {

        if(!this.data.ready || this.state.configurationDetails === null) {
            return <Loading />;
        }

        return (
            <div>
                <h1 className="page-header">Manage servers</h1>
                <p className="help-block">
                    <span>
                        Here, you can manage the JIRA servers that JiraFlow
                        will allow users to authenticate and make queries against.
                    </span>
                    {this.data.servers.length > 0?
                    <span>
                        &nbsp;Click on a server below to view further details, edit or delete it.
                    </span> : ""}
                </p>

                <ManageServers servers={this.data.servers} />
                <AddServer />
                <ConfigureJira details={this.state.configurationDetails} />
            </div>
        );
    }

});

const ManageServers = React.createClass({
    displayName: "ManageServers",

    propTypes: {
        servers: React.PropTypes.array.isRequired
    },

    render: function() {
        return (
            <PanelGroup accordion>
                {this.props.servers.map((s, i) => {
                    return (
                        <Panel bsStyle="primary" key={s.host} header={s.name} eventKey={i}>
                            <ButtonToolbar style={{float: "right"}}>
                                <EditServer server={s} />
                                <Button bsSize="small" bsStyle="danger" onClick={this.deleteServer.bind(this, s)}>Delete</Button>
                            </ButtonToolbar>
                            <label>Host:</label> <a target="_new" href={"https://" + s.host}>{s.host}</a>
                        </Panel>
                    );
                })}
            </PanelGroup>
        );

    },

    deleteServer: function(server) {
        bootbox.confirm("Are you sure you want to delete " + server.name + "?", function(result) {
            if(result) {
                Servers.remove(server._id, err => {
                    if(err) {
                        bootbox.alert("An unexpected error ocurred: " + err);
                    }
                });
            }
        });
    }

});

const AddServer = React.createClass({
    displayName: 'AddServer',
    mixins: [React.addons.LinkedStateMixin],

    getInitialState: function() {
        return {
            showModal: false,
            invalid: false,
            error: false,
            name: "",
            host: "",
            editors: "",
            projects: ""
        };
    },

    close: function() {
        this.setState({ showModal: false });
    },

    open: function() {
        this.setState({ showModal: true });
    },

    render: function() {
        return (
            <span>
                <Button onClick={this.open} bsStyle='success'>Add server</Button>

                <Modal show={this.state.showModal} onHide={this.close}>
                    <Modal.Header closeButton>
                        <Modal.Title>Add server</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {this.state.invalid? <Alert bsStyle='danger'>Name and host are both required</Alert> : ""}
                        {this.state.error? <Alert bsStyle='danger'>An unexpected error ocurred. Please try again.</Alert> : ""}
                        <form className="form-horizontal" onSubmit={this.createProject}>
                            <Input valueLink={this.linkState('name')} type='text' label='Name' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='My server' />
                            <Input valueLink={this.linkState('host')} type='text' label='Host' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='myserver.atlassian.net' />
                            <Input valueLink={this.linkState('editors')} type='textarea' label='Editors' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='user1, user2' />
                            <Input valueLink={this.linkState('projects')} type='textarea' label='Projects' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='ABC, DEF' />
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.close}>Close</Button>
                        <Button bsStyle='primary' onClick={this.createServer}>Create</Button>
                    </Modal.Footer>
                </Modal>

            </span>
        );
    },

    createServer: function() {

        let invalid = (!this.state.name || !this.state.host);
        if(invalid) {
            this.setState({invalid: true, error: false});
            return;
        }

        this.setState({invalid: false, error: false});
        Servers.insert({
            name: this.state.name,
            host: this.state.host,
            editors: this.state.editors.split(/[,\s]+/).filter( s => { return s; }),
            projects: this.state.projects.split(/[,\s]+/).filter( s => { return s; })
        }, (err, _id) => {
            if(err) {
                console.log(err);
                this.setState({invalid: false, error: true});
            } else {
                this.close();
                this.setState({
                    name: "",
                    host: ""
                });
            }
        });
    }

});

const EditServer = React.createClass({
    displayName: 'EditServer',
    mixins: [React.addons.LinkedStateMixin],

    propTypes: {
        server: React.PropTypes.object.isRequired
    },

    getInitialState: function() {
        return {
            showModal: false,
            invalid: false,
            error: false,
            name: this.props.server.name,
            host: this.props.server.host,
            editors: this.props.server.editors? this.props.server.editors.join(", ") : "",
            projects: this.props.server.projects? this.props.server.projects.join(", ") : ""
        };
    },

    close: function() {
        this.setState({ showModal: false });
    },

    open: function() {
        this.setState({ showModal: true });
    },

    render: function() {
        return (
            <span>
                <Button onClick={this.open} bsSize="small" bsStyle="default">Edit</Button>

                <Modal show={this.state.showModal} onHide={this.close}>
                    <Modal.Header closeButton>
                        <Modal.Title>Edit server</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {this.state.invalid? <Alert bsStyle='danger'>Name and host are both required</Alert> : ""}
                        {this.state.error? <Alert bsStyle='danger'>An unexpected error ocurred. Please try again.</Alert> : ""}
                        <form className="form-horizontal" onSubmit={this.modifyProject}>
                            <Input valueLink={this.linkState('name')} type='text' label='Name' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='My server' />
                            <Input valueLink={this.linkState('host')} type='text' label='Host' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='myserver.atlassian.net' />
                            <Input valueLink={this.linkState('editors')} type='textarea' label='Editors' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='user1, user2' />
                            <Input valueLink={this.linkState('projects')} type='textarea' label='Projects' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='ABC, DEF' />
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.close}>Close</Button>
                        <Button bsStyle='primary' onClick={this.modifyServer}>Modify</Button>
                    </Modal.Footer>
                </Modal>

            </span>
        );
    },

    modifyServer: function() {
        let invalid = (!this.state.name || !this.state.host);
        if(invalid) {
            this.setState({invalid: true, error: false});
            return;
        }

        this.setState({invalid: false, error: false});
        Servers.update(this.props.server._id, {
            $set: {
                name: this.state.name,
                host: this.state.host,
                editors: this.state.editors.split(/[,\s]+/).filter( s => { return s; }),
                projects: this.state.projects.split(/[,\s]+/).filter( s => { return s; })
            }
        }, (err, _id) => {
            if(err) {
                console.log(err);
                this.setState({invalid: false, error: true});
            } else {
                this.close();
            }
        });
    }

});

const ConfigureJira = React.createClass({
    displayName: 'ConfigureJira',

    propTypes: {
        details: React.PropTypes.object.isRequired
    },

    getInitialState: function() {
        return {
            showModal: false,
        };
    },

    close: function() {
        this.setState({ showModal: false });
    },

    open: function() {
        this.setState({ showModal: true });
    },

    render: function() {
        return (
            <span>
                <Button onClick={this.open} bsStyle="link">How to configure JIRA</Button>

                <Modal show={this.state.showModal} onHide={this.close}>
                    <Modal.Header closeButton>
                        <Modal.Title>How to configure JIRA</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p>
                            Before users of JiraFlow can authenticate against a
                            given JIRA instance, you must first configure the remote
                            JIRA instance to accept JiraFlow as an inbound
                            authentication link.
                        </p>
                        <ol className="jira-configuration-instructions">
                            <li>Log in as an administrator and find <em>Application Links</em> under <em>Add-ons</em> in JIRA settings.</li>
                            <li>Create a new application link. You have to enter a URL, but it doesn't need to exist. In fact, it will be faster if it doesn't, so enter e.g. <code>http://localhost:8080</code>.</li>
                            <li>Click <em>Continue</em> and enter the following values
                                <dl>
                                    <dt>Application name:</dt>
                                    <dd><code>JiraFlow</code></dd>

                                    <dt>Application type:</dt>
                                    <dd><code>Generic application</code></dd>

                                    <dt>Service provider name:</dt>
                                    <dd><code>JiraFlow</code> (it doesn't actually matter)</dd>

                                    <dt>Consumer key:</dt>
                                    <dd><code>{this.props.details.consumerKey}</code></dd>

                                    <dt>Shared secret:</dt>
                                    <dd><code>JiraFlow</code></dd>

                                    <dt>Request token URL:</dt>
                                    <dd><code>http://localhost</code> (it doesn't actually matter)</dd>

                                    <dt>Access token URL:</dt>
                                    <dd><code>http://localhost</code> (it doesn't actually matter)</dd>

                                    <dt>Authorize token URL:</dt>
                                    <dd><code>http://localhost</code> (it doesn't actually matter)</dd>

                                    <dt>Create incoming link:</dt>
                                    <dd>Tick the box</dd>
                                </dl>
                            </li>
                            <li>Click <em>Continue</em> again and on the next page, enter:
                                <dl>
                                    <dt>Consumer key:</dt>
                                    <dd><code>{this.props.details.consumerKey}</code></dd>

                                    <dt>Consumer name:</dt>
                                    <dd><code>JiraFlow</code></dd>

                                    <dt>Public key:</dt>
                                    <dd><pre>{this.props.details.publicKey}</pre></dd>
                                </dl>
                            </li>
                            <li>Click <em>Continue</em> one last time, and then wait until it completes.</li>
                            <li>Edit the newly created link, and go to <em>Outgoing authentication</em>.</li>
                            <li>Click <em>Delete</em> to remove it. We won't need it, but JIRA insists that it is configured before incoming authentication.</li>
                        </ol>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.close}>Close</Button>
                    </Modal.Footer>
                </Modal>

            </span>
        );
    },

});
