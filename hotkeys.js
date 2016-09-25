// plugin class
function plugin_hotkeys() {
	var self = this;

	// public command
	this.activate = function() {
		self.show_arkon();
	}

	// plugin name space
	this.key = function(name) {
		return 'plugin.hotkeys.' + name; // keep in sync with *.php
	}

	// environment variable
	this.env = function(name) {
		return rcmail.env[self.key(name)];
	}

	// plugin client logger
	this.log = function(text, force) {
		if (self.env('enable_logging') || force) {
			var name = arguments.callee.caller.name;
			var entry = self.key(name);
			rcmail.log(entry + ': ' + text);
		}
	};

	// provide localization
	this.localize = function(name) {
		return rcmail.get_label(name, 'hotkeys');
	}

	// mapping table fields
	this.field_list = function() {
		return [ 'profile', 'command', 'context', 'key', 'comment', 'source' ];
	}

	// mapping table filters
	this.filter_list = function() {
		return [ 'all', 'active', 'passive', 'custom', 'internal', 'external',
				'undefined' ];
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
		if (!self.env('enable_event_order')) {
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

	// https://github.com/jeresig/jquery.hotkeys
	function jquery_hotkeys_options() {
		var filter_input = self.env('options_filter_input') || false;
		$.hotkeys.options.filterTextInputs = filter_input;
		$.hotkeys.options.filterInputAcceptingElements = filter_input;
	}

	// plugin on load setup
	this.initialize = function initialize() {

		if (self.env('activate_plugin')) {
			self.log('enabled');
		} else {
			self.log('disabled');
			return;
		}

		if (rcmail.env['framed']) {
			self.log('idle: frame');
			return;
		}

		jquery_hotkeys_options();

		self.register_command('activate');
		self.plugin_button_update();

		self.apply_binds([ 'plugin_bind', 'profile_bind' ]);

	}

	// perform hot key handler bind/unbind on root and frame
	this.apply_binds = function apply_binds(func_list) {
		$.each(func_list, function apply_root(_, func) {
			self.log(func);
			self[func](document);
			$('iframe').each(function() {
				$(this).load(function apply_frame() {
					self.log(func);
					self[func](this.contentWindow.document);
				});
			});
		});
	}

	// expose plugin command
	this.register_command = function(name) {
		rcmail.register_command(self.key(name), self[name].bind(self), true);
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

	// activate keyboard shortcut handler
	this.perform_bind = function perform_bind(target, keys, handler) {
		self.log('title: ' + target_title(target));
		$(target).bind('keydown', keys, handler);
		self.event_order(keys);
	}

	// deactivate keyboard shortcut handler
	this.perform_unbind = function perform_unbind(target, handler) {
		self.log('title: ' + target_title(target));
		$(target).unbind('keydown', handler);
	}

	// activate keyboard shortcut handler
	this.plugin_bind = function plugin_bind(target) {
		self.log('...');
		var keys = self.env('plugin_hotkey');
		self.perform_bind(target, keys, self.plugin_handler);
	}

	// deactivate keyboard shortcut handler
	this.plugin_unbind = function plugin_unbind(target) {
		self.log('...');
		self.perform_unbind(target, self.plugin_handler);
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
			self.show_arkon();
		}
		return false; // event stop
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

	// activate keyboard shortcut handler
	this.profile_bind = function profile_bind(target) {
		var profile = self.profile_get();
		var mapping_list = self.mapping_list(profile);
		var mapping_size = mapping_list.length;
		self.log('profile: ' + profile + ': ' + mapping_size);
		if (mapping_size == 0) {
			return;
		}
		self.profile_mapping = self.build_mapping(mapping_list);
		var keys = self.array_column(mapping_list, 'key').join(" ");
		self.perform_bind(target, keys, self.profile_handler);
	}

	// deactivate keyboard shortcut handler
	this.profile_unbind = function profile_unbind(target) {
		var profile = self.profile_get();
		self.log('profile: ' + profile);
		self.perform_unbind(target, self.profile_handler);
		self.profile_mapping = {};
	}

	// profile command invoker
	this.profile_handler = function profile_handler(event, key) {
		self.log('key: ' + key);
		var mapping_list = self.profile_mapping[key];
		$.each(mapping_list, function(_, mapping) {
			self.execute(mapping, event);
		});
		return false; // event stop
	}

	// list filter
	function match_list(list, item) {
		// empty matches any
		return list.length == 0 || list.indexOf(item) >= 0;
	}

	// focus filter
	function match_focused(list) {
		// empty matches any
		if (list.length == 0) {
			return true;
		}
		var match;
		$.each(list, function match_focused(id, present) {
			var has_focus = self.html_by_id(id).is(":focus");
			match = present ? has_focus : !has_focus;
			self.log('id=' + id + '' + ' has_focus=' + has_focus + ' match='
					+ match);
			return false; // break
		});
		return match;
	}

	// event target filter
	function match_target_name(list, event) {
		// empty matches any
		if (list.length == 0) {
			return true;
		}
		var match, node_name = event.target.nodeName;
		$.each(list, function match_target_name(name, present) {
			var rx = new RegExp(name, 'i');
			var has_name = rx.test(node_name);
			match = present ? has_name : !has_name;
			self.log('name=' + name + '' + ' node_name=' + node_name
					+ ' match=' + match);
			return false; // break
		});
		return match;
	}

	// short representation for boolean
	function char(bool) {
		return bool ? '+' : '-';
	}

	// verify current execution context
	this.match_context = function match_context(name, event) {

		var task = rcmail.env.task;
		var action = rcmail.env.action;
		self.log('task=[' + task + '] action=[' + action + ']');

		var context_mapa = self.env('context_mapa');
		var context = context_mapa[name] || {};
		self.log(name + '=' + self.json_encode(context, 4));

		var task_list = context.task_list || [];
		var action_list = context.action_list || [];
		var focused_mapa = context.focused_mapa || [];
		var target_name_mapa = context.target_name_mapa || [];

		var has_task = match_list(task_list, task);
		var has_action = match_list(action_list, action);
		var has_focused = match_focused(focused_mapa);
		var has_target_name = match_target_name(target_name_mapa, event);

		var has_match = has_task && has_action && has_focused
				&& has_target_name;

		var match_mask = char(has_task) + char(has_action) + char(has_focused)
				+ char(has_target_name);

		self.log('has_match=' + has_match + ' (' + match_mask + ')');

		return has_match;
	}

	// invoke command defined by mapping
	this.execute = function execute(mapping, event, force) {
		var context = mapping.context;
		var enable = force || self.match_context(context, event);
		if (!enable) {
			return;
		}
		var command = mapping.command;
		if (command) {
			self.log(command);
			var auto_enable = self.env('command_auto_enable') || false;
			var was_enabled = rcmail.command_enabled(command) || false;
			var manage_enabled = auto_enable && !was_enabled;
			if (manage_enabled) {
				rcmail.enable_command(command, true);
			}
			try {
				var script = mapping.script;
				if (script) {
					self.evaluate(mapping);
				} else {
					rcmail.command(command);
				}
			} catch (e) {
				self.log('error: ' + e, true);
			} finally {
				if (manage_enabled) {
					rcmail.enable_command(command, false);
				}
			}
		} else {
			self.log('error: invalid command: ' + command, true);
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
			supported_keys.push(key);
			$.each(meta_keys, function(idx2, meta) {
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

}

// script evaluator
plugin_hotkeys.prototype.evaluate = function evaluate(mapping) {
	var self = this;
	var script = mapping.script;
	var command = mapping.command;
	self.log(script);
	// TODO build eval sand box
	// expose vars: $, rcmail, command
	eval(script);
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
		return root.entry_list[id];
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
		root.entry_list = entry_list;
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
		class : 'popupmenu',
	}).css({
		display : 'none',
	}).data('handler', args.handler);

	var ul = $('<ul>').attr({
		class : 'toolbarmenu iconized',
	}).appendTo(div);

	$.each(args.item_list, function(_, item) {
		var li = $('<li>').appendTo(ul);
		var a = $('<a>').attr({
			href : '#',
			class : args['class'] || 'icon active',
		}).data('id', item.id).appendTo(li);
		var name = self.localize(item.name || item.id);
		var span = $('<span>').attr({
			class : item['class'] || 'icon',
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
plugin_hotkeys.prototype.show_arkon = function(args) {
	var self = this;

	var profile_list = self.profile_list();
	var filter_list = self.filter_list();
	var field_list = self.field_list();

	var active_filter = 'all';

	var content = $('<div>').css({
		height : '36em',
	});

	//

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
		height : '28em',
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
			self.execute(mapping_widget.$choice(), null, true);
			break;
		default:
			self.log('error: ' + id, true);
			break;
		}
	}

	var menu_info = { // TODO css
		id : 'plugin_hotkeys_arkon_menu',
		handler : menu_handler,
		item_list : [ {
			id : 'new',
			class : 'icon unread',
		}, {
			id : 'change',
			class : 'icon edit',
		}, {
			id : 'remove',
			class : 'icon cross',
		}, {
			id : 'invoke',
			class : 'icon flagged',
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
		open : function open(event, ui) {
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
		close : function close(event, ui) {
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
		return self.localize('tooltip_' + id);
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

	function keyspypad(id) { // TODO css
		var row = $('<tr>').appendTo(table);

		var lab = label(id);

		var btn = button(id + '_click').css({
			width : '15em',
		// height : '1.7em',
		}).text('...').attr({
		// class : 'ui-icon ui-icon-heart',
		}); // .button();

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

		inp.on('input', function inp_change(event) {
			var key = inp.val();
			var is_valid = shortcut_list.indexOf(key) >= 0;
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
		command : chooser('command', command_list, false).change(render).val(
				self.valid_val(command_list, mapping.command)),
		context : chooser('context', context_mapa, true).change(render).val(
				self.valid_key(context_mapa, mapping.context)),
		comment : entry('comment').val(mapping.comment).keypress(keypress),
		script : entry('script').val(mapping.script).keypress(keypress),
		key : keyspypad('key').val(mapping.key).keypress(keypress),
	};

	function result() {
		return {
			profile : editor.profile.val(),
			command : editor.command.val(),
			context : editor.context.val(),
			comment : editor.comment.val(),
			script : editor.script.val(),
			key : editor.key.val(),
		};
	}

	var delay = 1000;
	table.tooltip({
		track : false,
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
				$(ui.tooltip).hide('explode');
			}, delay * 2);
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
			self.execute(result(), null, true);
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
	});

	var icon = $('<span >').attr({
		class : 'ui-icon ui-icon-heart',
	}).css({
		margin : '0 auto',
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
		return false; // event stop
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

	var options = {};

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
			//
		},
		close : function close(event, ui) {
			$(this).remove();
		},
	};

	var title = self.localize('share_mapping');

	self.part_share = rcmail
			.show_popup_dialog(content, title, buttons, options);

}

// plugin singleton
plugin_hotkeys.instance = null;

if (rcmail) {

	rcmail.addEventListener('init', function instance(param) {
		plugin_hotkeys.instance = new plugin_hotkeys();
		plugin_hotkeys.instance.initialize();
	});

}
