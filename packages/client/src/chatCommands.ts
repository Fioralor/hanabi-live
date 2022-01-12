import { getVariantNames } from "@hanabi/data";
import * as chat from "./chat";
import globals from "./globals";
import * as createGame from "./lobby/createGame";
import createJSONFromReplay from "./lobby/createReplayJSON";
import * as modals from "./modals";

// Define a command handler map
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callback = (...args: any) => void;
const chatCommands = new Map<string, Callback>();
export default chatCommands;

// /friend [username]
function friend(_room: string, args: string[]) {
  // Validate that the format of the command is correct
  if (args.length < 1) {
    modals.showWarning(
      "The format of the /friend command is: <code>/friend Alice</code>",
    );
    return;
  }

  // Validate that we are not targeting ourselves
  const name = args.join(" ");
  if (name.toLowerCase() === globals.username.toLowerCase()) {
    modals.showWarning("You cannot friend yourself.");
  }

  globals.conn!.send("chatFriend", {
    name,
  });
}
chatCommands.set("friend", friend);
chatCommands.set("addfriend", friend);

// /friends
function friends(room: string) {
  let msg;
  if (globals.friends.length === 0) {
    msg = "Currently, you do not have any friends on your friends list.";
  } else {
    msg = `Current friends: ${globals.friends.join(", ")}`;
  }
  chat.addSelf(msg, room);
}
chatCommands.set("f", friends);
chatCommands.set("friends", friends);
chatCommands.set("friendlist", friends);
chatCommands.set("friendslist", friends);

// /pm [username] [msg]
function pm(room: string, args: string[]) {
  // Validate that the format of the command is correct
  if (args.length < 2) {
    modals.showWarning(
      "The format of a private message is: <code>/w Alice hello</code>",
    );
    return;
  }

  let recipient = args[0];
  args.shift(); // Remove the recipient

  // Validate that they are not sending a private message to themselves
  if (recipient.toLowerCase() === globals.username.toLowerCase()) {
    modals.showWarning("You cannot send a private message to yourself.");
    return;
  }

  // Validate that the recipient is online
  let isOnline = false;
  for (const user of globals.userMap.values()) {
    if (user.name.toLowerCase() === recipient.toLowerCase()) {
      isOnline = true;

      // Overwrite the recipient in case the user capitalized the username wrong
      recipient = user.name;

      break;
    }
  }
  if (!isOnline) {
    modals.showWarning(`User "${recipient}" is not currently online.`);
    return;
  }

  globals.conn!.send("chatPM", {
    msg: args.join(" "),
    recipient,
    room,
  });
}
chatCommands.set("pm", pm);
chatCommands.set("w", pm);
chatCommands.set("whisper", pm);
chatCommands.set("msg", pm);
chatCommands.set("tell", pm);
chatCommands.set("t", pm);

// /setleader [username]
function setLeader(_room: string, args: string[]) {
  if (globals.tableID === -1) {
    modals.showWarning(
      "You are not currently at a table, so you cannot use that command.",
    );
    return;
  }

  const username = args.join(" ");
  globals.conn!.send("tableSetLeader", {
    tableID: globals.tableID,
    name: username,
  });
}
chatCommands.set("setleader", setLeader);
chatCommands.set("setlead", setLeader);
chatCommands.set("setowner", setLeader);
chatCommands.set("changeleader", setLeader);
chatCommands.set("changelead", setLeader);
chatCommands.set("changeowner", setLeader);

// /setvariant [variant]
function setVariant(_room: string, args: string[]) {
  if (globals.tableID === -1) {
    modals.showWarning(
      "You are not currently at a table, so you cannot use that command.",
    );
    return;
  }

  // Sanitize the variant name
  let variantName = getVariantFromArgs(args);
  // Get the first match
  variantName = getVariantFromPartial(variantName);
  if (variantName === "") {
    modals.showWarning(`The variant of "${args.join(" ")}" is not valid.`);
    return;
  }

  globals.conn!.send("tableSetVariant", {
    tableID: globals.tableID,
    options: {
      variantName,
    },
  });

  // Update our stored create table setting to be equal to this variant
  createGame.checkChanged("createTableVariant", variantName);
}
chatCommands.set("sv", setVariant);
chatCommands.set("setvariant", setVariant);
chatCommands.set("changevariant", setVariant);
chatCommands.set("cv", setVariant);

// /tag [tag]
chatCommands.set("tag", (_room: string, args: string[]) => {
  if (globals.tableID === -1) {
    modals.showWarning(
      "You are not currently at a table, so you cannot use that command.",
    );
    return;
  }

  const tag = args.join(" ");
  globals.conn!.send("tag", {
    tableID: globals.tableID,
    msg: tag,
  });
});

// /tagdelete [tag]
chatCommands.set("tagdelete", (_room: string, args: string[]) => {
  if (globals.tableID === -1) {
    modals.showWarning(
      "You are not currently at a table, so you cannot use that command.",
    );
    return;
  }

  const tag = args.join(" ");
  globals.conn!.send("tagDelete", {
    tableID: globals.tableID,
    msg: tag,
  });
});

// /tagsearch
chatCommands.set("tagsearch", (room: string, args: string[]) => {
  const tag = args.join(" ");

  globals.conn!.send("tagSearch", {
    msg: tag,
    room,
  });
});

chatCommands.set("tagsdeleteall", () => {
  globals.conn!.send("tagsDeleteAll", {
    tableID: globals.tableID,
  });
});

// /playerinfo (username)
function playerinfo(_room: string, args: string[]) {
  let usernames: string[] = [];
  if (args.length === 0) {
    // If there are no arguments and we are at a table
    // return stats for all the players
    if (globals.tableID !== -1 && globals.ui !== null) {
      usernames = globals.ui.globals.metadata.playerNames;
    } else {
      // Otherwise, return stats for the caller
      usernames = [globals.username];
    }
  } else {
    // We can return the stats for a list of provided users separated by spaces
    // since usernames cannot contain spaces
    usernames = args;
  }
  for (const name of usernames) {
    globals.conn!.send("chatPlayerInfo", {
      name,
    });
  }
}
chatCommands.set("p", playerinfo);
chatCommands.set("playerinfo", playerinfo);
chatCommands.set("games", playerinfo);
chatCommands.set("stats", playerinfo);

// /unfriend [username]
chatCommands.set("unfriend", (_room: string, args: string[]) => {
  // Validate that the format of the command is correct
  if (args.length < 1) {
    modals.showWarning(
      "The format of the /unfriend command is: <code>/unfriend Alice</code>",
    );
    return;
  }

  // Validate that we are not targeting ourselves
  const name = args.join(" ");
  if (name.toLowerCase() === globals.username.toLowerCase()) {
    modals.showWarning("You cannot unfriend yourself.");
  }

  globals.conn!.send("chatUnfriend", {
    name,
  });
});

// /version
chatCommands.set("version", (room: string) => {
  const msg = `You are running version <strong>${globals.version}</strong> of the client.`;
  chat.addSelf(msg, room);
});

// /warning
chatCommands.set("warning", (_room: string, args: string[]) => {
  let warning = args.join(" ");
  if (warning === "") {
    warning = "This is a warning!";
  }
  modals.showWarning(warning);
});

// /copy
chatCommands.set("copy", (room: string) => {
  createJSONFromReplay(room);
});

export function getVariantFromArgs(args: string[]): string {
  const patterns = {
    doubleSpaces: / {2,}/g,
    openingParenthesis: / *\( */g,
    closingParenthesis: / *\) */g,
    hyphen: / *- */g,
    ampersand: / *& */g,
  };
  const capitalize = (input: string) => {
    const pattern = /(^|[()&\- ])(\w)/g;
    return input.toLowerCase().replace(pattern, (x) => x.toUpperCase());
  };

  const variant = args
    // Remove empty elements
    .filter((arg) => arg !== "")
    // Capitalize
    .map((arg) => capitalize(arg))
    .join(" ")
    // Remove space after opening and before closing parenthesis
    .replace(patterns.openingParenthesis, " (")
    .replace(patterns.closingParenthesis, ") ")
    // Remove space before and after hyphen
    .replace(patterns.hyphen, "-")
    // Add space before and after ampersand
    .replace(patterns.ampersand, " & ")
    // Remove double spaces
    .replace(patterns.doubleSpaces, " ")
    .trim();

  return variant;
}

export function getVariantFromPartial(search: string): string {
  const variantNames = getVariantNames();
  const possibleVariants = variantNames.filter((variantName) =>
    variantName.startsWith(search),
  );

  return possibleVariants[0] ?? "";
}