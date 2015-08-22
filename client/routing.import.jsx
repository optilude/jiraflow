/* jshint esnext:true */
/* global Meteor, React */
"use strict";

import { _, Router } from 'app-deps';

import { Login, ResetPassword, EnrollAccount, ChangePassword} from './components/admin/login';
import { AdminUsers, CreateUser } from './components/admin/users';

import AdminServers from './components/admin/servers';

import Authenticate from './components/authenticate';

import NewAnalysis from './components/analysis/new';
import EditAnalysis from './components/analysis/edit';
import ViewAnalysis from './components/analysis/view';

import App from './components/app';
import Home from './components/home';

var { Route, DefaultRoute } = Router;

// On startup, let the router take over the `main` div in the markup.

Meteor.startup(() => {

    // Define client-side routes using ReactRouter, which is imported as an NPM
    // module in the `app-deps` package.

    var routes = [
        // Account management
        <Route name="authenticate" path="/authenticate" handler={Authenticate}/>,
        <Route name="adminLogin" path="/admin" handler={Login}/>,
        <Route name="resetPassword" path="/reset-password/:token" handler={ResetPassword}/>,
        <Route name="enrollAccount" path="/enroll-account/:token" handler={EnrollAccount}/>,
        <Route name="changePassword" path="/change-password" handler={ChangePassword}/>,

        // App
        <Route name="home" path="/" handler={App}>
            <DefaultRoute handler={Home} />

            <Route name="analysisNew" path="/new-analysis" handler={NewAnalysis}/>
            <Route name="analysisEdit" path="/analysis/:id/edit" handler={EditAnalysis}/>
            <Route name="analysisView" path="/analysis/:id" handler={ViewAnalysis}/>

            <Route name="adminUsers" path="admin/users" handler={AdminUsers}/>
            <Route name="adminCreateUser" path="admin/create-user" handler={CreateUser}/>
            <Route name="adminServers" path="admin/servers" handler={AdminServers}/>
        </Route>
    ];

    var router = Router.create({
        routes: routes,
        location: Router.HistoryLocation
    });

    router.run((Root, state) => {
        React.render(<Root />, document.getElementById('main'));
    });
});
