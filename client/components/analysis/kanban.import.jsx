/* jshint esnext:true */
/* global Meteor, React */

"use strict";

import { _, classNames, ReactBootstrap, ReactSelect as Select, ReactDnD } from 'app-deps';
import { StatusTypes } from 'lib/models';

const { Label, Panel, Modal, Alert, Input, Button } = ReactBootstrap;

// Drag-and-drop handling

const DnDItemTypes = {
    Column: 'Column',
    Status: 'Status'
};

const ColumnDragSource = {

    beginDrag(props) {
        return {
            id: props.id,
            originalIndex: props.getIndex(props.id)
        };
    }

};

const ColumnDropTarget = {

    canDrop() {
        return false;
    },

    hover(props, monitor) {
        const { id: draggedId } = monitor.getItem();
        const { id: overId } = props;

        if (draggedId !== overId) {
            const overIndex = props.getIndex(overId);
            props.onMove(draggedId, overIndex);
        }
    }
};

// End drag-and-drop handling

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

    render() {
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
        knownStatuses: React.PropTypes.array.isRequired,
        existingColumnNames: React.PropTypes.array.isRequired,
        onCreate: React.PropTypes.func.isRequired,
    },

    getInitialState() {
        return {
            showModal: false,
            invalid: false,
            nameNotUnique: false,
            name: null,
            type: StatusTypes.backlog,
            statuses: []
        };
    },

    close() {
        this.setState({ showModal: false });
    },

    open() {
        this.setState({ showModal: true });
    },

    render() {

        const selectLink = (field, multiple) => {
            return (v, m) => {
                let opts = {};
                opts[field] = multiple? _.pluck(m, 'value') : v;
                this.setState(opts);
            };
        };

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
                        {this.state.nameNotUnique? <Alert bsStyle='danger'>Column name already in use</Alert> : ""}
                        <form className="form-horizontal" onSubmit={this.create}>
                            <Input valueLink={this.linkState('name')} type='text' label='Name' labelClassName="col-xs-3" wrapperClassName="col-xs-9" placeholder='To do' />
                            <Input valueLink={this.linkState('type')} defaultValue={this.state.type} type='select' label='Type' labelClassName="col-xs-3" wrapperClassName="col-xs-9">
                                <option value={StatusTypes.backlog}>Backlog</option>
                                <option value={StatusTypes.accepted}>In progress</option>
                                <option value="_queue">Queue</option>
                                <option value={StatusTypes.completed}>Completed</option>
                            </Input>
                            <div className="form-group">
                                <label className="col-xs-3 control-label">JIRA statuses</label>
                                <div className="col-xs-9">
                                    <Select
                                        multi={true}
                                        options={this.props.knownStatuses.map(s => { return { value: s, label: s }; })}
                                        allowCreate={true}
                                        value={this.state.statuses}
                                        onChange={selectLink('statuses', true)}
                                    />
                                </div>
                            </div>
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

    create(e) {
        e.preventDefault();

        if(!this.state.name) {
            this.setState({invalid: true});
            return;
        }

        if(_.includes(this.props.existingColumnNames, this.state.name)) {
            this.setState({nameNotUnique: true});
            return;
        }

        this.props.onCreate({
            name: this.state.name,
            type: this.state.type === "_queue"? StatusTypes.accepted : this.state.type,
            queue: this.state.type === "_queue"? true : false,
            statuses: this.state.statuses
        });

        this.setState(this.getInitialState());
    }

});

const EditColumn = React.createClass({
    displayName: "EditColumn",
    mixins: [React.addons.LinkedStateMixin],

    propTypes: {
        knownStatuses: React.PropTypes.array.isRequired,
        existingColumnNames: React.PropTypes.array.isRequired,
        state: React.PropTypes.object.isRequired,
        onEdit: React.PropTypes.func.isRequired,
    },

    getInitialState() {
        return {
            showModal: false,
            invalid: false,
            nameNotUnique: false,
            name: this.props.state.name,
            type: this.props.state.queue? "_queue" : this.props.state.type,
            statuses: _.clone(this.props.state.statuses)
        };
    },

    close() {
        this.setState({ showModal: false });
    },

    open() {
        this.setState({ showModal: true });
    },

    render() {

        const selectLink = (field, multiple) => {
            return (v, m) => {
                let opts = {};
                opts[field] = multiple? _.pluck(m, 'value') : v;
                this.setState(opts);
            };
        };

        return (
            <span>
                <Button bsStyle="link" onClick={this.open}>Modify&hellip;</Button>

                <Modal show={this.state.showModal} onHide={this.close}>
                    <Modal.Header closeButton>
                        <Modal.Title>Edit column</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {this.state.invalid? <Alert bsStyle='danger'>Name and type are both required</Alert> : ""}
                        {this.state.nameNotUnique? <Alert bsStyle='danger'>Column name already in use</Alert> : ""}
                        <form className="form-horizontal" onSubmit={this.edit}>
                            <Input valueLink={this.linkState('name')} type='text' label='Name' labelClassName="col-xs-3" wrapperClassName="col-xs-9" placeholder='In progress' />
                            <Input valueLink={this.linkState('type')} defaultValue={this.state.type} type='select' label='Type' labelClassName="col-xs-3" wrapperClassName="col-xs-9">
                                <option value={StatusTypes.backlog}>Backlog</option>
                                <option value={StatusTypes.accepted}>In progress</option>
                                <option value="_queue">Queue</option>
                                <option value={StatusTypes.completed}>Completed</option>
                            </Input>
                            <div className="form-group">
                                <label className="col-xs-3 control-label">JIRA statuses</label>
                                <div className="col-xs-9">
                                    <Select
                                        multi={true}
                                        options={this.props.knownStatuses.map(s => { return { value: s, label: s }; })}
                                        allowCreate={true}
                                        value={this.state.statuses}
                                        onChange={selectLink('statuses', true)}
                                    />
                                </div>
                            </div>
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

    edit(e) {
        e.preventDefault();

        if(!this.state.name) {
            this.setState({invalid: true});
            return;
        } else {
            this.setState({invalid: false});
        }

        if(this.props.state.name !== this.state.name && _.includes(this.props.existingColumnNames, this.state.name)) {
            this.setState({nameNotUnique: true});
            return;
        } else {
            this.setState({nameNotUnique: false});
        }

        this.props.onEdit({
            name: this.state.name,
            type: this.state.type === "_queue"? StatusTypes.accepted : this.state.type,
            queue: this.state.type === "_queue"? true : false,
            statuses: this.state.statuses
        });

        this.close();
    }

});

const KanbanColumn =
ReactDnD.DropTarget(DnDItemTypes.Column, ColumnDropTarget, (connect) => ({
    connectDropTarget: connect.dropTarget()
}))(
ReactDnD.DragSource(DnDItemTypes.Column, ColumnDragSource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
}))(
React.createClass({
    displayName: "KanbanColumn",

    propTypes: {
        id: React.PropTypes.string.isRequired,

        state: React.PropTypes.object.isRequired,
        knownStatuses: React.PropTypes.array.isRequired,
        existingColumnNames: React.PropTypes.array.isRequired,

        onEdit: React.PropTypes.func.isRequired,
        onMove: React.PropTypes.func.isRequired,
        getIndex: React.PropTypes.func.isRequired,

        // ReactDnD props
        connectDropTarget: React.PropTypes.func.isRequired,
        connectDragSource: React.PropTypes.func.isRequired,
        connectDragPreview: React.PropTypes.func.isRequired,
        isDragging: React.PropTypes.bool.isRequired
    },

    render() {

        let typeClass = this.props.state.queue? "danger" : "primary";
        switch(this.props.state.type) {
            case StatusTypes.backlog:
                typeClass = "info";
                break;
            case StatusTypes.completed:
                typeClass = "success";
        }

        let edit = <EditColumn knownStatuses={this.props.knownStatuses} existingColumnNames={this.props.existingColumnNames} state={this.props.state} onEdit={this.props.onEdit} />,
            header = this.props.connectDragSource(<div>{this.props.state.name}</div>),
            opacity = this.props.isDragging? 0 : 1;

        return this.props.connectDragPreview(this.props.connectDropTarget(
            <Panel className="kanban-col" bsStyle={typeClass} header={header} footer={edit} style={{opacity}}>
                {this.props.state.statuses.map(s => {
                    return (
                        <Status key={s} name={s} type={_.includes(this.props.knownStatuses, s)? "normal" : "custom"} />
                    );
                })}
            </Panel>
        ));
    }

})));

const KanbanBoard = React.createClass({
    displayName: "KanbanBoard",

    render() {
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

    render() {
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

export default ReactDnD.DragDropContext(ReactDnD.HTML5)(React.createClass({
    displayName: "KanbanSetup",

    propTypes: {
        statuses: React.PropTypes.array,
        value: React.PropTypes.array,
        onChange: React.PropTypes.func.isRequired
    },

    render() {

        if(this.props.statuses === null) {
            return <div className="help-block">Please select a project and one or more issue types first</div>;
        }

        let cycle = this.props.value || [],
            knownStatuses = _.pluck(this.props.statuses, 'name'),
            usedStatuses = _.flatten(_.pluck(cycle, 'statuses')),
            unusedStatuses = knownStatuses.filter(v => { return !_.includes(usedStatuses, v); }),
            existingColumnNames = _.pluck(cycle, 'name');

        return (
            <div>
                <KanbanBoard>
                    {cycle.map((c, i) => {
                        return (
                            <KanbanColumn
                                id={c.name}
                                key={c.name}
                                state={c}
                                knownStatuses={knownStatuses}
                                existingColumnNames={existingColumnNames}
                                onEdit={this.editColumn.bind(this, i)}
                                onMove={this.moveColumn}
                                getIndex={this.getIndex}
                                />
                        );
                    })}
                    <NewColumn knownStatuses={knownStatuses} existingColumnNames={existingColumnNames} onCreate={this.addColumn}/>
                </KanbanBoard>
                <UnusedStatuses statuses={unusedStatuses} />
            </div>
        );
    },

    addColumn(col) {
        let value = _.clone(this.props.value || []);
        value.push(col);
        this.props.onChange(value);
    },

    editColumn(idx, col) {
        let value = _.clone(this.props.value || []);
        value[idx] = col;
        this.props.onChange(value);
    },

    getIndex(id) {
        return _.findIndex(this.props.value || [], v => { return v.name === id; });
    },

    moveColumn(id, toIdx) {
        let value = _.clone(this.props.value || []),
            fromIdx = this.getIndex(id);

        value.splice(toIdx, 0, value.splice(fromIdx, 1)[0]);
        this.props.onChange(value);
    }

}));
