/*
    The screens that show past games and other scores
*/

// Imports
const globals = require('../globals');
const lobby = require('./main');

$(document).ready(() => {
    $('#lobby-history-show-more').on('click', (event) => {
        event.preventDefault();
        globals.historyClicked = true;
        globals.conn.send('historyGet', {
            offset: Object.keys(globals.historyList).length,
            amount: 10,
        });
    });
});

exports.show = () => {
    $('#lobby-history').show();
    $('#lobby-top-half').hide();
    $('#lobby-separator').hide();
    $('#lobby-bottom-half').hide();
    lobby.nav.show('history');
};

exports.hide = () => {
    $('#lobby-history').hide();
    $('#lobby-history-details').hide();
    $('#lobby-top-half').show();
    $('#lobby-separator').show();
    $('#lobby-bottom-half').show();
    lobby.nav.show('games');
};

exports.draw = () => {
    const tbody = $('#lobby-history-table-tbody');

    // Clear all of the existing rows
    tbody.html('');

    // Handle if the user has no history
    const ids = Object.keys(globals.historyList);
    if (ids.length === 0) {
        $('#lobby-history-no').show();
        $('#lobby-history').addClass('align-center-v');
        $('#lobby-history-table-container').hide();
        return;
    }
    $('#lobby-history-no').hide();
    $('#lobby-history').removeClass('align-center-v');
    $('#lobby-history-table-container').show();

    // Sort the game IDs in reverse order
    // (so that the most recent ones are near the top)
    ids.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    ids.reverse();

    // Add all of the history
    for (let i = 0; i < ids.length; i++) {
        const gameData = globals.historyList[ids[i]];
        const { maxScore } = constants.VARIANTS[gameData.variant];

        const row = $('<tr>');

        // Column 1 - Game ID
        $('<td>').html(`#${ids[i]}`).appendTo(row);

        // Column 2 - # of Players
        $('<td>').html(gameData.numPlayers).appendTo(row);

        // Column 3 - Score
        $('<td>').html(`${gameData.score}/${maxScore}`).appendTo(row);

        // Column 4 - Variant
        $('<td>').html(gameData.variant).appendTo(row);

        // Column 5 - Time Completed
        const timeCompleted = dateTimeFormatter.format(new Date(gameData.datetime));
        $('<td>').html(timeCompleted).appendTo(row);

        // Column 6 - Watch Replay
        const watchReplayButton = makeReplayButton(ids[i], 'Watch Replay', 'replayCreate', false);
        $('<td>').html(watchReplayButton).appendTo(row);

        // Column 7 - Share Replay
        const shareReplayButton = makeReplayButton(ids[i], 'Share Replay', 'sharedReplayCreate', true);
        $('<td>').html(shareReplayButton).appendTo(row);

        // Column 8 - Other Scores
        const otherScoresButton = makeHistoryDetailsButton(ids[i], gameData.numSimilar);
        $('<td>').html(otherScoresButton).appendTo(row);

        // Column 9 - Other Players
        $('<td>').html(gameData.otherPlayerNames).appendTo(row);

        row.appendTo(tbody);
    }

    // Don't show the "Show More History" if we don't have 10 games played
    // (there is a small bug here where if a user has exactly 10 games played
    // then the button will erroneously show and not do anything when clicked)
    if (ids.length < 10) {
        $('#lobby-history-show-more').hide();
    } else {
        $('#lobby-history-show-more').show();
    }
};

const makeReplayButton = (id, text, msgType, returnsToLobby) => {
    const button = $('<button>').attr('type', 'button').addClass('button fit margin0');
    if (text === 'Watch Replay') {
        text = '<i class="fas fa-eye lobby-button-icon"></i>';
    } else if (text === 'Share Replay') {
        text = '<i class="fas fa-users lobby-button-icon"></i>';
    }
    button.html(text);
    button.addClass('history-table');
    button.addClass('enter-history-game');
    button.attr('id', `replay-${id}`);

    button.on('click', (event) => {
        event.preventDefault();
        globals.gameID = id;
        globals.connSend({
            type: msgType,
            resp: {
                gameID: parseInt(globals.gameID, 10), // The server expects this as an integer
            },
        });
        if (returnsToLobby) {
            lobby.history.hide();
        }
    });

    return button;
};

const makeHistoryDetailsButton = (id, gameCount) => {
    const button = $('<button>').attr('type', 'button').addClass('button fit margin0');
    button.html(`<i class="fas fa-chart-bar lobby-button-icon"></i>&nbsp; ${gameCount - 1}`);
    if (gameCount - 1 === 0) {
        button.addClass('disabled');
    }
    button.attr('id', `history-details-${id}`);

    button.on('click', (event) => {
        event.preventDefault();
        globals.gameID = id;
        globals.connSend({
            type: 'historyDetails',
            resp: {
                gameID: parseInt(globals.gameID, 10),
            },
        });
        lobby.historyDetails.show();
    });

    return button;
};

exports.showDetails = () => {
    $('#lobby-history').hide();
    $('#lobby-history-details').show();

    // The server will send us messages to populate this array momentarily
    globals.historyDetailList = [];
};

exports.hideDetails = () => {
    $('#lobby-history').show();
    $('#lobby-history-details').hide();
};

// This function is called once for each new history element received from the server
// The last message is not marked, so each iteration redraws all historyDetailList items
exports.drawDetails = () => {
    const tbody = $('#lobby-history-details-table-tbody');

    if (!globals.historyDetailList.length) {
        tbody.text('Loading...');
        return;
    }

    // Clear all of the existing rows
    tbody.html('');

    // The game played by the user will also include its variant
    const variant = globals.historyDetailList
        .filter(g => g.id in globals.historyList)
        .map(g => globals.historyList[g.id].variant)
        .map(v => constants.VARIANTS[v])[0];

    // The game played by the user might not have been sent by the server yet
    if (variant === undefined) {
        // If not, the variant is not known yet, so defer drawing
        return;
    }

    // Add all of the games
    for (let i = 0; i < globals.historyDetailList.length; i++) {
        const gameData = globals.historyDetailList[i];

        const row = $('<tr>');

        // Column 1 - Game ID
        let id = `#${gameData.id}`;
        if (gameData.us) {
            id = `<strong>${id}</strong>`;
        }
        $('<td>').html(id).appendTo(row);

        // Column 2 - Score
        let score = `${gameData.score}/${variant.maxScore}`;
        if (gameData.us) {
            score = `<strong>${score}</strong>`;
        }
        $('<td>').html(score).appendTo(row);

        // Column 3 - Time Completed
        let dateTime = dateTimeFormatter.format(new Date(gameData.datetime));
        if (gameData.us) {
            dateTime = `<strong>${dateTime}</strong>`;
        }
        $('<td>').html(dateTime).appendTo(row);

        // Column 4 - Watch Replay
        const watchReplayButton = makeReplayButton(gameData.id, 'Watch Replay', 'replayCreate', false);
        $('<td>').html(watchReplayButton).appendTo(row);

        // Column 5 - Share Replay
        const shareReplayButton = makeReplayButton(gameData.id, 'Share Replay', 'sharedReplayCreate', false);
        $('<td>').html(shareReplayButton).appendTo(row);

        // Column 6 - Other Players
        let otherPlayers = gameData.otherPlayerNames;
        if (gameData.us) {
            otherPlayers = `<strong>${globals.username}, ${otherPlayers}</strong>`;
        }
        $('<td>').html(otherPlayers).appendTo(row);

        row.appendTo(tbody);
    }
};

const dateTimeFormatter = new Intl.DateTimeFormat(
    undefined,
    {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    },
);
