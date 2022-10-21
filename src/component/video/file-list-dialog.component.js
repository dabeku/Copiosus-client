import React from "react";
import { Modal } from 'react-bootstrap';
import { connect } from 'react-redux'

import { getCamerasState } from '../../redux/selectors'

import * as Constant from "../../common/constant"

import CameraService from "../../service/camera.service"
import Log from "../../common/log";
import { l10n } from "../../common/l10n"

import "./file-list-dialog.component.css";
import Utility from "../../common/utility";

import {
    deleteCameraFile,
    clearCameraFiles,
    setCameraFiles
} from '../../redux/reducers/global'

class FileList extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            isShown: false,
            isLoading: true,
            downloadingFile: null,
            downloadingCount: 0,
            password: localStorage.getItem(Constant.LOCAL_STORAGE_KEY_CAMERA_PASSWORD)
        };

        this.log = new Log();
        this.cameraService = new CameraService();
        this.utility = new Utility();
    }

    open = () => {
        this.setState({
            isShown: true,
            isLoading: false
        }, () => {
            const { camera } = this.props;
            this.props.clearCameraFiles();
            this.cameraService.getCameraInfo(camera.ip, (array) => {
                var splitted = this.utility.arrayBufferToString(array).split(" ");
                var cmd = splitted[0];

                if (cmd === "LIST_FILES") {
                    var files = [];
                    for (var i = 1; i < splitted.length; i++) {
                        var splittedFile = splitted[i].split(";");
                        // The name of the file
                        var value = splittedFile[0];
                        // The size of the file
                        var fileSize = splittedFile[1];
        
                        files.push({
                            fileName: value,
                            fileSizeKb: fileSize
                        });
                    }
                    files.sort(
                        (a, b) => {
                            return a.fileName.localeCompare(b.fileName);
                        }
                    );
                    this.props.setCameraFiles({files: files, isComplete: true});
                }
            });
        });
    }

    close = () => {
        this.setState({
            isShown: false,
            isLoading: true,
            downloadingFile: null,
            downloadingCount: 0,
            password: localStorage.getItem(Constant.LOCAL_STORAGE_KEY_CAMERA_PASSWORD)
        });
    }

    handleDelete = (e, fileName) => {
        this.cameraService.delete(this.props.camera.ip, fileName);
        this.props.deleteCameraFile(fileName);
    }

    handleDownload = (e, fileName) => {
        this.log.info("[handleDownload] Download file '" + fileName + "'.");
        this.cameraService.download(this.props.camera.ip, fileName, (fileName, count) => {
            this.setState({
                downloadingFile: fileName,
                downloadingCount: count
            });
        });
    }

    updateCameraPassword = (e) => {
        e.preventDefault();
        this.setState({
            password: e.target.value
        });
    }

    handleUpdateCameraPassword = (e) => {
        e.preventDefault();
        localStorage.setItem(Constant.LOCAL_STORAGE_KEY_CAMERA_PASSWORD, this.state.password);
        this.utility.showMessage(l10n.video.update_password_success, true);
    };

    handleEnter = (e) => {
        // Enter key
        if (e.charCode === 13) {
            localStorage.setItem(Constant.LOCAL_STORAGE_KEY_CAMERA_PASSWORD, this.state.password);
            this.utility.showMessage(l10n.video.update_password_success, true);
        } 
    }

    render() {
        var list;
        var complete;
        const { isLoading, downloadingFile, downloadingCount, password } = this.state;
        const { files, isComplete } = this.props.camerasState;

        var passwordRaw = "";
        if (password) {
            passwordRaw = password;
        }

        if (isLoading) {
            list = <i className='fa fa-circle-notch fa-spin file-list-spinner'></i>
        } else {
            if (files.length === 0) {
                list = <div className="file-list-message">No files found.</div>
            } else {
                const FileItem = ({files}) => (
                    <div>
                        {files.map(file => {

                            var percent = 0.0;
                            var color = "#00FFFF";
                            if (file.fileName === downloadingFile) {
                                percent = (downloadingCount / 1024 / file.fileSizeKb) * 100;
                                if (percent >= 100) {
                                    color = "#00FF00";
                                }
                            }

                            return <div key={file.fileName} className='list-item-dialog flex-container flex-center' style={{background: 'linear-gradient(90deg, ' + color + ' '+percent+'%, white '+percent+'%'}}>
                                <i className='btn fa fa-trash listItemActionOne' onClick={(e) => {this.handleDelete(e, file.fileName); }}></i>
                                <i className='btn fa fa-file-download listItemActionTwo' onClick={(e) => {this.handleDownload(e, file.fileName); }}></i>
                                <div className='list-item-text file-list-item'>{file.fileName} ({file.fileSizeKb}Kb)</div>
                            </div>
                        })}
                    </div>
                );
                list = <FileItem files={files}/>

                if (isComplete === false) {
                    complete = <div className="error-visible marge-bottom">This list is not complete since we reached max. length.</div>
                }
            }
            
        }

        return (
            <div>
                <button className='btn fas fa-info' title='Info' onClick={(e) => {this.open(e); }}></button>

                <Modal show={this.state.isShown} onHide={this.close} centered>
                    <Modal.Body>
                        {complete}
                        <div className="input-group marge-bottom">
                            <input type="text" className="form-control" placeholder="Password" value={passwordRaw} onChange={this.updateCameraPassword} onKeyPress={(e) => {this.handleEnter(e); }}/>
                            <div className="btn fa fa-save" onClick={(e) => {this.handleUpdateCameraPassword(e); }}></div>
                        </div>
                        {list}
                    </Modal.Body>
                    <Modal.Footer>
                        <button type="button" className="btn btn-text btn-secondary" onClick={this.close}>Close</button>
                    </Modal.Footer>
                </Modal>
            </div>
        );
    }
}

function mapStateToProps(state) {
    return {
        camerasState: getCamerasState(state),
    };
}

export default connect(
    mapStateToProps,
    { deleteCameraFile, clearCameraFiles, setCameraFiles }
)(FileList);