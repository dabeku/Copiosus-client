import React from "react";
import { connect } from 'react-redux'

import { getCamerasState,
    getNetworkState } from '../../redux/selectors'

import {
    addCamera,
    updateCameraState,
    clearCameras,
    setNetwork } from '../../redux/actions'

import CameraItem from "./camera-item.component"
import Utility from "../../common/utility";
import Log from "../../common/log";
import * as Constant from "../../common/constant"

import Bridge from "../../common/bridge";

import "./camera-list.component.css";
import CameraService from "../../service/camera.service";

class CameraList extends React.Component {

    constructor(props) {
        super(props);

        this.utility = new Utility();
        this.log = new Log();
        this.bridge = new Bridge();
        this.cameraService = new CameraService();

        this.server = null;
        this.scanner = null;

        var ipInformation = this.utility.getIpInformation();
        var ipRange = "";
        if (ipInformation.length > 0) {
            this.props.setNetwork(ipInformation[0].ip, ipInformation[0].broadcast);
            var ipRangeParts = ipInformation[0].ip.split(".");
            // We assume 192.168.0.1 (4 parts)
            if (ipRangeParts.length === 4) {
                ipRange = ipRangeParts[0] + "." + ipRangeParts[1] + "." + ipRangeParts[2] + ".1-254";
            } else {
                ipRange = ipInformation[0].ip;
            }
        }
        this.state = {
            ipInformation: ipInformation,
            ipRange: ipRange,
            isScanning: false
        };
    }

    componentDidMount() {
        try {
            this.initServer();
        } catch (e) {
            this.log.error("[componentDidMount] Could not start server: " + e);
        }
    }

    componentWillUnmount() {
        this.resetServer();
    }

    initServer = () => {

        this.server = window.net.createServer((client) => {

            this.log.info("[createServer] Client connect. Client local address : " + client.localAddress + ":" + client.localPort + ". client remote address : " + client.remoteAddress + ":" + client.remotePort);
            client.setEncoding("utf-8");
            // 2 seconds
            client.setTimeout(2000);
        
            // When receive client data.
            client.on("data", (message) => {
                this.log.info("[createServer] Received message: " + client.remoteAddress + " -> " + message + " (Length: " + message.length + ")");
                
                var splitted = (""+message).split(" ");
                // STATE = get state, LIST_FILES = get files
                var cmd = splitted[0];
                var deviceId = null;
                var value = null;
        
                if (cmd === "STATE") {
                    // The actual state
                    deviceId = splitted[1];
                    value = splitted[2];

                    var camera = {
                        deviceId: deviceId,
                        state: value
                    };

                    this.props.updateCameraState(camera);
                }
            });
        
            // When client send data complete.
            client.on("end", () => {
                this.log.info("[end] Client disconnect.");
            });
        
            // When client timeout.
            client.on("timeout", () => {
                this.log.warn("[timeout] Client request time out.");
            })
        });

        // Make the server a TCP server listening.
        this.server.listen(Constant.PORT_SERVER_LISTEN, () => {
            // Get server address info.
            var serverInfo = this.server.address();
            var serverInfoJson = JSON.stringify(serverInfo);

            this.log.info("[listen] TCP server listen on address : " + serverInfoJson);

            this.server.on("close", () => {
                this.log.info("[close] TCP server socket is closed.");
            });

            this.server.on("error", (error) => {
                this.log.error("[error]" + JSON.stringify(error));
            });
        });

    }

    resetServer = () => {
        this.server.close(() => {
            this.log.info("[resetServer] Server: Stop.");
        });
    }

    handleScanCameras = (e) => {
        if (this.state.isScanning === true) {
            this.log.warn("[handleScanCameras] Scan already in progress. Do nothing.");
            return;
        }
        e.preventDefault();
        this.scanCameras();
    };

    handleClearCameras = (e) => {
        e.preventDefault();
        this.props.clearCameras();
    }

    handleSelectNetwork = (e, ipInformation) => {
        e.preventDefault();
        this.props.setNetwork(ipInformation.ip, ipInformation.broadcast);
    };

    updateIpRange = (e) => {
        e.preventDefault();
        this.setState({
            ipRange: e.target.value
        });
    }

    scanCameras = () => {
        this.setState({
            isScanning: true
        });
        var ipRange = this.state.ipRange;
        this.cameraService.scanCamerasTcp(ipRange, (array) => {
            this.log.info("[scanCameras] Finished scan.");
            for (var key in array) {
                if (array.hasOwnProperty(key)) {
                    if (array[key].isOnline === true) {
                        this.log.info("[scanCameras] Online: " + key + " (" + array[key].hostname + ").");

                        var camera = {
                            ip: key,
                            hostname: array[key].hostname,
                            deviceId: array[key].deviceId,
                            state: array[key].state,
                            width: array[key].width,
                            height: array[key].height,
                            hasVideo: array[key].hasVideo,
                            hasAudio: array[key].hasAudio,
                        };
    
                        this.props.addCamera(camera);
                    }
                }
            }
            this.setState({
                isScanning: false
            });
        });
    }

    render() {

        const { cameras } = this.props.camerasState;

        var showSpinner = "";
        if (this.state.isScanning === true) {
            showSpinner = <i id="waitCameras" className="fa fa-circle-notch fa-spin camera-list-spinner"></i>
        }

        cameras.sort(
            (a, b) => {
                return a.ip.localeCompare(b.ip);
            }
        );

        const { ip } = this.props.networkState;

        return <div className="left">
            <div className="leftInner">
                <div>
                    <div className="list-group">
                    {this.state.ipInformation.map(ipInformation => {
                        var selectedIpClass = "camera-list-unselected-ip";
                        if (ipInformation.ip === ip) {
                            selectedIpClass = "camera-list-selected-ip";
                        }

                        return (
                            <div key={ipInformation.ip} className={selectedIpClass} onClick={(e) => {this.handleSelectNetwork(e, ipInformation); }}>
                                <div className="flex-container">
                                    <div className="flex-grow">IP:</div>
                                    <div>{ipInformation.ip}</div>
                                </div>
                                <div className="flex-container">
                                    <div className="flex-grow">Broadcast:</div>
                                    <div>{ipInformation.broadcast}</div>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
                <div className="input-group camera-list-container">
                    <input type="text" value={this.state.ipRange} id="tfIpRange" className="form-control" placeholder="IP range" onChange={this.updateIpRange}/>
                    <div id="btnIpRange" className="btn fas fa-search marge-right-small" onClick={(e) => {this.handleScanCameras(e); }}></div>
                    <div id="btnIpRange" className="btn fas fa-undo-alt" onClick={(e) => {this.handleClearCameras(e); }}></div>
                </div>
                {showSpinner}
                <div id="lvCameras" className="list-group">
                    {cameras.map(camera => {
                        return (
                            <div key={camera.deviceId}>
                                <CameraItem camera={camera} selectionUpdated={this.selectionUpdated}/>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    }
}

function mapStateToProps(state) {
    return {
        camerasState: getCamerasState(state),
        networkState: getNetworkState(state)
    };
}

export default connect(
    mapStateToProps,
    { addCamera, updateCameraState, clearCameras, setNetwork }
)(CameraList);