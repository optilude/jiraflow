/* jshint esnext:true */
/* global Meteor, React */

"use strict";

import { _, ReactBootstrap } from 'app-deps';

const { Modal, ProgressBar } = ReactBootstrap;

export default React.createClass({
    displayName: 'Loading',

    render: function() {
        return (
            <div className="please-wait">
                <Modal.Dialog
                    backdrop={false}
                    animation={false}
                    onHide={() => {}}>
                    <Modal.Header>
                        <Modal.Title>Please wait&hellip;</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <ProgressBar active now={100} />
                    </Modal.Body>
                </Modal.Dialog>
            </div>
        );
    }

});
