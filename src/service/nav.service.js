import UserManager from "../manager/user.manager";
import MessageManager from "../manager/message.manager.js";
import Utility from "../common/utility.js";
import Log from "../common/log.js";

export default class NavService {

    constructor(props) {
        this.props = props;

        this.userManager = new UserManager(props);
        this.messageManager = new MessageManager(props);
        this.utility = new Utility();
        this.log = new Log();
    }

    toggleSettings = function() {
        this.props.toggleSettings(true);
    }
}