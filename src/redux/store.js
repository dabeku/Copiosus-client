import { configureStore } from '@reduxjs/toolkit'
import mainReducer from "./reducers/global";

const store = configureStore({
    reducer: {
        main: mainReducer,
    }
});

export default store;