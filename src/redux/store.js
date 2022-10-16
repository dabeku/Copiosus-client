import { createStore, applyMiddleware } from "redux";
import rootReducer from "./reducers";
import logger from 'redux-logger'

// TODO: Deprecated
const store = createStore(
    rootReducer,
    applyMiddleware(logger)
);

export default store;