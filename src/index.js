import React from "react";
import { createRoot } from 'react-dom/client';

import { Provider } from 'react-redux'
import store from './redux/store'

import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./style.css";

import "bootstrap/dist/js/bootstrap.js";

import App from "./component/app";

const root = createRoot(document.getElementById("root"));

root.render(
<Provider store={store}>
    <App />
</Provider>
);