/*
    The Hanabi game UI
*/

exports.commands = require('./commands');
exports.sounds = require('./sounds');
exports.tooltips = require('./tooltips');

// Imports
const globals = require('../globals');
const misc = require('../misc');

$(document).ready(() => {
    // Disable the right-click context menu while in a game
    $('body').on('contextmenu', '#game', () => false);
});

exports.show = () => {
    globals.currentScreen = 'game';

    $('#page-wrapper').hide(); // We can't fade this out as it will overlap
    $('#game').fadeIn(globals.fadeTime);

    // The Alpha custom nav for tiny resolutions
    $('#navPanel').hide();
    $('#navButton').hide();

    globals.ui = new HanabiUI(globals, globals.gameID, exports);
    globals.ui.setBackend(globals.conn);
};

exports.hide = () => {
    globals.currentScreen = 'lobby';

    globals.ui.destroy();
    globals.ui = null;

    $('#game').hide(); // We can't fade this out as it will overlap
    $('#page-wrapper').fadeIn(globals.fadeTime);

    // The Alpha custom nav for tiny resolutions
    $('#navPanel').show();
    $('#navButton').show();

    // Make sure there are not any game-related tooltips showing
    misc.closeAllTooltips();

    // Scroll to the bottom of the lobby
    const chat = document.getElementById('lobby-chat-text');
    chat.scrollTop = chat.scrollHeight;
};
