import React from "react";

import { connect } from 'react-redux'

import { getCamerasState } from '../../redux/selectors'

import Log from "../../common/log";

import "./camera-view.component.css";

class CameraView extends React.Component {

    constructor(props) {
        super(props);

        this.log = new Log();

        this.deviceFpsMapping = [];
        this.lastInterval = null;

        this.state = {
            isRotated: false,
            deviceFpsMapping: []
        };

        // TODO: Show fps
    }

    componentDidMount() {
        this.initVideo();

        this.lastInterval = setInterval(() => {

            /*for (var key in this.deviceFpsMapping) {
                key = "" + key;
                if (this.deviceFpsMapping.hasOwnProperty(key)) {
                    if (!this.deviceFpsMapping[key]) {
                        fps = fps + "0 ";
                    } else {
                        fps = fps + this.deviceFpsMapping[key] + " ";
                    }
                }
            }*/
            
            for (var key in this.deviceFpsMapping) {
                key = "" + key;
                if (this.deviceFpsMapping.hasOwnProperty(key)) {
                    var canvasPlayer = document.getElementById("canvasPlayer_" + key);
                    if (this.deviceFpsMapping[key] === 0) {
                        if (canvasPlayer !== null) {
                            canvasPlayer.classList.remove("camera-view-ok");
                            if (!canvasPlayer.classList.contains("camera-view-error")) {
                                canvasPlayer.classList.add("camera-view-error");
                            }
                        }
                    } else {
                        if (canvasPlayer !== null) {
                            canvasPlayer.classList.remove("camera-view-error");
                            if (!canvasPlayer.classList.contains("camera-view-ok")) {
                                canvasPlayer.classList.add("camera-view-ok");
                            }
                        }
                    }

                    if (!this.deviceFpsMapping[key]) {
                        let fpsField = document.getElementById("field-fps_" + key);
                        fpsField.innerHTML = "0";
                    } else {
                        let fpsField = document.getElementById("field-fps_" + key);
                        fpsField.innerHTML = "" + this.deviceFpsMapping[key];
                    }
                    this.deviceFpsMapping[key] = 0;
                }
            }
            
        }, 1000);
    }

    componentWillUnmount() {
        this.resetVideo();

        clearInterval(this.lastInterval);
    }

    initVideo = () => {
        this.log.info("[initVideo].");
        window.video.initialize((deviceId, array) => {

            deviceId = "" + deviceId;

            var canvasPlayer = document.getElementById("canvasPlayer_" + deviceId);
            if (canvasPlayer == null) {
                var cameras = this.props.camerasState.cameras;
                var foundCamera = cameras.find(item => item.deviceId === deviceId);
                if (foundCamera) {
                    this.log.warn("Canvas for player for 'canvasPlayer_" + deviceId + "' not available yet. Please wait a bit.");
                } else {
                    // This happens if the user connected to a camera and press reset (camera list) before camera was disconnected
                    //this.log.info("Received stuff for old camera. Ignore.");
                }
            } else {
                if (this.deviceFpsMapping[deviceId] === null) {
                    this.deviceFpsMapping[deviceId] = 0;
                } else {
                    this.deviceFpsMapping[deviceId] = this.deviceFpsMapping[deviceId] + 1;                    
                }
                var buffer = new Uint8Array(array);
                var event = new CustomEvent("update-video", {
                    detail: {
                        deviceId: deviceId,
                        buffer: buffer
                    },
                    bubbles: false,
                    cancelable: true
                });
                // All subsequent frames will update the displayed frame
                canvasPlayer.dispatchEvent(event);
            }
        });
    }

    resetVideo = () => {
        this.log.info("[resetVideo].");
        window.video.reset();
    }

    handleRotateView = (e) => {
        e.preventDefault();
        this.setState({
            isRotated: !this.state.isRotated
        });
    };

    render() {

        const { isRotated } = this.state;
        const { cameras } = this.props.camerasState;

        var classRotated = "";
        if (isRotated === true) {
            classRotated = "rotate180";
        }

        /*var fps = "FPS: ";
        var count = 0;
        for (var key in this.deviceFpsMapping) {
            key = "" + key;
            if (this.deviceFpsMapping.hasOwnProperty(key)) {
                if (!this.deviceFpsMapping[key]) {
                    fps = fps + "0 ";
                } else {
                    fps = fps + this.deviceFpsMapping[key] + " ";
                }
                count++;
            }
        }
        if (count === 0) {
            fps = fps + "0";
        }*/

        const howto = (
            <div id="right" className="right-video-howto">
                <div>Stream your camera and mic from a single-board computer (SBC) on your local network to the Copiosus app.</div>
                <ol className="camera-view-ol">
                    <li className="camera-view-li">Download <a href='https://github.com/dabeku/Copiosus-camera' target="_blank" rel="noopener noreferrer">Copiosus-camera</a> from Github.</li>
                    <li className="camera-view-li">Install it on your single-board computer (SBC) as described on Github.</li>
                    <li className="camera-view-li">Run with <span className="camera-view-code">./cop_sender -platform=mac|linux|win -cmd=start|list -cam=[name] -mic=[name] -pwd=[password]</span></li>
                    <li className="camera-view-li">Press <span className="camera-view-code">Scan Cameras</span>.</li>
                    <li className="camera-view-li"><span className="camera-view-code">Connect</span> to the camera on your local network.</li>
                </ol>
                <div className="marge-bottom">The device will automatically start recording video and audio and save it to a video file.</div>
                <div>If you have any questions please contact us at <b>office(at)verbosus.com</b>.</div>
            </div>
        );
        const content = (
            <div>
                <div id="right" className="right-video">
                    <div id="videoMain" className={"videoMain " + classRotated}>
                    </div>
                </div>
                <div id="bottom" className="bottom">
                    <div className="bottomInner flex-container flex-space-between flex-center">
                        <button className="btn btn-text marge-bottom" onClick={(e) => {this.handleRotateView(e); }}>Rotate</button>
                    </div>
                </div>
            </div>
        );

        if (cameras.length > 0) {
            return (content);
        } else {
            return (howto);
        }
    }
}

function mapStateToProps(state) {
    return {
        camerasState: getCamerasState(state),
    };
}

export default connect(
    mapStateToProps
)(CameraView);