/* jshint esnext:true */
/* global Meteor, React */

"use strict";

import { _, classNames, ReactBootstrap } from 'app-deps';
import { StatusTypes } from 'lib/models';

const { Label, Panel, Modal, Alert, Input, Button } = ReactBootstrap;

// TODO: Implement abililty to add custom statuses
// TODO: Column re-ordering via drag-and-drop
// TODO: Status assignment via drag-and-drop

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

const NewColumn = React.createClass({
    displayName: "NewColumn",
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
                        <form className="form-horizontal" onSubmit={this.create}>
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

    create: function(e) {
        e.preventDefault();

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

const EditColumn = React.createClass({
    displayName: "EditColumn",
    mixins: [React.addons.LinkedStateMixin],

    propTypes: {
        state: React.PropTypes.object.isRequired,
        onEdit: React.PropTypes.func.isRequired,
    },

    getInitialState: function() {
        return {
            showModal: false,
            invalid: false,
            name: this.props.state.name,
            type: this.props.state.queue? "_queue" : this.props.state.type
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
                <Button bsStyle="link" onClick={this.open}>Modify&hellip;</Button>

                <Modal show={this.state.showModal} onHide={this.close}>
                    <Modal.Header closeButton>
                        <Modal.Title>Edit column</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {this.state.invalid? <Alert bsStyle='danger'>Name and type are both required</Alert> : ""}
                        <form className="form-horizontal" onSubmit={this.edit}>
                            <Input valueLink={this.linkState('name')} type='text' label='Name' labelClassName="col-xs-2" wrapperClassName="col-xs-10" placeholder='In progress' />
                            <Input valueLink={this.linkState('type')} defaultValue={this.state.type} type='select' label='Type' labelClassName="col-xs-2" wrapperClassName="col-xs-10">
                                <option value={StatusTypes.backlog}>Backlog</option>
                                <option value={StatusTypes.accepted}>In progress</option>
                                <option value="_queue">Queue</option>
                                <option value={StatusTypes.completed}>Completed</option>
                            </Input>
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.close}>Close</Button>
                        <Button bsStyle='primary' onClick={this.edit}>Modify</Button>
                    </Modal.Footer>
                </Modal>

            </span>
        );
    },

    edit: function(e) {
        e.preventDefault();

        let invalid = (!this.state.name || !this.state.type);
        if(invalid) {
            this.setState({invalid: true});
            return;
        }

        this.props.onEdit({
            name: this.state.name,
            type: this.state.type === "_queue"? StatusTypes.accepted : this.state.type,
            queue: this.state.type === "_queue"? true : false,
            statuses: this.props.state.statuses
        });

        this.close();
    }

});

const KanbanColumn = React.createClass({
    displayName: "KanbanColumn",

    propTypes: {
        state: React.PropTypes.object.isRequired,
        knownStatuses: React.PropTypes.array.isRequired,
        onEdit: React.PropTypes.func.isRequired,
    },

    render: function() {

        let typeClass = this.props.state.queue? "danger" : "primary";
        switch(this.props.state.type) {
            case StatusTypes.backlog:
                typeClass = "info";
                break;
            case StatusTypes.completed:
                typeClass = "success";
        }

        let edit = <EditColumn state={this.props.state} onEdit={this.props.onEdit} />;

        return (
            <Panel className="kanban-col" bsStyle={typeClass} header={this.props.state.name} footer={edit}>
                {this.props.state.statuses.map(s => {
                    return (
                        <Status key={s} name={s} type={_.includes(this.props.knownStatuses, s)? "normal" : "custom"} />
                    );
                })}
            </Panel>
        );
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
                        <Status key={s} name={s} type="normal" />
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
            knownStatuses = _.pluck(this.props.statuses, 'name'),
            usedStatuses = _.flatten(_.pluck(cycle, 'statuses')),
            unusedStatuses = knownStatuses.filter(v => { return !_.includes(usedStatuses, v); });

        return (
            <div>
                <KanbanBoard>
                    {cycle.map((c, i) => {
                        return (
                            <KanbanColumn
                                key={c.name}
                                state={c}
                                knownStatuses={knownStatuses}
                                onEdit={this.editColumn.bind(this, i)}
                                />
                        );
                    })}
                    <NewColumn onCreate={this.addColumn}/>
                </KanbanBoard>
                <UnusedStatuses statuses={unusedStatuses} />
            </div>
        );
    },

    addColumn: function(col) {
        let value = _.clone(this.props.value);
        value.push(col);
        this.props.onChange(value);
    },

    editColumn: function(idx, col) {
        let value = _.clone(this.props.value);
        value[idx] = col;
        this.props.onChange(value);
    }

});
