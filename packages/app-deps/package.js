/* global Package, Npm */
"use strict";

Package.describe({
    name: 'app-deps',
    version: '0.0.1',
    summary: 'Private package that loads NPM dependencies for the app',
    git: '',
    documentation: null
});

// NPM dependenices are listed here, with explicit versions. These can then be
// `required()`d in `client.browserify.js` and `server.js`.

Npm.depends({
    "classnames": "2.1.3",
    "moment": "2.10.6",
    "react-bootstrap": "0.24.5",
    "react-router": "0.13.3",
    "react-router-bootstrap": "0.18.1",
    "exposify": "0.4.3",
    "lodash": "3.10.1",
    "bootbox": "4.4.0",
    "jira-connector": "1.4.1",
    "react-select": "0.6.3",
    "react-dnd": "1.1.7"
});

// Note specific package versions embedded below as well.

Package.onUse(function(api) {
    api.versionsFrom('1.1.0.2');
    api.use([
        'cosmos:browserify',
        'react',
    ], 'client');

    api.use([
        'universe:modules@0.2.0',
    ]);

    api.addFiles([
        'client.browserify.js',
        'client.browserify.options.json'
    ], 'client');

    api.addFiles([
        'server.js',
    ], 'server');

    api.addFiles([
        'main.import.jsx',
        'system-config.js'
    ]);

});
