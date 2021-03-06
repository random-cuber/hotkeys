//
// Roundcube Hot Keys Plugin
//

// plugin class
function plugin_hotkeys() {
	var self = this;

	// public command
	this.activate = function activate() {
		self.show_arkon();
	}

	// plugin name space
	this.key = function key(name) {
		return 'plugin.hotkeys.' + name; // keep in sync with *.php
	}

	// environment variable
	this.env = function env(name) {
		return rcmail.env[self.key(name)];
	}

	// plugin client logger
	this.log = function log(text, force) {
		if (self.env('enable_logging') || force) {
			var name = arguments.callee.caller.name;
			var entry = self.key(name);
			if (console && console.log) {
				// red/blue
				var color = force ? 'color: #8B0000' : 'color: #000080';
				console.log('%c' + entry + ': ' + text, color);
			}
		}
	};

	// provide localization
	this.localize = function localize(name) {
		return rcmail.get_label(name, 'hotkeys');
	}

	// mapping table fields
	this.field_list = function field_list() {
		return [ 'profile', 'context', 'command', 'comment', 'key', 'source', ]; // 'script'
	}

	// mapping table filters
	this.filter_list = function filter_list() {
		return [ 'all', 'active', 'passive', 'custom', 'internal', 'external',
				'undefined', ]; // 'scripted'
	}

	// locate internal jquery event handler
	function event_entry(handler_list, the_keys) {
		var the_index = null
		var the_value = null
		$.each(handler_list, function(index, value) {
			var data = value.data; // signature
			if (data && data.keys == the_keys) {
				the_index = index;
				the_value = value;
				return false; // break
			}
		});
		return {
			index : the_index,
			value : the_value,
		};
	}

	// place plugin key handlers first FIXME
	this.event_order = function event_order(the_keys) {
		if (!self.has_feature('change_event_order')) {
			return;
		}
		var func = $._data; // function
		if (!func) {
			return;
		}
		var events = func(document, 'events'); // object
		if (!events) {
			return;
		}
		var keydown = events.keydown; // array
		if (!keydown) {
			return;
		}
		var entry = event_entry(keydown, the_keys);
		if (!entry.value) {
			return;
		}
		self.log('source: ' + entry.index);
		keydown.splice(entry.index, 1);
		keydown.unshift(entry.value);
		var entry = event_entry(keydown, the_keys);
		if (!entry.value) {
			return;
		}
		self.log('target: ' + entry.index);
	}

	// announce plugin access key
	this.plugin_button_update = function plugin_button_update() {
		var hotkey = self.env('plugin_hotkey').toUpperCase();
		var suffix = '[' + hotkey + ']';
		self.log(suffix);
		var button = self.html_by_id(self.key('button'));
		var title = button.attr('title') + ' ' + suffix;
		button.attr('title', title);
	}

	function target_title(target) {
		var target = target || document;
		return $(target).find("title").text();
	}

	// window which owns the element
	function element_window(node) {
		var the_doc = node.ownerDocument ? node.ownerDocument : node;
		return the_doc.defaultView || the_doc.parentWindow;
	}

	// https://github.com/jeresig/jquery.hotkeys
	function jquery_hotkeys_options() {
		var filter_input = self.env('options_filter_input') || false;
		$.hotkeys.options.filterTextInputs = filter_input;
		$.hotkeys.options.filterInputAcceptingElements = filter_input;
	}

	//
	this.is_plugin_active = function is_plugin_active() {
		return self.env('activate_plugin');
	}

	// client ui behaviour
	this.has_feature = function has_feature(name) {
		return (self.env('feature_choice') || []).indexOf(name) >= 0;
	}

	// plugin on load setup
	this.initialize = function initialize() {

		if (self.is_plugin_active()) {
			self.log('active');
		} else {
			self.log('inactive');
			return;
		}

		if (rcmail.env['framed']) {
			self.log('error: framed', true);
			return;
		}

		jquery_hotkeys_options();

		self.register_command('activate');
		self.plugin_button_update();

		self.apply_binds([ 'plugin_bind', 'profile_bind' ]);

	}

	// perform hot key handler bind/unbind on root and frames
	this.apply_binds = function apply_binds(func_list) {
		// frame load handler memento
		var key_has_load = self.key('frame_has_load');
		// frame load function registry
		var key_func_mapa = self.key('frame_func_mapa');
		//
		function apply_item(name, func, target) {
			self.log(name + ': ' + func);
			self[func](target);
		}
		//
		function apply_list(name, func_list, target) {
			$.each(func_list, function(_, func) {
				apply_item(name, func, target);
			});
		}
		//
		apply_list('root', func_list, document);
		//
		function apply_frame() {
			var frame = this; // content:old
			if ($(frame).is(':hidden')) { // ignore
				self.log('hidden: ' + self.identity(frame));
				return;
			}
			var target = frame.contentWindow.document;
			// setup frame load handler
			if (!$(frame).data(key_has_load)) {
				$(frame).data(key_has_load, true);
				$(frame).bind('load', function frame_load() {
					var frame = this; // content:new
					var target = frame.contentWindow.document;
					var func_mapa = $(frame).data(key_func_mapa);
					apply_list('frame-load', func_mapa, target);
				});
			}
			// bind/unbind content:old
			apply_list('frame-exec', func_list, target);
			// prepare for bind content:new
			$.each(func_list, function apply_func(_, func) {
				// binder function convention: "entry_action()"
				var split = func.split('_');
				var entry = split[0], action = split[1];
				var func_mapa = $(frame).data(key_func_mapa) || {};
				if (action == 'bind') {
					// register bind into frame load
					func_mapa[entry] = func;
				} else if (action == 'unbind') {
					// unregister bind from frame load
					delete func_mapa[entry];
				} else {
					self.log('error: func: ' + func, true);
				}
				$(frame).data(key_func_mapa, func_mapa);
			});
		}
		// static frames
		$('iframe').each(apply_frame);
	}

	// expose plugin command
	this.register_command = function(name) {
		var command = self.key(name);
		var compose_commands = rcmail.env.compose_commands;
		if (compose_commands) {
			// for compose toolbar validator
			compose_commands.push(command);
		}
		rcmail.register_command(command, self[name].bind(self), true);
	}

	// persist user settings on client and server
	this.save_pref = function save_pref(name, value, no_dump) {
		var key = self.key(name);
		rcmail.save_pref({
			env : key,
			name : key,
			value : value,
		});
		self.log(key + '=' + (no_dump ? '...' : self.json_encode(value)));
	}

	// debug
	this.identity = function identity(target) {
		var node = target.nodeName.toLowerCase();
		if (target.id) {
			return node + '/' + target.id;
		}
		if (target.name) {
			return node + '/' + target.name;
		}
		if (target.class) {
			return node + '/' + target.class;
		}
		if (node == '#document') {
			var the_win = element_window(target);
			if (the_win) {
				return '/' + the_win.name + '/' + node;
			} else {
				return 'root' + '/' + node;
			}
		}
		return node;
	}

	// activate keyboard shortcut handler
	this.perform_bind = function perform_bind(title, target, keys, handler) {
		self.log(title + '->' + self.identity(target));
		$(target).bind('keydown', keys, handler);
		self.event_order(keys);
	}

	// deactivate keyboard shortcut handler
	this.perform_unbind = function perform_unbind(title, target, handler) {
		self.log(title + '->' + self.identity(target));
		$(target).unbind('keydown', handler);
	}

	// activate keyboard shortcut handler
	this.plugin_bind = function plugin_bind(target) {
		var keys = self.env('plugin_hotkey');
		self.perform_bind('plugin', target, keys, self.plugin_handler);
	}

	// deactivate keyboard shortcut handler
	this.plugin_unbind = function plugin_unbind(target) {
		self.perform_unbind('plugin', target, self.plugin_handler);
	}

	// plugin access hot key
	this.plugin_handler = function plugin_handler(event, key) {
		self.log('key: ' + key);
		if (self.has_part_keyspypad) {
			self.log('idle: keyspypad');
			return false;
		}
		if (self.has_part_changer) {
			self.log('idle: changer');
			return false;
		}
		if (self.has_part_arkon) {
			self.log('work: close');
			self.part_arkon.dialog("close");
		} else {
			self.log('work: open');
			self.show_arkon({
				the_win : self.context_window(event),
			});
		}
		return false; // #event stop/prevent
	}

	// current profile
	this.profile_get = function() {
		return self.env('profile');
	}

	// current profile
	this.profile_put = function(profile) {
		if (profile == self.profile_get()) {
			return;
		}
		self.save_pref('profile', profile);
	}

	// available mapping profiles
	this.profile_list = function() {
		return self.env('profile_list') || [];
	}

	// combine commands from all sources
	this.build_command_list = function() {
		var custom_list = self.env('custom_command_list');
		var internal_list = self.env('internal_command_list');
		var external_list = self.external_command_list();
		var command_list = [].concat(custom_list, internal_list, external_list);
		return command_list.sort();
	}

	// produce a map: key => mapping_list
	this.build_mapping = function build_mapping(mapping_list) {
		var map = {};
		$.each(mapping_list, function(index, mapping) {
			var key = mapping.key;
			if (key) {
				if (!map[key]) {
					map[key] = [];
				}
				map[key].push(mapping);
			} else {
				self.log('error: invalid key: ' + key, true);
			}
		});
		return map;
	}

	// window of event origin and command execution
	this.context_window = function context_window(event) {
		var event_target = event.currentTarget;
		var target_window = element_window(event_target);
		return target_window.rcmail ? target_window : window;
	}

	// jquery data key
	function mapping_key() {
		return self.key('profile_mapping');
	}

	// activate keyboard shortcut handler
	this.profile_bind = function profile_bind(target) {
		var profile = self.profile_get();
		var mapping_list = self.mapping_list(profile);
		var profile_mapping = self.build_mapping(mapping_list);
		$(target).data(mapping_key(), profile_mapping);
		var keys = self.array_column(mapping_list, 'key').join(" ");
		var title = 'profile[' + profile + ']';
		self.perform_bind(title, target, keys, self.profile_handler);
	}

	// deactivate keyboard shortcut handler
	this.profile_unbind = function profile_unbind(target) {
		var profile = self.profile_get();
		$(target).data(mapping_key(), {});
		var title = 'profile[' + profile + ']';
		self.perform_unbind(title, target, self.profile_handler);
	}

	// profile command invoker
	this.profile_handler = function profile_handler(event, key) {
		if (rcmail.busy && self.has_feature('queue_busy_keys')) {
			self.log('busy: ' + rcmail.busy);
			window.setTimeout(function() {
				self.profile_handler(event, key);
			}, 100);
			return false; // #event stop/prevent
		}
		var the_win = self.context_window(event);
		var target = event.currentTarget;
		var profile_mapping = $(target).data(mapping_key());
		var mapping_list = profile_mapping[key];
		self.log('key: ' + key + ' list: ' + mapping_list.length);
		var has_match = false; // on any mapping
		$.each(mapping_list, function(_, mapping) {
			var context = mapping.context;
			if (self.match_context(the_win, context, event)) {
				has_match = true;
				self.execute(the_win, mapping);
			}
		});
		if (!has_match && self.env('enable_prevent')) {
			var prevent_keys = self.env('prevent_default_keys') || [];
			if (prevent_keys.indexOf(key) >= 0) {
				self.log('prevent deafult');
				event.preventDefault();
			}
		}
		return !has_match; // #event continue on mismatch
	}

	// task filter
	function match_task(list, item) {
		var report = 'no match';
		try {
			if (list.length == 0) {
				report = 'has match: (empty)';
				return true;
			}
			if (list.indexOf(item) >= 0) {
				report = 'has match: [' + item + ']';
				return true;
			}
			return false;
		} finally {
			self.log(report)
		}
	}

	// action filter
	function match_action(list, item) {
		var report = 'no match';
		try {
			if (list.length == 0) {
				report = 'has match: (empty)';
				return true;
			}
			if (list.indexOf(item) >= 0) {
				report = 'has match: [' + item + ']';
				return true;
			}
			return false;
		} finally {
			self.log(report)
		}
	}

	// focus filter
	function match_focused(list) {
		var report = 'no match';
		try {
			if (list.length == 0) {
				report = 'has match: (empty)';
				return true;
			}
			var match = false;
			$.each(list, function(id, present) {
				var has_focus = self.html_by_id(id).is(":focus");
				match = present ? has_focus : !has_focus;
				report = 'id=' + id + ' present=' + present;
				return false; // break
			});
			return match;
		} finally {
			self.log(report);
		}
	}

	// event target filter
	function match_target_name(list, event) {
		var report = 'no match';
		try {
			if (list.length == 0) {
				report = 'has match: (empty)';
				return true;
			}
			var match = false;
			var node_name = event.target.nodeName.toLowerCase();
			$.each(list, function match_target_name(name, present) {
				var rx = new RegExp(name, 'i');
				var has_name = rx.test(node_name);
				match = present ? has_name : !has_name;
				report = 'node=' + node_name + ' present=' + present;
				return false; // break
			});
			return match;
		} finally {
			self.log(report);
		}
	}

	// verify current execution context
	this.match_context = function match_context(the_win, name, event) {

		var rcmail = the_win.rcmail;
		var task = rcmail.env.task;
		var action = rcmail.env.action;

		var context_mapa = self.env('context_mapa');
		var context = context_mapa[name] || {};

		var task_list = context.task_list || [];
		var action_list = context.action_list || [];
		var focused_mapa = context.focused_mapa || [];
		var target_name_mapa = context.target_name_mapa || [];

		var has_task = match_task(task_list, task);
		var has_action = match_action(action_list, action);
		var has_focused = match_focused(focused_mapa);
		var has_target_name = match_target_name(target_name_mapa, event);

		var has_match = //
		has_task && has_action && has_focused && has_target_name;

		var match_mask = [ //
		has_task ? 'T' : 't', //
		has_action ? 'A' : 'a', //
		has_focused ? 'F' : 'f', //
		has_target_name ? 'N' : 'n', //
		].join('-');

		var report = {
			has_match : has_match,
			match_mask : match_mask,
			task : task,
			action : action,
			context : name,
		};
		report[name] = context;

		self.log(self.json_encode(report, 4));

		return has_match;
	}

	// invoke command defined by mapping
	this.execute = function execute(the_win, mapping) {
		var rcmail = the_win.rcmail;
		var command = mapping.command;
		self.log(command);
		var auto_enable = self.has_feature('command_auto_enable') || false;
		var was_enabled = rcmail.command_enabled(command) || false;
		var manage_enabled = auto_enable && !was_enabled;
		if (manage_enabled) {
			rcmail.enable_command(command, true);
		}
		try {
			var script = mapping.script;
			if (script) {
				self.evaluate(the_win, mapping);
			} else {
				rcmail.command(command);
			}
		} catch (error) {
			self.log(error.stack, true);
		} finally {
			if (manage_enabled) {
				rcmail.enable_command(command, false);
			}
		}
	}

	// produce valid object
	this.provide_mapping = function(profile, command, context) {
		return {
			profile : profile || '',
			command : command || '',
			context : context || '',
			comment : '',
			script : '',
			key : '',
		}
	}

	// verify membership in the list
	this.mapping_list_has = function mapping_list_has(mapping) {
		var guid = self.guid(mapping)
		var mapping_list = self.env('mapping_list');
		var found = false;
		$.each(mapping_list, function(index, mapping) {
			if (guid == self.guid(mapping)) {
				found = true;
				return false; // break
			}
		});
		return found;
	}

	// mappings for given profile
	this.mapping_list = function(profile) {
		var mapping_list = self.env('mapping_list');
		if (profile) {
			return self.array_filter(mapping_list, 'profile', profile);
		} else {
			return mapping_list;
		}
	}

	// process mapping change in list
	this.mapping_merge = function mapping_merge(mapping_list, mapping, action) {
		var guid = self.guid(mapping);
		var found = false;
		var point = -1;
		$.each(mapping_list, function(index, mapping) {
			if (guid == self.guid(mapping)) {
				found = true;
				point = index;
				return false; // break
			}
		});
		switch (action) {
		case 'apply':
			if (found) {
				mapping_list[point] = mapping;
			} else {
				mapping_list.push(mapping);
			}
			break;
		case 'reset':
			if (found) {
				mapping_list.splice(point, 1);
			} else {
				// noop
			}
			break;
		default:
			self.log('invalid action: ' + action, true);
			break;
		}
	}

	// process mapping change on client and server
	this.mapping_update = function mapping_update(mapping, action) {
		var mapping_list = self.env('mapping_list');
		self.mapping_merge(mapping_list, mapping, action);
		self.save_pref('mapping_list', mapping_list, true);
	}

	// convert object to text
	this.json_encode = function(json, tabs) {
		return JSON.stringify(json, null, tabs);
	}

	// convert text to object
	this.json_decode = function(text) {
		return JSON.parse(text);
	}

	// mapping identity
	this.guid = function(mapping) {
		return mapping.profile + '/' + mapping.command + '/' + mapping.context;
	}

	// commands registered by plugins
	this.external_command_list = function() {
		var external_list = [];
		$.each(rcmail.command_handlers, function(name, code) {
			external_list.push(name);
		});
		return external_list;
	}

	// virtual mappings, include both existing and proposed
	this.presentation_list = function(profile) {
		// prepare sources
		var custom_list = self.env('custom_command_list');
		var internal_list = self.env('internal_command_list');
		var external_list = self.external_command_list();
		// prepare result
		var virtual_list = []; // combined mappings
		var command_source = {}; // map: command -> source
		function build(command_list, source) {
			$.each(command_list, function(index, command) {
				var mapping = { // proposed entry
					profile : profile,
					command : command,
					context : '',
					key : '',
					comment : '',
					script : '',
					source : source, // extra field
				}
				virtual_list.push(mapping);
				command_source[command] = source;
			})
		}
		build(custom_list, 'custom');
		build(internal_list, 'internal');
		build(external_list, 'external');
		// inject existing mappings
		var mapping_list = self.mapping_list(profile);
		$.each(mapping_list, function(index1, mapping1) {
			var guid1 = self.guid(mapping1);
			var source = command_source[mapping1.command];
			mapping_list[index1].source = source ? source : 'undefined';
			var found = false;
			$.each(virtual_list, function(index2, mapping2) {
				var guid2 = self.guid(mapping2);
				if (guid1 == guid2) { // replace
					found = true;
					virtual_list[index2] = mapping_list[index1];
					return false; // break
				}
			})
			if (!found) { // append
				virtual_list.push(mapping1);
			}
		});
		return virtual_list;
	}

	// supported hot key list
	this.shortcut_list = function shortcut_list() {
		var meta_keys = self.env('supported_meta_keys');
		var base_keys = self.env('supported_base_keys');
		var supported_keys = [];
		$.each(base_keys, function(idx1, key) {
			key = key.toLowerCase();
			supported_keys.push(key);
			$.each(meta_keys, function(idx2, meta) {
				meta = meta.toLowerCase();
				supported_keys.push(meta + '+' + key);
			});
		});
		return supported_keys;
	}

	// send file
	this.download = function download(file, text) {
		self.log('file: ' + file);
		var prefix = 'data:application/json;charset=utf-8';
		var content = encodeURIComponent(text);
		var link = $('<a>').attr({
			id : file,
			download : file,
			href : prefix + ',' + content,
			style : 'display: none;',
		});
		$(document.body).append(link);
		link.get(0).click(); // native
		link.remove();
	}

	// // utilities

	this.array_clean = function(array) {
		return $.grep(array, function(entry, index) {
			return (entry !== "" && entry != null);
		});
	}

	this.array_unimer = function(array1, array2) {
		return self.array_unique(self.array_merge(array1, array2));
	}

	this.array_merge = function(array1, array2) {
		return $.merge(array1, array2);
	}

	this.array_unique = function(array) {
		return $.grep(array, function(entry, index) {
			return index === $.inArray(entry, array);
		});
	}

	this.array_column = function(table, field) {
		var list = [];
		$.each(table, function(idx, row) {
			list.push(row[field]);
		});
		return list;
	}

	this.array_filter = function(table, field, value) {
		var list = [];
		$.each(table, function(idx, row) {
			if (row[field] == value) {
				list.push(row);
			}
		});
		return list;
	}

	this.tabs_panel_id = function(ui) {
		if (ui.panel) {
			return ui.panel[0].id;
		} else if (ui.newPanel) {
			return ui.newPanel[0].id;
		} else {
			self.log('error: invalid ui panel', true);
			return '';
		}
	}

	// verify value against the list, fall back to first
	this.valid_val = function valid_val(value_list, value) {
		return value_list.indexOf(value) >= 0 ? value : value_list[0];
	}

	// verify key against the map, fall back to first
	this.valid_key = function valid_key(value_mapa, key) {
		return value_mapa[key] ? key : Object.keys(value_mapa)[0];
	}

	// resolve string to jquery
	this.html_by_id = function(id) {
		return id.startsWith('#') ? $(id) : $('[id="' + id + '"]');
	}

	// jquery dialog title icon
	this.dialog_icon = function(dialog, name) {
		dialog.find('span.ui-dialog-title').addClass(
				'plugin_hotkeys title_icon ' + name);
	}

	this.plugin_icon_class = function() {
		return self.env('plugin_icon_class');
	}

	// rcmail.init()
	self.initialize();

}

// script evaluator
plugin_hotkeys.prototype.evaluate = function evaluate(the_win, mapping) {
	var self = this;

	// evaluator builder
	function sandbox_provide($this, vars, code) {
		var args = []; // names of vars
		var vals = []; // values of vars
		for ( var name in vars) {
			if (vars.hasOwnProperty(name)) {
				args.push(name);
				vals.push(vars[name]);
			}
		}
		var declare = Array.prototype.concat.call($this, args, code);
		var sandbox = new (Function.prototype.bind.apply(Function, declare));
		var context = Array.prototype.concat.call($this, vals);
		return Function.prototype.bind.apply(sandbox, context);
	}

	// 'this' of sandbox
	var $this = Object.create(null);

	// sandbox variables
	var vars = {
		$ : the_win.$,
		top : the_win.top,
		rcmail : the_win.rcmail,
		command : mapping.command,
	};

	// sandbox program
	var code = mapping.script;

	self.log(code);

	var sandbox_evaluate = sandbox_provide($this, vars, code);

	sandbox_evaluate();

}

// dialog content
plugin_hotkeys.prototype.html_list = function(args, opts) {
	var self = this;

	var field_list = args.field_list || [];
	var entry_list = args.entry_list || [];

	function part_id(name) {
		return args.name + '_' + name;
	}

	var root = $('<div>').attr({
		id : part_id('root'),
	}).css({
		'overflow-x' : 'hidden',
		'overflow-y' : 'auto',
	});

	var table = $('<table>').attr({
		id : part_id('list'),
		class : 'records-table messagelist fixedheader sortheader', // fixedcopy
	}).css({
		'table-layout' : 'auto',
	}).appendTo(root);

	var head = $('<thead>').attr({
		id : part_id('head'),
	}).appendTo(table);

	var hrow = $('<tr>').appendTo(head);
	$.each(field_list, function(index, field) {
		var link = $('<a>').attr({
			href : "#" + field,
			title : 'Sort By',
			index : index,
			class : 'sortcol',
		}).text(self.localize(field));
		$('<th>').append(link).appendTo(hrow);
	});

	var body = $('<tbody>').attr({
		id : part_id('body'),
	}).appendTo(table);

	function sort(index) {
		self.log('index: ' + index);

		function html(row, index) { // elem
			return $(row).children('td').eq(index).html();
		}

		function comp(index) {
			return function(row1, row2) { // elem
				var data1 = html(row1, index), data2 = html(row2, index);
				var is_numeric = $.isNumeric(data1) && $.isNumeric(data2);
				return is_numeric ? data1 - data2 : data1.localeCompare(data2);
			}
		}

		var head = $(widget.thead);
		var rows = head.find('tr');
		var row = rows.eq(0);
		var cols = row.find('th');
		var col = cols.eq(index);
		if (!col.hasClass('sortedASC') && !col.hasClass('sortedDESC')) {
			cols.removeClass('sortedASC').removeClass('sortedDESC');
			col.addClass('sortedASC');
		} else if (col.hasClass('sortedASC')) {
			col.removeClass('sortedASC').addClass('sortedDESC');
		} else if (col.hasClass('sortedDESC')) {
			col.removeClass('sortedDESC').addClass('sortedASC');
		}

		var body = $(widget.tbody);
		var rows = body.find('tr').toArray().sort(comp(index));
		if (col.hasClass('sortedDESC')) {
			rows = rows.reverse();
		}

		for (var i = 0; i < rows.length; i++) {
			body.append(rows[i]);
		}
	}

	function hide(index) {
		var index = index + 1;
		var head = $(widget.thead);
		var body = $(widget.tbody);
		head.find('th:nth-child(' + index + ')').hide();
		body.find('td:nth-child(' + index + ')').hide();
	}

	function filter(index, functier) {
		self.log('index: ' + index);
		var body = $(widget.tbody);
		var rows = body.find('tr');
		$.each(rows, function(idx, row) {
			var row = $(row);
			var col = row.find('td').eq(index);
			if (functier(col)) {
				row.show();
			} else {
				row.hide();
			}
		});
	}

	function attach_sorter() {
		$(widget.thead).on('click', 'a.sortcol', function(event) { // after
			// init()
			var a = $(this);
			var index = a.attr('index');
			sort(index);
		});
	}

	var widget = new rcube_list_widget(table[0], opts).init();

	root.data('widget', widget);

	var inst_list = rcube_list_widget._instances;
	if ($.isArray(inst_list && inst_list[inst_list.length - 1]) == widget) {
		inst_list.pop(); // transient table, remove self
	}

	widget.$sort = function widget_sort(field) {
		widget.$sort_field = field;
		sort(field_list.indexOf(field));
	}

	widget.$hide = function widget_hide(field) { // name
		// hide(field_list.indexOf(field));
		var head = $(widget.thead);
		var body = $(widget.tbody);
		var style = '.' + field + ' { display: none; }';
		head.attr({
			style : style,
		});
		body.attr({
			style : style,
		});
	}

	widget.$filter = function widget_filter(field, functier) {
		filter(field_list.indexOf(field), functier);
		widget.init_fixed_header();
		attach_sorter();
	}

	widget.$choice = function widget_choice() { // source object
		var id = widget.get_single_selection();
		return widget.$entry_list[id];
	}

	widget.$display = function widget_dislplay() { // show current row
		var row_id = widget.get_single_selection();
		if (!row_id) {
			return false;
		}
		widget.scrollto(row_id);
		var row = self.html_by_id(rcmrow(row_id));
		return row.is(':visible');
	}

	function rcmrow(row_id) {
		return 'rcmrow' + row_id;
	}

	widget.$build = function widget_build(entry_list) {
		widget.$entry_list = entry_list;
		widget.clear(true);
		$.each(entry_list, function(row_id, entry) {
			var cols = [];
			$.each(field_list, function(col_id, field) {
				var value = entry[field];
				if (args.localize) {
					value = self.localize(value);
				}
				cols.push({
					className : field,
					innerHTML : value,
				});
			});
			widget.insert_row({
				className : '',
				style : '',
				id : rcmrow(row_id),
				uid : row_id,
				cols : cols,
			});
		});
		if (args.auto_sort && widget.$sort_field) {
			widget.$sort(widget.$sort_field)
		}
	}

	return root;
}

// dialog content
plugin_hotkeys.prototype.html_menu = function(args) {
	var self = this;

	var div = $('<div>').attr({
		id : args.id,
		class : args.class_div || 'popupmenu',
	}).css({
		display : 'none',
	}).data('handler', args.handler);

	var ul = $('<ul>').attr({
		class : args.class_ul || 'toolbarmenu iconized',
	}).appendTo(div);

	$.each(args.item_list, function(_, item) {
		var li = $('<li>').attr({
			class : item.class_li || '',
		}).appendTo(ul);
		var a = $('<a>').attr({
			href : '#',
			class : item.class_a || 'icon active',
		}).data('id', item.id).appendTo(li);
		var name = self.localize(item.name || item.id);
		var span = $('<span>').attr({
			class : item.class_span || 'icon',
		}).text(name).appendTo(a);
	});

	div.on('click', 'a.active', function(event) {
		div.data('handler')($(this).data('id'));
		return false;
	});

	return div;
}

// dialog content
plugin_hotkeys.prototype.html_tabs = function(args) {
	var self = this;

	var root = $('<div>').attr({
		id : 'root',
		class : 'plugin_hotkeys',
	});

	var tabs = $('<ul>').attr({
		id : 'tabs',
	});

	root.append(tabs);

	function build(id) {
		var text = args.localize ? self.localize(id) : id;
		var link = $('<a>').attr('href', '#' + id).text(text);
		tabs.append($('<li>').append(link));
		root.append($('<div>').attr('id', id));
	}

	$.each(args.tabs_list, function(ix, id) {
		build(id);
	});

	return root;
}

// main dialog
plugin_hotkeys.prototype.show_arkon = function show_arkon(args) {
	var self = this;

	var the_win = args && args.the_win ? args.the_win : window
	var the_task = the_win.rcmail.env.task;
	var the_action = the_win.rcmail.env.action;
	var the_location = the_win.rcmail.env['framed'] ? 'frame' : 'top';

	var profile_list = self.profile_list();
	var filter_list = self.filter_list();
	var field_list = self.field_list();

	var active_filter = 'all';

	var content = $('<div>').css({
		height : '36em',
	});

	//

	var context_part = $('<form>');
	var context_text = //
	the_location + ": '" + the_task + "'/'" + the_action + "'";
	$('<label>').text(context_text).appendTo(context_part);
	$('<p>').appendTo(context_part);

	var profile_part = self.html_tabs({
		tabs_list : profile_list,
	}).attr({});

	var filter_part = self.html_tabs({
		tabs_list : filter_list,
	}).attr({});

	var mapping_part = self.html_list({
		name : 'mappings',
		// auto_sort : true,
		field_list : field_list,
	}).css({
		height : '24em',
	});

	var mapping_widget = mapping_part.data('widget');

	mapping_part.scroll(function(event) {
		hide_menu();
	});

	mapping_widget.addEventListener('dblclick', function() {
		hide_menu();
		show_changer();
	})

	mapping_widget.addEventListener('click', function() {
		hide_menu();
		render();
	})

	mapping_widget.addEventListener('initrow', function(row) {
		self.html_by_id(row.id).contextmenu(show_menu);
	})

	function menu_handler(id) {
		self.log('item: ' + id);
		switch (id) {
		case 'new':
			show_changer(self.provide_mapping(self.profile_get()));
			break;
		case 'change':
			show_changer();
			break;
		case 'remove':
			remove();
			break;
		case 'invoke':
			self.execute(window, mapping_widget.$choice());
			break;
		default:
			self.log('error: ' + id, true);
			break;
		}
	}

	var menu_info = {
		id : 'plugin_hotkeys_arkon_menu',
		handler : menu_handler,
		class_div : 'plugin_hotkeys menu_icon popupmenu',
		item_list : [ {
			id : 'new',
			class_span : 'hotkeys-icon-plus',
		}, {
			id : 'change',
			class_span : 'hotkeys-icon-pencil',
		}, {
			id : 'remove',
			class_span : 'hotkeys-icon-minus',
		}, {
			id : 'invoke',
			class_span : 'hotkeys-icon-rocket',
		}, ],
	}

	var menu_part = self.html_menu(menu_info);

	function hide_menu() {
		rcmail.hide_menu(menu_info.id);
	}

	function show_menu(event) {
		var td = event.target;
		var tr = $(td).closest('tr');
		var row_next = tr.attr('id').replace(/^rcmrow/, '');
		var row_past = mapping_widget.get_single_selection();
		if (row_next == row_past) {
			// toggle on/off
			rcmail.show_menu(menu_info.id, undefined, event);
		} else {
			mapping_widget.select(row_next);
			rcmail.show_menu(menu_info.id, true, event);
			render();
		}
		return false;
	}

	function content_section(name) {
		var section = $('<span>').css({
			'font-weight' : 'bold',
		}).text(self.localize(name)).appendTo(content);
	}

	content_section('context');
	content.append(context_part);

	content_section('profile');
	content.append(profile_part);

	content_section('mapping');
	content.append(filter_part);
	content.append(mapping_part);

	function show_changer(choice) {
		var mapping = choice ? choice : mapping_widget.$choice();
		if (mapping) {
			self.show_changer({
				mapping : mapping,
				refresh : refresh,
			});
		} else {
			self.log('missing choice', true);
		}
	}

	function refresh() {
		select_profile(self.profile_get());
	}

	function select_profile(profile) {
		self.log(profile);
		self.profile_put(profile);
		mapping_widget.$build(self.presentation_list(profile));
		select_filter(active_filter);
		// mapping_widget.select(active_mapping); // TODO select last
	}

	function select_filter(filter) {
		self.log(filter);
		active_filter = filter;
		apply_filter(filter);
		mapping_widget.$sort('command');
		render();
	}

	function apply_filter(filter) {
		switch (filter) {
		case 'all':
		default:
			mapping_widget.$filter('profile', function(col) {
				return true;
			});
			break;
		case 'active':
			mapping_widget.$filter('key', function(col) {
				return col.text();
			});
			break;
		case 'passive':
			mapping_widget.$filter('key', function(col) {
				return !col.text();
			});
			break;
		case 'custom':
		case 'internal':
		case 'external':
		case 'undefined':
			mapping_widget.$filter('source', function(col) {
				return col.text() == filter;
			});
			break;
		case 'scripted':
			mapping_widget.$filter('script', function(col) {
				return col.text();
			});
			break;
		}
	}

	function render() {
		var has_row = mapping_widget.$display();
		button_change(has_row);
		button_remove(has_row);
	}

	function remove() {
		var mapping = mapping_widget.$choice();
		if (mapping) {
			self.mapping_update(mapping, 'reset');
		} else {
			self.log('missing choice', true);
		}
		refresh();
	}

	function init_tabs() {
		profile_part.tabs({
			active : profile_list.indexOf(self.profile_get()),
			create : function create(event, ui) {
				select_profile(self.tabs_panel_id(ui));
			},
			activate : function activate(event, ui) {
				select_profile(self.tabs_panel_id(ui));
			},
		});
		filter_part.tabs({
			active : filter_list.indexOf(active_filter),
			create : function create(event, ui) {
				select_filter(self.tabs_panel_id(ui));
			},
			activate : function activate(event, ui) {
				select_filter(self.tabs_panel_id(ui));
			},
		});
	}

	function button_change(on) {
		$('#change').prop('disabled', !on);
	}

	function button_remove(on) {
		$('#remove').prop('disabled', !on);
	}

	var buttons = [ {
		id : 'new',
		text : self.localize('new'),
		click : function() {
			show_changer(self.provide_mapping(self.profile_get()));
		}
	}, {
		id : 'change',
		text : self.localize('change'),
		class : 'mainaction',
		click : function() {
			show_changer();
		}
	}, {
		id : 'remove',
		text : self.localize('remove'),
		click : function() {
			remove();
		}
	}, {
		text : '*',
		showText : false,
		disabled : true,
		icons : {
			primary : "ui-icon-blank"
		},
	}, {
		id : 'export',
		text : self.localize('export'),
		click : function() {
			self.show_export();
		}
	}, {
		id : 'import',
		text : self.localize('import'),
		click : function() {
			self.show_import({
				refresh : refresh,
			});
		}
	}, {
		id : 'share',
		text : self.localize('share'),
		click : function() {
			self.show_share();
		}
	}, {
		text : '*',
		showText : false,
		disabled : true,
		icons : {
			primary : "ui-icon-blank"
		},
	}, {
		id : 'close',
		text : self.localize('close'),
		click : function() {
			$(this).dialog('close');
		}
	} ];

	var options = {
		width : 'auto',
		open : function arkon_open(event, ui) {
			self.log('...');
			self.dialog_icon($(this).parent(), self.plugin_icon_class());
			self.has_part_arkon = true;
			self.apply_binds([ 'profile_unbind' ]);
			init_tabs();
			button_change(false);
			button_remove(false);
			menu_part.appendTo($(document.body));
			window.setTimeout(function() {
				var index = filter_list.indexOf('active');
				filter_part.tabs('option', 'active', index);
			}, 100);
		},
		close : function arkon_close(event, ui) {
			self.log('...');
			menu_part.remove();
			self.apply_binds([ 'profile_bind' ]);
			self.has_part_arkon = false;
			$(this).remove();
		},
	};

	var title = self.localize('command_hotkeys');

	self.part_arkon = rcmail
			.show_popup_dialog(content, title, buttons, options);
}

// editor dialog
plugin_hotkeys.prototype.show_changer = function(args) {
	var self = this;

	var mapping = args.mapping;

	var field_list = self.field_list();
	var profile_list = self.profile_list();
	var command_list = self.build_command_list();
	var context_mapa = self.env('context_mapa');
	var shortcut_list = self.shortcut_list();
	var shortcut_keys = shortcut_list.join(' ');

	var content = $('<div>');

	var table = $('<table>');
	content.append(table);

	function tooltip(id) {
		if (self.has_feature('show_changer_tooltips')) {
			return self.localize('tooltip_' + id);
		} else {
			return null;
		}
	}

	function label(id) {
		return $('<label>').text(self.localize(id));
	}

	function input(id) {
		return $('<input>').attr({
			id : id,
			title : tooltip(id),
		});
	}

	function button(id) {
		return $('<button>').attr({
			id : id,
			title : tooltip(id),
		}).text(self.localize(id));
	}

	function entry(id) {
		var row = $('<tr>');
		table.append(row);
		var lab = label(id);
		var inp = input(id).css({
			width : '30em',
		});
		row.append($('<td>').append(lab));
		row.append($('<td>').append(inp));
		return inp;
	}

	function select(id) {
		return $('<select>').attr({
			id : id,
			title : tooltip(id),
		});
	}

	function chooser(id, option_list, use_index) {
		var row = $('<tr>');
		table.append(row);
		var lab = label(id);
		var sel = select(id).css({
			width : '30em',
		});
		row.append($('<td>').append(lab));
		row.append($('<td>').append(sel));
		$.each(option_list, function(index, value) {
			var entry = use_index ? index : value;
			var option = $('<option>').val(entry).text(entry).appendTo(sel);
		});
		return sel;
	}

	function keyspypad(id) {
		var row = $('<tr>').appendTo(table);

		var lab = label(id);

		var btn = button(id + '_click').css({
			width : '15em',
		}).attr({
			class : self.plugin_icon_class(),
		}).text('*').button();
		btn.find('span').hide();

		btn.click(function btn_click(event) {
			self.log('...');
			var args = {};
			args.key = '';
			args.shortcut_keys = shortcut_keys;
			args.open = function() {
				args.key = 'invalid';
			}
			args.close = function() {
				inp.val(args.key);
				inp.trigger('input');
			}
			self.show_keyspypad(args);
		});

		var inp = input(id + '_enter').css({
			width : '15em',
		}).attr({
		//
		});

		inp.on('keyup', function inp_keyup(event) {
			var value = this.value;
			var lower = value.toLowerCase()
			if (value != lower) {
				this.value = lower;
			}
		});

		inp.on('input', function inp_change(event) {
			var key = inp.val().toLowerCase();
			var has_valid_key = (shortcut_list.indexOf(key) >= 0);
			var plugin_key = self.env('plugin_hotkey').toLowerCase();
			var has_plugin_key = (key === plugin_key);
			is_valid = has_valid_key && !has_plugin_key;
			if (is_valid) {
				inp.css('background-color', '#c1f0c1'); // green
			} else {
				inp.css('background-color', '#ffad99'); // red
			}
		});

		row.append($('<td>').append(lab));
		row.append($('<td>').append(btn).append(inp));

		return inp;
	}

	function keypress(event) {
		if (event.which == 13) {
			$('#submit').click();
		}
	}

	function render() {
		var has = self.mapping_list_has(result());
		var text = has ? 'update' : 'create';
		button_submit(true, text);
	}

	var editor = {
		profile : chooser('profile', profile_list, false).change(render).val(
				self.valid_val(profile_list, mapping.profile)),
		context : chooser('context', context_mapa, true).change(render).val(
				self.valid_key(context_mapa, mapping.context)),
		command : chooser('command', command_list, false).change(render).val(
				self.valid_val(command_list, mapping.command)),
		comment : entry('comment').val(mapping.comment).keypress(keypress),
		script : entry('script').val(mapping.script).keypress(keypress),
		key : keyspypad('key').val(mapping.key).keypress(keypress),
	};

	function result() {
		return {
			profile : editor.profile.val(),
			context : editor.context.val(),
			command : editor.command.val(),
			comment : editor.comment.val(),
			script : editor.script.val(),
			key : editor.key.val(),
		};
	}

	var delay = self.env('feature_tooltip_delay') || 1000;
	table.tooltip({
		show : {
			delay : delay,
			effect : 'slideDown',
		},
		// hide : {
		// delay : delay,
		// effect : 'slideDown',
		// },
		open : function(event, ui) {
			window.setTimeout(function() {
				$(ui.tooltip).hide();
			}, delay * 3);
		},
	});

	var title = self.localize('command_mapping');

	function refresh() {
		render();
		window.setTimeout(function() {
			args.refresh();
		}, 300);
	}

	function button_submit(on, text) {
		var button = $('#submit');
		button.prop('disabled', !on);
		if (text) {
			button.button("option", "label", self.localize(text));
		}
	}

	var buttons = [ {
		id : 'submit',
		text : self.localize('apply'),
		class : 'mainaction',
		click : function() {
			self.mapping_update(result(), 'apply');
			refresh();
		}
	}, {
		id : 'remove',
		text : self.localize('remove'),
		click : function() {
			self.mapping_update(result(), 'reset');
			refresh();
		}
	}, {
		id : 'invoke',
		text : self.localize('invoke'),
		click : function() {
			self.execute(window, result());
		}
	}, {
		id : 'close',
		text : self.localize('close'),
		click : function() {
			$(this).dialog('close');
		}
	} ];

	var options = {
		position : {
			my : "bottom",
			at : "bottom",
			of : window,
		},
		open : function open(event, ui) {
			editor.comment.focus();
			self.dialog_icon($(this).parent(), 'hotkeys-icon-pencil');
			self.has_part_changer = true;
			render();
		},
		close : function close(event, ui) {
			self.has_part_changer = false;
			refresh();
			$(this).remove();
		},
	};

	self.part_changer = rcmail.show_popup_dialog(content, title, buttons,
			options);
}

// key catcher dialog
plugin_hotkeys.prototype.show_keyspypad = function(args) {
	var self = this;

	var content = $('<div>').css({
		'vertical-align' : 'middle',
		'text-align' : 'center',
	});

	var icon = $('<span >').attr({
		class : self.plugin_icon_class(),
	}).css({
		'font-size' : '3em',
		'margin' : '0 auto',
	}).appendTo(content);

	function keyspypad_bind() {
		self.log('...');
		var keys = args.shortcut_keys;
		$(document).bind('keydown', keys, keyspypad_handler);
		self.event_order(keys);
	}

	function keyspypad_unbind() {
		self.log('...');
		$(document).unbind('keydown', keyspypad_handler);
	}

	function keyspypad_handler(event, key) {
		self.log('key: ' + key);
		args.key = key;
		self.part_keyspypad.dialog("close");
		return false; // #event stop/prevent
	}

	var buttons = null;

	var options = {
		width : 50,
		height : 50,
		closeOnEscape : false, // no bind in dialog
		dialogClass : 'plugin_hotkeys hide_title',
		open : function open(event, ui) {
			self.has_part_keyspypad = true;
			args.open();
			keyspypad_bind();
		},
		close : function close(event, ui) {
			self.has_part_keyspypad = false;
			args.close();
			keyspypad_unbind();
			$(this).remove();
		},
	};

	var title = null;

	self.part_keyspypad = rcmail.show_popup_dialog(content, title, buttons,
			options);
}

// export dialog
plugin_hotkeys.prototype.show_export = function(args) {
	var self = this;

	var profile_list = self.profile_list();

	var content = $('<div>');

	$('<label>', {
		text : self.localize('combine'),
	}).appendTo(content);

	var combine = $('<input>', {
		id : 'combine',
		type : 'checkbox',
	}).change(function(event) {
		profile_part.attr('disabled', has_combine());
	}).appendTo(content);

	function has_combine() {
		return combine.is(':checked');
	}

	$('<p>').appendTo(content);

	$('<label>').text(self.localize('profile')).attr({}).appendTo(content);

	$('<br>').appendTo(content);

	var profile_part = $('<select>').attr({
		id : 'profile',
		size : 7,
		multiple : true,
	}).change(function(event) {
		button_submit(has_profile());
	}).css({
		width : '30em',
	}).appendTo(content);

	function has_profile() {
		return profile_part.val() ? true : false;
	}

	$.each(profile_list, function(index, profile) {
		$('<option>').val(profile).text(profile).prop('selected', true)
				.appendTo(profile_part);
	});

	var title = self.localize('export_mapping');

	function download() {
		var prefix = self.env('export_prefix');
		var extension = self.env('export_extension');
		if (has_combine()) {
			var file_name = prefix + '.' + extension;
			var mapping_list = self.mapping_list();
			var mapping_text = self.json_encode(mapping_list, 4);
			self.download(file_name, mapping_text);
		} else if (has_profile()) {
			profile_part.find(':selected').each(function(index, element) {
				var profile = $(element).val();
				var file_name = prefix + '-' + profile + '.' + extension;
				var mapping_list = self.mapping_list(profile);
				var mapping_text = self.json_encode(mapping_list, 4);
				self.download(file_name, mapping_text);
			});
		}
	}

	function button_submit(on) {
		$('#submit').prop('disabled', !on);
	}

	var buttons = [ {
		id : 'submit',
		text : self.localize('export'),
		class : 'mainaction',
		click : function() {
			download();
		}
	}, {
		id : 'close',
		text : self.localize('close'),
		click : function() {
			$(this).dialog('close');
		}
	} ];

	var options = {
		open : function open(event, ui) {
			self.dialog_icon($(this).parent(), 'hotkeys-icon-download');
		},
		close : function close(event, ui) {
			$(this).remove();
		},
	};

	self.part_export = rcmail.show_popup_dialog(content, title, buttons,
			options);

}

// import dialog
plugin_hotkeys.prototype.show_import = function(args) {
	var self = this;

	// merge on client vs server
	var import_local = self.env('import_local');

	var content = $('<div>');

	var form_part = $('<form>').attr({
		id : 'form',
	}).appendTo(content);

	var file_part = $('<input>').attr({
		id : 'file',
		type : 'file',
		name : '_file[]',
		multiple : 'multiple',
		accept : 'application/json',
	}).change(function(event) {
		button_submit(file_part.val() ? true : false);
		report_clear();
		var file_list = file_part_list();
		$.each(file_list, function(item, file) {
			report_result(file.name);
		});
	}).appendTo(form_part);

	$('<p>').appendTo(form_part);

	var list_part = $('<textarea>').attr({
		id : 'list',
		rows : 7,
		cols : 50,
		disabled : 'disabled',
	}).appendTo(form_part);

	function file_part_list() {
		return file_part.prop('files');
	}

	function process_local_merge() {
		var file_list = file_part_list();
		self.log('file_list: ' + file_list.length);
		report_clear();
		$.each(file_list, function(item, file) {
			merge_file(file);
		});
	}

	function merge_file(file) {
		var name = file.name;
		var reader = new FileReader();
		reader.onerror = function(e) {
			report_result(name, 1, reader.error);
		}
		reader.onload = function(e) {
			try {
				var text = reader.result;
				var json = self.json_decode(text);
				merge_list(json);
				report_result(name, 0, 'success');
			} catch (e) {
				report_result(name, 2, reader.error);
			}
		}
		reader.readAsText(file);
	}

	function report_clear() {
		list_part.val('');
	}

	function report_result(name, state, message) {
		var has = message ? true : false;
		var message = self.localize(message);
		var status_line = has ? //
		name + ': ' + message + ' [' + state + ']' : name;
		list_part.val(list_part.val() + status_line + '\n');
	}

	function merge_list(mapping_source) {
		var mapping_target = self.env('mapping_list');
		$.each(mapping_source, function(index, mapping) {
			self.mapping_merge(mapping_target, mapping, 'apply');
		});
		self.save_pref('mapping_list', mapping_target, true);
	}

	// ajax response
	function action_upload_accept(param) {
		var result = param['result'];
		self.log('result: ' + self.json_encode(result));
		report_clear();
		$.each(result, function(item, file) {
			var name = file['name'];
			var state = file['state'];
			var message = file['message'];
			report_result(name, state, message);
		})
	}

	// ajax post
	function action_upload_request() {
		var file_list = file_part_list();
		self.log('file_list: ' + file_list.length);
		report_clear();
		var lock = rcmail.set_busy(true, 'uploading');
		rcmail.async_upload_form(form_part, action, function(event) {
			rcmail.set_busy(false, null, lock);
		});
	}

	function button_submit(on) {
		$('#submit').prop('disabled', !on);
	}

	var buttons = [ {
		id : 'submit',
		text : self.localize('import'),
		class : 'mainaction',
		click : function() {
			if (import_local) {
				process_local_merge();
			} else {
				action_upload_request();
			}
		}
	}, {
		id : 'close',
		text : self.localize('close'),
		click : function() {
			$(this).dialog('close');
		}
	} ];

	var action = self.key('action_upload');
	var handler = action_upload_accept.bind(self);

	var options = {
		open : function open(event, ui) {
			self.dialog_icon($(this).parent(), 'hotkeys-icon-upload');
			button_submit(false);
			if (import_local) {
				//
			} else {
				rcmail.addEventListener(action, handler);
			}
		},
		close : function close(event, ui) {
			args.refresh();
			if (import_local) {
				//
			} else {
				rcmail.removeEventListener(action, handler);
			}
			$(this).remove();
		},
	};

	var title = self.localize('import_mapping');

	self.part_import = rcmail.show_popup_dialog(content, title, buttons,
			options);
}

// share dialog
plugin_hotkeys.prototype.show_share = function(args) {
	var self = this;

	var share_list = [ 'share_via_imap', 'share_via_mail', ];

	var content = $('<div>');

	var share_part = self.html_tabs({
		localize : true,
		tabs_list : share_list,
	}).attr({}).appendTo(content);

	$('<p>').appendTo(content);

	$('<span>').text('TODO').appendTo(content);

	share_part.tabs({
		active : 1,
		create : function create(event, ui) {
			//
		},
		activate : function activate(event, ui) {
			//
		},
	});

	var buttons = [ {
		id : 'submit',
		text : self.localize('share'),
		class : 'mainaction',
		click : function() {
			//
		}
	}, {
		id : 'close',
		text : self.localize('close'),
		click : function() {
			$(this).dialog('close');
		}
	} ];

	var options = {
		open : function open(event, ui) {
			self.dialog_icon($(this).parent(), 'hotkeys-icon-share');
		},
		close : function close(event, ui) {
			$(this).remove();
		},
	};

	var title = self.localize('share_mapping');

	self.part_share = rcmail
			.show_popup_dialog(content, title, buttons, options);

}

// plugin instance
if (window.rcmail && !rcmail.is_framed()) {

	rcmail.addEventListener('init', function instance(param) {
		plugin_hotkeys.instance = new plugin_hotkeys();
	});

}

// plugin for tinymce
if (window.tinymce) {

	// provide key bind/unbind from inside the editor frame
	tinymce.PluginManager.add('plugin.hotkeys', // sync name to *.php
	function editor_setup(editor, url) {

		// bind
		function editor_create(event) {
			// console.log(event);
			var frame = event.target; // wrapper
			target = frame.contentDocument.activeElement;
			if (target) {
				instance.log('...');
				instance.plugin_bind(target);
				instance.profile_bind(target);
			} else {
				instance.log('invalid target', true);
			}
		}

		// unbind
		function editor_delete(event) {
			// console.log(event);
			if (target) {
				instance.log('...');
				instance.plugin_unbind(target);
				instance.profile_unbind(target);
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
