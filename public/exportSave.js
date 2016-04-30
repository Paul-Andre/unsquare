/**
 * This function retrieves the entire info stored in localStorage,
 * concatenates it in a string, and retunrs that string.
 */
function getStored() {
	var output = "";
	var i;
	var key;

	for (i = 0; i < localStorage.length; i++) {
		key = localStorage.key(i);
		output += key;
		output += ":";
		output += localStorage.getItem(key);
		output += ";";
	}

	return output;
}

function displaySaveStr() {
	var str = getStored();
	encodeSaveStr(str);

	//For now
	prompt("This is your save string:\n", str);
}

//Do this
function encodeSaveStr(str) {
	return str;
}

//And this
function decodeSaveStr(str) {
	return str;
}

function importSave() {
	var saveStr=prompt("Paste your save string in the text box below.");

	saveStr = decodeSaveStr(saveStr);

	store(saveStr);
}

function store(str) {
	
}