/* jshint esnext:true */
/* global Meteor, React */

"use strict";

import { _, classNames, ReactBootstrap } from 'app-deps';
import { StatusTypes } from 'lib/models';

const { Label, Panel, Modal, Alert, Input, Button } = ReactBootstrap;

const Status = React.createClass({
    displayName: "Status",

    propTypes: {
        name: React.PropTypes.string.isRequired,
        type: React.PropTypes.oneOf(['normal', 'custom'])
    },

    typeClassMap: {
        'normal': 'primary',
        'custom': 'warning'
    },

    render: function() {
        let type = this.props.type || "normal";

        return (
            <Label bsStyle={this.typeClassMap[type]}>{this.props.name}</Label>
        );
    }

});

const KanbanColumn = React.createClass({
    displayName: "KanbanColumn",

    propTypes: {
        name: React.PropTypes.string.isRequired,
        type: React.PropTypes.oneOf([StatusTypes.backlog, StatusTypes.accepted, StatusTypes.completed]),
        queue: React.PropTypes.bool.isRequired
    },

    render: function() {

        let typeClass = this.props.queue? "danger" : "primary";
        switch(this.props.type) {
            case StatusTypes.backlog:
                typeClass = "info";
                break;
            case StatusTypes.completed:
                typeClass = "success";
        }

        return (
            <Panel className="kanban-col" bsStyle={typeClass} header={this.props.name}>
                {this.props.children}
            </Panel>
        );
    }

});

const KanbanNewColumn = React.createClass({
    displayName: "KanbanNewColumn",
    mixins: [React.addons.LinkedStateMixin],

    propTypes: {
        onCreate: React.PropTypes.func.isRequired,
    },

    getInitialState: function() {
        return {
            showModal: false,
            invalid: false,
            name: null,
            type: null
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
                <Panel className="kanban-col kanban-col-new" bsStyle="default" onClick={this.open}>
                    <span className="glyphicon glyphicon-plus" />
                </Panel>

                <Modal show={this.state.showModal} onHide={this.close}>
                    <Modal.Header closeButton>
                        <Modal.Title>Add column</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {this.state.invalid? <Alert bsStyle='danger'>Name and type are both required</Alert> : ""}
                        <form className="form-horizontal" onSubmit={this.createProject}>
                            <Input valueLink={this.linkState('name')} type='text' label='Name' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='In progress' />
                            <Input valueLink={this.linkState('type')} type='select' label='Type' labelClassName="col-xs-2" wrapperClassName="col-xs-10">
                                <option value={StatusTypes.backlog}>Backlog</option>
                                <option value={StatusTypes.accepted}>In progress</option>
                                <option value="_queue">Queue</option>
                                <option value={StatusTypes.completed}>Completed</option>
                            </Input>
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.close}>Close</Button>
                        <Button bsStyle='primary' onClick={this.create}>Create</Button>
                    </Modal.Footer>
                </Modal>

            </span>
        );
    },

    create: function() {

        let invalid = (!this.state.name || !this.state.type);
        if(invalid) {
            this.setState({invalid: true});
            return;
        }

        this.props.onCreate({
            name: this.state.name,
            type: this.state.type === "_queue"? StatusTypes.accepted : this.state.type,
            queue: this.state.type === "_queue"? true : false,
            statuses: []
        });

        this.setState(this.getInitialState());
    }

});


const KanbanBoard = React.createClass({
    displayName: "KanbanBoard",

    render: function() {
        return (
            <div className="kanban-board">
                {this.props.children}
            </div>
        );
    }

});

const UnusedStatuses = React.createClass({
    displayName: "UnusedStatuses",

    propTypes: {
        statuses: React.PropTypes.array.isRequired
    },

    render: function() {
        return (
            <Panel className="unused-statuses" bsStyle="default" header="Unmapped statuses">
                {this.props.statuses.map(s => {
                    return (
                        <span key={s.name} className="label label-success">{s.name}</span>
                    );
                })}
            </Panel>
        );
    }

});

export default React.createClass({
    displayName: "KanbanSetup",

    propTypes: {
        statuses: React.PropTypes.array,
        value: React.PropTypes.array,
        onChange: React.PropTypes.func.isRequired
    },

    render: function() {

        if(this.props.statuses === null) {
            return <div className="help-block">Please select a project and one or more issue types first</div>;
        }

        let cycle = this.props.value || [],
            usedStatuses = _.flatten(_.pluck(cycle, 'statuses')),
            unusedStatuses = this.props.statuses.filter(v => { return !_.includes(usedStatuses, v.name); });

        return (
            <div>
                <KanbanBoard>
                    {cycle.map(c => {
                        return (
                            <KanbanColumn key={c.name} name={c.name} type={c.type} queue={c.queue}>
                                {c.statuses.map(s => {
                                    return (
                                        <Status key={s} name={s} type="normal" />
                                    );
                                })}
                            </KanbanColumn>
                        );
                    })}
                    <KanbanNewColumn onCreate={this.addColumn}/>
                </KanbanBoard>
                <UnusedStatuses statuses={unusedStatuses} />
            </div>
        );
    },

    addColumn: function(col) {
        // TODO: Handle
        console.log(col);
    }

});
