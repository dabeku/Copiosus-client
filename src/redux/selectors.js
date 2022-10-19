export const getCamerasState = store => store.global.camerasState;
export const getNetworkState = store => store.global.networkState;

export const getCameras = store =>
    getCamerasState(store) ? getCamerasState(store).cameras : [];