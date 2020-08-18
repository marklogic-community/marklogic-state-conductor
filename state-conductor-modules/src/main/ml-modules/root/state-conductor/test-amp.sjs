'use strict';

function logMe() {
  let roleNames = xdmp
    .getCurrentRoles()
    .toArray()
    .map((id) => xdmp.roleName(id));
  xdmp.log(`roles: ${roleNames}`);
  return roleNames;
}

//exports.logMe = module.amp(logMe);

module.exports = {
  logMe: module.amp(logMe),
};
