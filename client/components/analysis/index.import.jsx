/* jshint esnext:true */
/* global Meteor, React */

"use strict";

import { View as WIPView, Edit as WIPEdit } from './wip';

export default {
    'wip': {
        label: "Work in Progress",
        view: WIPView,
        edit: WIPEdit
    }
};
