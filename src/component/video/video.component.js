import React from "react"
import { connect } from 'react-redux'

import CameraList from "./camera-list.component"
import CameraView from "./camera-view.component"

class Video extends React.Component {

    render() {
        return (
            <div>
                <CameraList/>
                <CameraView/>
            </div>
        );
    }
}

function mapStateToProps(state) {
    return {
        
    };
}

export default connect(
    mapStateToProps,
    { }
)(Video);