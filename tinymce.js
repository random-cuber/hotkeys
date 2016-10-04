// hotkeys plugin for tinymce
if (window.tinymce) {

	// provide key bind/unbind from inside the editor frame
	tinymce.PluginManager.add('plugin.hotkeys', // sync name to *.php
	function tinymce_init(editor, url) {

		// bind
		function editor_create(event) {
			// console.log(event);
			var frame = event.target; // wrapper
			target = frame.contentDocument.activeElement;
			if (target) {
				instance.tinymce_bind(target);
			} else {
				instance.log('invalid target', true);
			}
		}

		// unbind
		function editor_delete(event) {
			// console.log(event);
			if (target) {
				instance.tinymce_unbind(target);
			} else {
				instance.log('invalid target', true);
			}
		}

		// verify
		function editor_keydown(event) {
			// console.log(event);
		}

		// plugin proper
		var instance = plugin_hotkeys.instance;

		// editor event origin
		var target = null;

		// activate
		if (instance && instance.is_plugin_active()) {
			instance.log('...');
			editor.on('init', editor_create);
			editor.on('remove', editor_delete);
			// editor.on('keydown', editor_keydown);
		}

	});

}
