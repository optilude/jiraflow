/* jshint esnext:true */
/* global Meteor, React, ReactMeteorData */

"use strict";

import { _, classNames } from 'app-deps';

const Status = React.createClass({
    displayName: "Status",

    propTypes: {
        name: React.PropTypes.string.isRequired,
        type: React.PropTypes.oneOf(['normal', 'custom'])
    },

    typeClassMap: {
        'normal': 'label-primary',
        'custom': 'label-warning'
    },

    render: function() {
        let type = this.props.type || "normal";

        return (
            <span className={classNames("label", this.typeClassMap[type])}>{this.props.name}</span>
        );
    }

});

const KanbanColumn = React.createClass({
    displayName: "KanbanColumn",

    propTypes: {
        name: React.PropTypes.string.isRequired,
        type: React.PropTypes.oneOf(['backlog', 'accepted', 'completed']),
        queue: React.PropTypes.bool.isRequired
    },

    typeClassMap: {
        'backlog': 'panel-info',
        'accepted': 'panel-primary',
        'completed': 'panel-success'
    },

    render: function() {
        let typeClass = this.props.queue? "panel-danger" : this.typeClassMap[this.props.type];

        return (
            <div className={classNames("panel" , "kanban-col", typeClass)}>
                <div className="panel-heading">
                    {this.props.name}
                </div>
                <div className="panel-body">
                    {this.props.children}
                </div>
                {/* <div className="panel-footer">
                    <a href="#">Change...</a>
                </div> */}
            </div>
        );
    }

});

const KanbanNewColumn = React.createClass({
    displayName: "KanbanNewColumn",

    propTypes: {

    },

    render: function() {

        return (
            <div className="panel panel-default kanban-col kanban-col-new">
                <div className="panel-body">
                    <span className="glyphicon glyphicon-plus" />
                </div>
            </div>
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
            <div className="panel panel-default unused-statuses">
                <div className="panel-heading">
                    Unmapped statuses
                </div>
                <div className="panel-body">
                    {this.props.statuses.map(s => {
                        return (
                            <span key={s.name} className="label label-success">{s.name}</span>
                        );
                    })}
                </div>
            </div>
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
                    <KanbanNewColumn />
                </KanbanBoard>
                {unusedStatuses? <UnusedStatuses statuses={unusedStatuses} /> : ""}
            </div>
        );
    }

});
