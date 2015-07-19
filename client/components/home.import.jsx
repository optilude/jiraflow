/* jshint esnext:true */
/* global Meteor, React */
"use strict";

import { _, Router } from 'app-deps';

var { Link } = Router;

// React component corresponding to the default route for the app, i.e. the
// home page.

export default React.createClass({
    displayName: 'Home',

    render: function() {
        return (
            <div className="home-page">
                <div className="jumbotron">
                    <h1>JiraFlow</h1>
                    <p>Advanced analysis of JIRA data</p>
                    <p><a className="btn btn-primary btn-lg" role="button">Get started &raquo;</a></p>
                </div>
            </div>
        );
    }

});
