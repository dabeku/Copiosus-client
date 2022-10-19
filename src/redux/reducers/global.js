import {
    ACTION_VIDEO_ADD_CAMERA,
    ACTION_VIDEO_UPDATE_CAMERA_STATE,
    ACTION_VIDEO_UPDATE_CAMERA_TEMP,
    ACTION_VIDEO_CLEAR_CAMERAS,
    ACTION_VIDEO_SET_CAMERA_FILES,
    ACTION_VIDEO_CLEAR_CAMERA_FILES,
    ACTION_VIDEO_DELETE_CAMERA_FILE,
    ACTION_SET_NETWORK,
} from '../actionTypes'

const initialState = {
    camerasState: {
        cameras: [],
        files: [],
        isComplete: false
    },
    networkState: {
        ip: null,
        broadcast: null
    }
};

export default function(state = initialState, action) {

    var i = 0;

    switch (action.type) {

        case ACTION_VIDEO_ADD_CAMERA: {

            var newCamera = action.payload.camera;
            var existingCameras = state.camerasState.cameras;
            var foundAddCamera = existingCameras.find(item => item.deviceId === newCamera.deviceId);
            if (foundAddCamera) {
                if (existingCameras.indexOf(foundAddCamera) !== -1) {
                    existingCameras.splice(existingCameras.indexOf(foundAddCamera), 1);
                }
            }
            existingCameras.push(newCamera);

            return {
                ...state,
                camerasState: {
                    ...state.camerasState,
                    cameras: existingCameras
                }
            };
        }

        case ACTION_VIDEO_UPDATE_CAMERA_STATE: {

            var camera = action.payload.camera;
            var updateCameraStateExistingCameras = state.camerasState.cameras;
            var updateCameraStateFoundCamera = updateCameraStateExistingCameras.find(item => item.deviceId === camera.deviceId);
            if (updateCameraStateFoundCamera) {
                var updateCameraStateIndex = updateCameraStateExistingCameras.indexOf(updateCameraStateFoundCamera);
                if (updateCameraStateIndex !== -1) {
                    var updatedCamera = { ...updateCameraStateExistingCameras[updateCameraStateIndex] };
                    updatedCamera.state = camera.state;
                    updateCameraStateExistingCameras[updateCameraStateIndex] = updatedCamera;
                }
            }

            return {
                ...state,
                camerasState: {
                    ...state.camerasState,
                    cameras: updateCameraStateExistingCameras
                }
            };
        }

        case ACTION_VIDEO_UPDATE_CAMERA_TEMP: {

            var cameraTemp = action.payload.camera;
            var updateCameraTempExistingCameras = state.camerasState.cameras;
            var updateCameraTempFoundCamera = updateCameraTempExistingCameras.find(item => item.deviceId === cameraTemp.deviceId);
            if (updateCameraTempFoundCamera) {
                var updateCameraTempIndex = updateCameraTempExistingCameras.indexOf(updateCameraTempFoundCamera);
                if (updateCameraTempIndex !== -1) {
                    var updatedCameraTemp = { ...updateCameraTempExistingCameras[updateCameraTempIndex] };
                    updatedCameraTemp.temperature = cameraTemp.temperature;
                    updateCameraTempExistingCameras[updateCameraTempIndex] = updatedCameraTemp;
                }
            }

            return {
                ...state,
                camerasState: {
                    ...state.camerasState,
                    cameras: updateCameraTempExistingCameras
                }
            };
        }
        
        case ACTION_VIDEO_CLEAR_CAMERAS: {
            return {
                ...state,
                camerasState: {
                    ...state.camerasState,
                    cameras: []
                }
            };
        }

        case ACTION_VIDEO_SET_CAMERA_FILES: {
            return {
                ...state,
                camerasState: {
                    ...state.camerasState,
                    files: action.payload.files,
                    isComplete: action.payload.isComplete
                }
            };
        }

        case ACTION_VIDEO_CLEAR_CAMERA_FILES: {
            return {
                ...state,
                camerasState: {
                    ...state.camerasState,
                    files: [],
                    isComplete: false
                }
            };
        }

        case ACTION_VIDEO_DELETE_CAMERA_FILE: {

            var deleteFile = action.payload.fileName;
            var existingFiles = state.camerasState.files;
            var foundDeleteCameraFile = existingFiles.find(item => item.fileName === deleteFile);
            if (foundDeleteCameraFile) {
                if (existingFiles.indexOf(foundDeleteCameraFile) !== -1) {
                    existingFiles.splice(existingFiles.indexOf(foundDeleteCameraFile), 1);
                }
            }

            return {
                ...state,
                camerasState: {
                    ...state.camerasState,
                    files: existingFiles,
                    isComplete: state.camerasState.isComplete
                }
            };
        }

        case ACTION_SET_NETWORK: {
            return {
                ...state,
                networkState: {
                    ...state.networkState,
                    ip: action.payload.ip,
                    broadcast: action.payload.broadcast
                }
            };
        }


        default:
            console.warn("Reducer: " + action.type + " is not implemented.");
            return state;
    }
}
