var editor = makeGameBase("editorCanvas", "editor");

// this specifies what happens when you activate squares
editor.action = function(v){
	return editor.level.colorScheme.resquare(v);
};

screenManager.additionalFunctions.editor = editor;
