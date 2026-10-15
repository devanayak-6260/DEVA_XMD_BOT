'use strict';

// MASTER / DEVELOPER authorization configuration and helper.
// Keep the authorization digest private; do not publish it in menus or logs.
const crypto = require('crypto');

const MASTER_DEVELOPER_NUMBER = '916260021735';
const MASTER_DEVELOPER_AUTH_DIGEST = 'dcafff53ee871faff0173f32674d653ab536007feafb2dcea27ed8c78decdb71';

/**
 * Returns true when any normalized sender phone-number ID matches the
 * configured MASTER / DEVELOPER authorization digest.
 * @param {string[]} senderIds normalized sender phone-number IDs
 * @returns {boolean}
 */
function isMasterDeveloper(senderIds) {
  return Array.isArray(senderIds) && senderIds.some(id =>
    crypto.createHash('sha256').update(String(id)).digest('hex') === MASTER_DEVELOPER_AUTH_DIGEST
  );
}

module.exports = {
  MASTER_DEVELOPER_NUMBER,
  isMasterDeveloper
};
