export const getCamerasState = store => {
    console.log("Camera state:", store.main.camerasState);
    return store.main.camerasState;
}
export const getNetworkState = store => {
    return store.main.networkState;
}

export const getCameras = store =>
    getCamerasState(store) ? getCamerasState(store).cameras : [];