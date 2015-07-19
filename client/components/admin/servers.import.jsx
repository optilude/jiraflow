/* jshint esnext: true */
/* global Meteor, React, ReactMeteorData */
"use strict";

import { _, Router, ReactBootstrap, bootbox } from 'app-deps';
import { Servers } from 'lib/models';

import Loading from '../loading';

var { Link } = Router;
var { Alert, Input, Button, ButtonToolbar, PanelGroup, Panel, Modal } = ReactBootstrap;

export default React.createClass({
    displayName: 'AdminServers',

    render: function() {
        return (
            <div>
                <h1 className="page-header">Manage servers</h1>
                <p>
                    Use the list below to manage servers.
                </p>

                <ManageServers />
            </div>
        );
    }

});

var ManageServers = React.createClass({
    displayName: "ManageServers",
    mixins: [ReactMeteorData],

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
            <div>
                <PanelGroup accordion>
                    {this.data.servers.map((s, i) => {
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

                <AddServer />

            </div>
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

var AddServer = React.createClass({
    displayName: 'AddServer',
    mixins: [ReactBootstrap.OverlayMixin, React.addons.LinkedStateMixin],

    getInitialState: function() {
        return {
            isModalOpen: false,
            invalid: false,
            error: false,
            name: "",
            host: ""
        };
    },

    handleToggle: function() {
        this.setState({
            isModalOpen: !this.state.isModalOpen
        });
    },

    render: function() {
        return (
            <Button onClick={this.handleToggle} bsStyle='success'>+ Add server</Button>
        );
    },

    renderOverlay: function() {
        if (!this.state.isModalOpen) {
            return <span/>;
        }

        return (
            <Modal title='Add server' onRequestHide={this.handleToggle}>
                <div className='modal-body'>
                    {this.state.invalid? <Alert bsStyle='danger'>Name and host are both required</Alert> : ""}
                    {this.state.error? <Alert bsStyle='danger'>An unexpected error ocurred. Please try again.</Alert> : ""}
                    <form className="form-horizontal" onSubmit={this.createProject}>
                        <Input valueLink={this.linkState('name')} type='text' label='Name' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='My server' />
                        <Input valueLink={this.linkState('host')} type='text' label='Host' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='myserver.atlassian.net' />
                    </form>
                </div>
                <div className='modal-footer'>
                    <Button onClick={this.handleToggle}>Close</Button>
                    <Button bsStyle='primary' onClick={this.createServer}>Create</Button>
                </div>
            </Modal>
        );
    },

    createServer: function() {

        var invalid = (!this.state.name || !this.state.host);
        if(invalid) {
            this.setState({invalid: true, error: false});
            return;
        }

        this.setState({invalid: false, error: false});
        Servers.insert({
            name: this.state.name,
            host: this.state.host
        }, (err, _id) => {
            if(err) {
                console.log(err);
                this.setState({invalid: false, error: true});
            } else {
                this.handleToggle();
                this.setState({
                    name: "",
                    host: ""
                });
            }
        });
    }

});

var EditServer = React.createClass({
    displayName: 'EditServer',
    mixins: [ReactBootstrap.OverlayMixin, React.addons.LinkedStateMixin],

    propTypes: {
        server: React.PropTypes.object.isRequired
    },

    getInitialState: function() {
        return {
            isModalOpen: false,
            invalid: false,
            error: false,
            name: this.props.server.name,
            host: this.props.server.host
        };
    },

    handleToggle: function() {
        this.setState({
            isModalOpen: !this.state.isModalOpen
        });
    },

    render: function() {
        return (
            <Button onClick={this.handleToggle} bsSize="small" bsStyle="default">Edit</Button>
        );
    },

    renderOverlay: function() {
        if (!this.state.isModalOpen) {
            return <span/>;
        }

        return (
            <Modal title='Edit server' onRequestHide={this.handleToggle}>
                <div className='modal-body'>
                    {this.state.invalid? <Alert bsStyle='danger'>Name and host are both required</Alert> : ""}
                    {this.state.error? <Alert bsStyle='danger'>An unexpected error ocurred. Please try again.</Alert> : ""}
                    <form className="form-horizontal" onSubmit={this.modifyProject}>
                        <Input valueLink={this.linkState('name')} type='text' label='Name' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='My server' />
                        <Input valueLink={this.linkState('host')} type='text' label='Host' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='myserver.atlassian.net' />
                    </form>
                </div>
                <div className='modal-footer'>
                    <Button onClick={this.handleToggle}>Close</Button>
                    <Button bsStyle='primary' onClick={this.modifyServer}>Modify</Button>
                </div>
            </Modal>
        );
    },

    modifyServer: function() {
        var invalid = (!this.state.name || !this.state.host);
        if(invalid) {
            this.setState({invalid: true, error: false});
            return;
        }

        this.setState({invalid: false, error: false});
        Servers.update(this.props.server._id, {
            $set: {
                name: this.state.name,
                host: this.state.host
            }
        }, (err, _id) => {
            if(err) {
                console.log(err);
                this.setState({invalid: false, error: true});
            } else {
                this.handleToggle();
            }
        });
    }

});
