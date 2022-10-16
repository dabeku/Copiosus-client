import {
    ACTION_VIDEO_ADD_CAMERA,
    ACTION_VIDEO_UPDATE_CAMERA_STATE,
    ACTION_VIDEO_UPDATE_CAMERA_TEMP,
    ACTION_VIDEO_CLEAR_CAMERAS,
    ACTION_VIDEO_SET_CAMERA_FILES,
    ACTION_VIDEO_CLEAR_CAMERA_FILES,
    ACTION_VIDEO_DELETE_CAMERA_FILE,
    ACTION_SET_NETWORK,
} from './actionTypes'

/*
 * Cameras
 */

export const addCamera = (camera) => ({
    type: ACTION_VIDEO_ADD_CAMERA,
    payload: { camera }
});

export const updateCameraState = (camera) => ({
    type: ACTION_VIDEO_UPDATE_CAMERA_STATE,
    payload: { camera }
});

export const updateCameraTemp = (camera) => ({
    type: ACTION_VIDEO_UPDATE_CAMERA_TEMP,
    payload: { camera }
});

export const clearCameras = () => ({
    type: ACTION_VIDEO_CLEAR_CAMERAS,
    payload: { }
});

/*
 * Files of cameras
 */
export const setCameraFiles = (files, isComplete) => ({
    type: ACTION_VIDEO_SET_CAMERA_FILES,
    payload: { files, isComplete }
});

export const clearCameraFiles = () => ({
    type: ACTION_VIDEO_CLEAR_CAMERA_FILES,
    payload: { }
});

export const deleteCameraFile = (fileName) => ({
    type: ACTION_VIDEO_DELETE_CAMERA_FILE,
    payload: { fileName }
});

/*
 * Network
 */
export const setNetwork = (ip, broadcast) => ({
    type: ACTION_SET_NETWORK,
    payload: { ip, broadcast }
});