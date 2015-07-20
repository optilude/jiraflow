/* jshint esnext:true */
/* global Meteor, React */

"use strict";

import { _, ReactBootstrap } from 'app-deps';

var { Modal, ProgressBar } = ReactBootstrap;

export default React.createClass({
    displayName: 'Loading',

    render: function() {
        return (
            <div className="please-wait modal-open">
                <Modal
                    title='Please wait...'
                    backdrop={false}
                    animation={false}
                    closeButton={false}
                    onRequestHide={() => {}}>
                    <div className='modal-body'>
                        <ProgressBar active now={100} />
                    </div>
                </Modal>
            </div>
        );
    }

});
