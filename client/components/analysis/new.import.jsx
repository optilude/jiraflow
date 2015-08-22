/* jshint esnext:true */
/* global Meteor, React */

"use strict";

import { _, ReactBootstrap } from 'app-deps';

import Loading from '../loading';

export default React.createClass({
    displayName: 'NewAnalysis',

    render: function() {
        return (
            <div>
                <h1 className="page-header">New analysis</h1>
                <p className="help-block">
                    Configure a new analysis.
                </p>
            </div>
        );
    }

});
