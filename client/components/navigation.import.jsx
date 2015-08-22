/* jshint esnext:true */
/* global Meteor, React, ReactMeteorData, Roles */
"use strict";

import { _, ReactBootstrap, ReactRouterBootstrap, Router, moment } from 'app-deps';

import { Servers, Analyses } from 'lib/models';

const { Navbar, CollapsibleNav, Nav, NavItem, DropdownButton, MenuItem } = ReactBootstrap;
const { Link } = Router;
const { NavItemLink, MenuItemLink } = ReactRouterBootstrap;

export default React.createClass({
    displayName: 'TopNav',
    mixins: [ReactMeteorData, Router.Navigation],

    getMeteorData: function() {
        Meteor.subscribe("servers");
        Meteor.subscribe("analyses");

        let user = Meteor.user(),
            editor = false;

        if(user && user.services && user.services.jira) {
            let host = user.services.jira.host,
                username = user.services.jira.username;

            let server = Servers.findOne({host: host});
            if(server && server.editors.indexOf(username) >= 0) {
                editor = true;
            }
        }

        return {
            user: user,
            editor: editor,
            analyses: Analyses.find({}, {sort: ["serverId", "name"]}).fetch()
        };
    },

    render: function() {

        let isAdmin = this.data.user? Roles.userIsInRole(this.data.user, ['admin']) : false,
            canEdit = isAdmin || this.data.editor,
            isMeteorUser = Boolean(this.data.user && this.data.user.services && this.data.user.services.password);

        return (
            <Navbar brand={<Link to="home">JiraFlow</Link>} inverse fixedTop toggleNavKey={0}>
                <CollapsibleNav eventKey={0}>
                    <Nav navbar>
                        <DropdownButton ref="analysisMenu" title="Analysis">
                            {canEdit? <MenuItemLink onClick={this.linkClick} to="analysisNew">New&hellip;</MenuItemLink> : ""}
                            {canEdit? <MenuItem divider /> : ""}
                            {this.data.analyses.map(a => {
                                return <MenuItemLink onClick={this.linkClick} to="analysisView" params={{id: a._id}} key={a._id}>{a.name}</MenuItemLink>
                            })}
                        </DropdownButton>
                    </Nav>
                    <Nav navbar right>
                        <DropdownButton ref="userMenu" title={this.data.user? this.data.user.username || this.data.user.profile.name : "Not logged in"}>
                            {isAdmin? <MenuItemLink onClick={this.linkClick} to="adminUsers">Manage users</MenuItemLink> : ""}
                            {isAdmin? <MenuItemLink onClick={this.linkClick} to="adminServers">Manage servers</MenuItemLink> : ""}
                            {isMeteorUser? <MenuItemLink onClick={this.linkClick} to="changePassword">Change password</MenuItemLink> : ""}
                            <MenuItem onClick={this.logout}>Log out</MenuItem>
                        </DropdownButton>
                    </Nav>
                </CollapsibleNav>
            </Navbar>
        );
    },

    linkClick: function(event) {
        // Close menu when we click a link
        this.refs.userMenu.setDropdownState(false);
        this.refs.analysisMenu.setDropdownState(false);
    },

    logout: function(e) {
        e.preventDefault();
        Meteor.logout();

        this.transitionTo("authenticate");
    }

});
