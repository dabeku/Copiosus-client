import React from "react";
import { connect } from 'react-redux'

import { getNetworkState } from '../../redux/selectors'

import webglUtils from '../../raw/webgl-utils'
import m4 from '../../raw/m4'

import CameraService from "../../service/camera.service"
import FileList from "./file-list-dialog.component"
import Log from "../../common/log";
import Utility from "../../common/utility";

import {
    updateCameraTemp
} from '../../redux/reducers/global'

import "./camera-item.component.css";

class CameraItem extends React.Component {

    constructor(props) {
        super(props);

        const camera = this.props.camera;
        this.videoWidth = camera.width;
        this.videoHeight = camera.height;
        this.videoRatio = this.videoWidth / this.videoHeight;

        this.log = new Log();
        this.utility = new Utility();
        this.cameraService = new CameraService(props);

        this.lastUpdateStatusTimeout = null;
    }

    componentDidMount() {
        this.pollUpdateStatus();
    }

    componentWillUnmount() {
        if (this.lastUpdateStatusTimeout) {
            clearTimeout(this.lastUpdateStatusTimeout);
        }
    }

    pollUpdateStatus = () => {
        this.lastUpdateStatusTimeout = setTimeout(() => {
            const camera = this.props.camera;
            this.cameraService.getStatus(camera.ip, (array) => {
                var splitted = this.utility.arrayBufferToString(array).split(" ");
                var deviceId = splitted[1];
                var value = splitted[2];
                var camera = {
                    deviceId: deviceId,
                    temperature: value
                };
                this.props.updateCameraTemp(camera);
            });
            this.pollUpdateStatus();
        }, 10000);
    }

    handleChangeCamera = (e) => {
        e.preventDefault();
        const camera = this.props.camera;
        if (camera.state === "IDLE") {                     
            this.cameraService.startCamera(camera.ip);
        } else if (camera.state.startsWith("CONNECTED")) {
            this.cameraService.stopCamera(camera.deviceId, camera.ip);
        }
    };

    handleResetCamera = (resetIp) => {
        const { camera } = this.props;
        if (camera.state.startsWith("CONNECTED")) {
            var stopPlayer = false;
            if (resetIp === this.props.networkState.ip) {
                stopPlayer = true;
            }
            this.cameraService.resetCamera(camera.deviceId, camera.ip, resetIp, stopPlayer);
        }
    };

    handleConnectCamera = (e) => {
        e.preventDefault();
        const { camera } = this.props;
        if (camera.state.startsWith("CONNECTED")) {
            this.addPlayer(camera.deviceId);
            this.cameraService.connectCamera(camera.deviceId, camera.ip, camera.width, camera.height, camera.hasVideo, camera.hasAudio);
        }
    };

    addPlayer = (deviceId) => {
        var canvasId = "canvasPlayer_" + deviceId;
        var canvasElement = document.getElementById(canvasId);
        if (canvasElement) {
            this.log.info("[addPlayer] Canvas '" + canvasId + "' already exists. Do nothing.");
            return;
        }

        // Add additional player in preview list
        canvasElement = document.createElement("canvas");
        canvasElement.id = "canvasPlayer_" + deviceId;
        canvasElement.className = "canvasMain";
        var videoMain = document.getElementById("videoMain");

        if (videoMain) {
            let canvasMainItems = [];
            for (var i = 0; i < videoMain.children.length; i++) {
                var child = videoMain.children[i];
                if (child.className === "canvasMain") {
                    canvasMainItems.push(child);
                }
            }

            // Recalculate sizes
            var newWidthInPercent = 100;
            var childCount = canvasMainItems.length + 1;
            newWidthInPercent = newWidthInPercent / childCount;

            for (var i = 0; i < childCount - 1; i++) {
                var child = canvasMainItems[i];
                child.style.width = newWidthInPercent + "%";
            }

            canvasElement.style.width = newWidthInPercent + "%";
            videoMain.appendChild(canvasElement);
            // Add canvas to UI
            this.addElement(canvasElement);

            

        } else {
            this.log.error("[addPlayer] Main video element missing.");
        }
    }

    addElement = (canvas) => {
        var gl = canvas.getContext("webgl");
        if (!gl) {
            this.log.error("[addElement] Could not initialize webgl context.");
            return;
        }
        // Setup GLSL program
        var program = webglUtils.createProgramFromScripts(gl, ["drawImage-vertex-shader", "drawImage-fragment-shader"]);

        // Look up where the vertex data needs to go
        var positionLocation = gl.getAttribLocation(program, "a_position");
        var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");
        // Lookup uniforms
        var matrixLocation = gl.getUniformLocation(program, "u_matrix");
        var textureLocation = gl.getUniformLocation(program, "u_texture");
        // Create a buffer for position coordinates
        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        // Put a unit quad in the buffer
        var positions = [
            0, 0,
            0, 1,
            1, 0,
            1, 0,
            0, 1,
            1, 1,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        // Create a buffer for texture coordinates
        var texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        // Put texcoords in the buffer
        var texcoords = [
            0, 0,
            0, 1,
            1, 0,
            1, 0,
            0, 1,
            1, 1,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

        // Create texture
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        var textureInfo = {
            width: 0,
            height: 0,
            texture: tex,
        };

        this.drawImage = (tex, texWidth, texHeight, dstX, dstY) => {

            gl.bindTexture(gl.TEXTURE_2D, tex);
            // Tell WebGL to use our shader program pair
            gl.useProgram(program);
            // Setup the attributes to pull data from our buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
            gl.enableVertexAttribArray(texcoordLocation);
            gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);
            // this matirx will convert from pixels to clip space
            var matrix = m4.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
            // this matrix will translate our quad to dstX, dstY
            matrix = m4.translate(matrix, dstX, dstY, 0);
            // this matrix will scale our 1 unit quad
            // from 1 unit to texWidth, texHeight units

            matrix = m4.scale(matrix, texWidth, texHeight, 1);
            // Set the matrix.
            gl.uniformMatrix4fv(matrixLocation, false, matrix);
            // Tell the shader to get the texture from texture unit 0
            gl.uniform1i(textureLocation, 0);
            // draw the quad (2 triangles, 6 vertices)
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        var self = this;

        canvas.addEventListener("update-video", function (event) {

            var buffer = event.detail.buffer;

            webglUtils.resizeCanvasToDisplaySize(gl.canvas);
            // Tell WebGL how to convert from clip space to pixels
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.texImage2D(
                gl.TEXTURE_2D, // target
                0, // mip level
                gl.RGB, // internal format
                self.videoWidth, self.videoHeight, // width and height
                0, // border
                gl.RGB, //format
                gl.UNSIGNED_BYTE, // type
                buffer // texture data
            );
            var canvasWidth = this.clientWidth;
            var canvasHeight = this.clientHeight;

            var canvasRatio = canvasWidth / canvasHeight;
            var offsetX = 0;
            var offsetY = 0;
            if (canvasRatio > self.videoRatio) {
                var oldWidth = canvasWidth;
                canvasWidth = (self.videoWidth / self.videoHeight) * canvasHeight;
                offsetX = (oldWidth - canvasWidth) / 2;
            } else if (canvasRatio < self.videoRatio) {
                var oldHeight = canvasHeight;
                canvasHeight = (self.videoHeight / self.videoWidth) * canvasWidth;
                offsetY = (oldHeight - canvasHeight) / 2;
            }

            self.drawImage(
                textureInfo.texture,
                canvasWidth,
                canvasHeight,
                offsetX,
                offsetY);
        });
    }

    render() {

        const { camera } = this.props;

        // Default: IDLE
        var state = "fa-play";
        var stateDesc = "Start";
        if (camera.state.startsWith("CONNECTED")) {
            state = "fa-stop";
            stateDesc = "Stop";
        }

        var stateStr = camera.state;
        var splitted = [];
        
        var redirectBtn = "";
        if (stateStr.startsWith("CONNECTED")) {
            // CONNECTED;192.168.178.20:V;192.168.178.21:V
            splitted = camera.state.split(";");
            stateStr = splitted[0];
            // Remove first element
            splitted = splitted.slice(1);
            // The IP the camera is connected to
            var isConnectedToMe = false;

            for (var i = 0; i < splitted.length; i++) {
                var stateIp = splitted[i].split(":")[0];
                if (stateIp.length === 0) {
                    continue;
                }
                if (stateIp === this.props.networkState.ip) {
                    isConnectedToMe = true;
                }
            }
            
            if (isConnectedToMe === false) {
                redirectBtn = <button className='btn fas marge-right-small fa-wifi' title='Connect' onClick={(e) => {this.handleConnectCamera(e); }}></button>    
            }
        }

        var capabilities = "";
        if (camera.hasVideo === "1") {
            capabilities = "(video)";
        }
        if (camera.hasAudio === "1") {
            capabilities += "(audio)";
        }

        var tempStr = "";
        if (camera.temperature) {
            var tempValue = (camera.temperature / 1000).toFixed(1);
            if (tempValue > 50) {
                tempStr = <span className="camera-item-temp-avg">{tempValue}°C</span>
            } else if (tempValue > 70) {
                tempStr = <span className="camera-item-temp-high">{tempValue}°C</span>
            } else {
                tempStr = <span className="camera-item-temp-low">{tempValue}°C</span>
            }
        }

        const ConnectedCameras = ({splitted}) => (
            <div>
                {splitted.map(item => {
                    var stateIp = item.split(":")[0];
                    if (stateIp.length === 0) {
                        return "";
                    }
                    return <div key={item} className='flex-container flex-center pad-top-small'>
                        <span className='marge-right-small flex-grow'>{stateIp}</span>
                        <button className='btn fas marge-right-small fa-times' onClick={(e) => {this.handleResetCamera(stateIp); }}></button>
                    </div>
                })
            }
            </div>
        );

        return (
            <div>
                <div className="flex-container flex-space-between marge-top-small">
                    <div>{camera.ip}</div>
                    <div>{tempStr}</div>
                </div>
                <div className='flex-container flex-space-between flex-center'>
                    <div className="flex-grow list-item-camera">
                        {camera.hostname} {capabilities}<br/>
                        <div className='cntVideoState'>{stateStr}</div>
                        <ConnectedCameras splitted={splitted}/>
                    </div>
                    <div className='flex-container'>
                        {redirectBtn}
                        <button className={'btn fas marge-right-small ' + state} title={stateDesc} onClick={(e) => {this.handleChangeCamera(e); }}></button>
                        <FileList camera={camera}/>
                    </div>
                </div>
            </div>
            
        );
    }
}

function mapStateToProps(state) {
    return {
        networkState: getNetworkState(state)
    };
}

export default connect(
    mapStateToProps,
    { updateCameraTemp }
)(CameraItem);