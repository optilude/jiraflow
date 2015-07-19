/* jshint esnext:true */
/* global Meteor, React, ReactMeteorData, Roles */
"use strict";

import { _, ReactBootstrap, ReactRouterBootstrap, Router, moment } from 'app-deps';

var { Navbar, CollapsibleNav, Nav, NavItem, DropdownButton, MenuItem } = ReactBootstrap;
var { Link } = Router;
var { NavItemLink, MenuItemLink } = ReactRouterBootstrap;

export default React.createClass({
    displayName: 'TopNav',
    mixins: [ReactMeteorData, Router.Navigation],

    getMeteorData: function() {
        var user = Meteor.user();
        return {
            user: user,
            isAdmin: user? Roles.userIsInRole(user, ['admin']) : false,
        };
    },

    render: function() {

        return (
            <Navbar brand={<Link to="home">Meteor/React Example</Link>} inverse fixedTop toggleNavKey={0}>
                <CollapsibleNav eventKey={0}>
                    <Nav navbar>

                    </Nav>
                    <Nav navbar right>
                        <DropdownButton ref="userMenu" title={this.data.user? this.data.user.username || this.data.user.profile.name : "Not logged in"}>
                            {this.data.isAdmin? <MenuItemLink onClick={this.linkClick} to="adminUsers">Manage users</MenuItemLink> : ""}
                            <MenuItemLink onClick={this.linkClick} to="changePassword">Change password</MenuItemLink>
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
    },

    logout: function(e) {
        e.preventDefault();
        Meteor.logout();

        this.transitionTo("authenticate");
    }

});
