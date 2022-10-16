import React from "react";

import { connect } from 'react-redux'

import {
    setIsCameraAvailable } from '../redux/actions'

import Video from "./video/video.component";

import Log from "../common/log";
import * as Constant from "../common/constant"

class App extends React.Component {

    constructor(props) {
        super(props);

        // A global port used for camera service
        global.portIncrementer = 0;
        global.popover = null;

        this.waitForVideoCount = 0

        this.log = new Log();

        this.state = {
            isVideoAvaiable: false,
            isLoaded: false
        }
    }

    waitForVideo = (resolve) => {
        this.log.info("[waitForVideo].");
        return new Promise((fulfill, reject) => {
            if (window.video) {
                this.log.info("[waitForVideo] Loaded.");
                if (resolve) {
                    resolve();
                } else {
                    fulfill();
                }
            } else {
                this.waitForVideoCount++;
                this.log.info("[waitForVideo] Not yet. Count: " + this.waitForVideoCount);

                if (this.waitForVideoCount >= 25) {
                    this.log.error("[waitForVideo] No video available.");
                    if (resolve) {
                        resolve();
                    } else {
                        fulfill();
                    }
                    return;
                }

                setTimeout(() => {
                    this.log.info("[waitForVideo] Called from timeout.");
                    if (resolve) {
                        this.waitForVideo(resolve);
                    } else {
                        this.waitForVideo(fulfill);
                    }
                }, 100);
            }
        });
    }

    waitForDgram = (resolve) => {
        return new Promise((fulfill, reject) => {
            if (window.dgram) {
                if (resolve) {
                    resolve();
                } else {
                    fulfill();
                }
            } else {
                setTimeout(() => {
                    if (resolve) {
                        this.waitForDgram(resolve);
                    } else {
                        this.waitForDgram(fulfill);
                    }
                }, 100);
            }
        });
    }

    waitForNet = (resolve) => {
        return new Promise((fulfill, reject) => {
            if (window.net) {
                if (resolve) {
                    resolve();
                } else {
                    fulfill();
                }
            } else {
                setTimeout(() => {
                    if (resolve) {
                        this.waitForNet(resolve);
                    } else {
                        this.waitForNet(fulfill);
                    }
                }, 100);
            }
        });
    }

    componentDidMount() {

        document.addEventListener("click", function(evnt){
            if (global.popover) {
                global.popover.hide();
                global.popover = null;
            }
        });

        this.log.info("[componentDidMount] Wait for video.");
        this.waitForVideo()
        .then(() => {
            if (window.video) {
                this.props.setIsCameraAvailable(true);
                this.setState({ isVideoAvaiable: true });
            }
            this.log.info("[componentDidMount] Wait for dgram.");
            return this.waitForDgram();
        })
        .then(() => {
            this.log.info("[componentDidMount] Wait for net.");
            return this.waitForNet();
        })
        .then(() => {
            this.log.info("[componentDidMount] Finished loading.");
            this.setState({ isLoaded: true });
        })
    }
    
    render() {
        const { isLoaded, isVideoAvaiable } = this.state

        var action;

        if (isLoaded === true && isVideoAvaiable === true) {
            action = <Video/>
        } else if (isLoaded === true && isVideoAvaiable === false) {
            action = 
                <div className="flex-container flex-center flex-justify-center pad-top-medium">
                    <div>Could not load video module.</div>
                </div>
        } else {
            action = 
                <div className="flex-container flex-center flex-justify-center pad-top-medium">
                    <div>Trying to load video module.</div>
                </div>
        }

        return (
            <div>
                {action}
                <div id="notification" className="notification">
                    
                </div>
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
)(App)