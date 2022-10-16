export const l10n = { };

l10n.common = {
    yes: "Yes",
    no: "No",
    cancel: "Cancel",
    delete: "Delete",
    block: "Block",
    not_logged_in: "You are not logged in.",
    error_no_internet: "No Internet connection."
};

l10n.login = {
    login_missing_fields_error: "Please provide username, password and device name.",
    device_name_already_exists: "Device name already exists.",
    invalid_credentials: "Invalid login credentials.",
    encrypt_generation_failed: "Could not generate secure keys."
}

l10n.register = {
    passwords_dont_match: "Passwords don't match.",
    user_already_exists: "Username already exists.",
    missing_field: "Please provide username, password, password (again), email and device name.",
    accept_terms: "Please accept terms and conditions.",
    too_short_interval: "Please wait a few seconds before registering again.",
    error: "Registration failed.",
    invalid_username: "Invalid username. Allowed characters: a-z A-Z 0-9 _ . , @ ~ + ! # incl. whitespace."
}

l10n.status = {
    online: "Online",
    offline: "Offline"
}

l10n.notification = {
    messages_title: "New messages",
    messages_body: "You have {0} new message(s)."
}

l10n.message = { }
l10n.message.error = {
    decrypt_error: "[Could not decrypt message]",
    meta_error: "[Meta information not set]",
    path_error: "[Absolute path is not set]",
    load_error: "Could not load messages.",
    out_read_file_error_template: "[File '{0}' was successfully sent]",
    in_read_file_error_template: "[File '{0}' was successfully received]",
    no_partner_devices_found: "No devices found. Please refresh and try again",
    no_user_selected: "No user selected. Please select a user."
}

l10n.download = {
    download_file_success_template: "Successfully saved file to: '{0}'."
}
l10n.download.error = { 
    decrypt: "Can't decrypt message."
}

l10n.upload = { }
l10n.upload.error = {
    cant_read_file: "Can't read file.",
    file_too_large: "File size {0} is too large. Max file size: {1}.",
    cant_prepare_message: "Can't prepare message.",
    general_template: "The message could not be sent. Error: {0}"
}

l10n.popover = {
    text: "You can delete or block this user.<br/>What you you want to do?",
}
l10n.popover.logout = {
    text: "Are you sure you want to logout? All messages will be deleted. Files will remain untouched.",
    btn_logout: "Logout"
}
l10n.popover.leave = {
    text: "Are you sure you want to leave<br/>this group? All messages will<br/>be deleted. Files will remain<br/>untouched.",
}

l10n.user = { }
l10n.user.notification = {
    security_key_set_success: "Security key successfully updated.",
    security_key_set_success_fixed_single: "Security key successfully updated. Please press refresh since one message was successfully decrypted.",
    security_key_set_success_fixed_multiple: "Security key successfully updated. Please press refresh since {0} messages were successfully decrypted.",
    security_key_delete_success: "Security key successfully deleted.",
    security_key_update_error: "Security key could not be updated."
}
l10n.user.add = {
    success_template: "User '{0}' successfully added.",
    error: "Could not add user.",
    user_not_found: "User not found.",
    cant_connect_itself: "You can't add yourself.",
    missing_field: "Please provide a username."
}
l10n.user.delete = {
    error: "Could not delete user.",
    success: "User successfully deleted."
}
l10n.user.block = {
    error: "Could not block user."
}

l10n.group = { }
l10n.group.leave = {
    error: "Could not leave group."
}
l10n.group.create = {
    error: "Could not create group."
}

l10n.video = {
    not_connected_to_network: "Not connected. Please connect to a network.",
    update_password_success: "Successfully updated password for camera."
}
