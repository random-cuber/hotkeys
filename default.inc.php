<?php

// Plugin default configuration file.
// Override these entries in the global config file.
// Users can change exposed entries form the application settings ui.
$config = array();

// activate plugin features
$config['plugin.hotkeys.activate_plugin'] = true;

// plugin loggin for debug
$config['plugin.hotkeys.enable_logging'] = false;

// plugin activation toolbar button
$config['plugin.hotkeys.enable_button'] = true;

// prevent default browser keys
$config['plugin.hotkeys.enable_prevent'] = true;

// manage command enabelment around invocation
$config['plugin.hotkeys.command_auto_enable'] = true;

// place plugin key handlers first
$config['plugin.hotkeys.enable_event_order'] = false; // FIXME

// remove invalid mapping entries
$config['plugin.hotkeys.enable_mapping_cleanup'] = true;

// global plugin dialog access shortcut
$config['plugin.hotkeys.plugin_hotkey'] = 'f1'; // lower case

// global plugin icon, choose from assets/fontello
$config['plugin.hotkeys.plugin_icon_class'] = 'hotkeys-icon-keyboard-black';

// file export naming: 'prefix-profile.extension'
$config['plugin.hotkeys.export_prefix'] = 'hotkeys';
$config['plugin.hotkeys.export_extension'] = 'json';

// process file import on the client
$config['plugin.hotkeys.import_local'] = true;

// persisted command/hotkey mapping table
$config['plugin.hotkeys.mapping_list'] = array();

// memento of one time default mapping application
$config['plugin.hotkeys.reset_to_default'] = true;

// provided one time init command/hotkey mapping table - from file
$config['plugin.hotkeys.default_mapping_file'] = 'hotkeys.json';

// provided one time init command/hotkey mapping table - form here
$config['plugin.hotkeys.default_mapping_list'] = array(
        array( // TODO remove empty template
                'profile' => '',
                'context' => '',
                'command' => '',
                'comment' => '',
                'script' => '',
                'key' => '',
        ),
        array( // TODO remove test entry
                'profile' => 'user',
                'context' => 'any',
                'command' => 'test',
                'comment' => 'test entry 1',
                'script' => 'alert("test 1");',
                'key' => 'ctrl+alt+1',
        ),
        array( // TODO remove test entry
                'profile' => 'user',
                'context' => 'any',
                'command' => 'test',
                'comment' => 'test entry 2',
                'script' => 'alert("test 2");',
                'key' => 'ctrl+alt+2',
        ),
        array( // TODO remove example
                'profile' => 'user',
                'context' => 'any',
                'command' => 'reload',
                'comment' => 'reload client from the server',
                'script' => 'document.location.reload(true);',
                'key' => 'alt+f1',
        ),
);

// currently active mapping category
$config['plugin.hotkeys.profile'] = 'cor.bosman';

// enabled command/hotkey mapping categories
$config['plugin.hotkeys.profile_list'] = array(
        'user',
        'linux',
        'macosx',
        'windows',
        'cor.bosman', // TODO remove example
        'andrei.pozolotin', // TODO remove example
);

// command/hotkey mapping filter
// empty/missing array() in filter matches any
$config['plugin.hotkeys.context_mapa'] = array(

        'any' => array(
                'help' => 'catch-all context',
                'task_list' => array(),  // required tasks in rcmail.env.task
                'action_list' => array(), // required actions in rcmail.env.action
                'focused_mapa' => array(), // node id => present/missing in window.focus
                'target_name_mapa' => array(), // node name rx => present/missing in event.target
        ),

        'mail_any' => array(
                'help' => 'global mail access',
                'task_list' => array('mail', ),
        ) ,
        
        'mail_box' => array(
                'help' => 'visible mailbox list',
                'task_list' => array('mail', ),
                'action_list' => array('', 'list', 'show', 'preview', ),
        ) ,
        
        'mail_list' => array(
                'help' => 'visible message list',
                'task_list' => array('mail', ),
                'action_list' => array('', 'list', ),
                'target_name_mapa' => array( 'input|select' => false,  ),
        ) ,
        
        'mail_edit' => array(
                'help' => 'mail compose editor',
                'task_list' => array('mail', ),
                'action_list' => array('compose', ),
        ),
        
        'mail_view' => array(
                'help' => 'visible mail body frame (no edit)',
                'task_list' => array('mail', ),
                'action_list' => array('show', 'preview', ),
        ),

        'book_any' => array(
                'help' => 'global address book access',
                'task_list' => array('addressbook', ),
                'action_list' => array(),
        ),
        
        'book_list' => array( // visible contact list
                'help' => '',
                'task_list' => array('addressbook', ),
                'action_list' => array(''),
        ),
        
        'book_edit' => array(
                'help' => '',
                'task_list' => array('addressbook', ),
                'action_list' => array('edit'),
        ),
        
        'book_view' => array(
                'help' => '',
                'task_list' => array('addressbook', ),
                'action_list' => array('show', ),
        ),
        
        'mailboxlist' => array( // mail folder list
                'help' => '',
                'focused_mapa' => array('mailboxlist' => true),
        ) ,

        'quicksearchbox' => array(
                'help' => 'shared mail & book search',
                'focused_mapa' => array('quicksearchbox' => true),
        ) ,

        'messagessearchfilter' => array(
                'help' => 'mail filter selector',
                'focused_mapa' => array('messagessearchfilter' => true),
        ) ,
        
        'contacts-table' => array(
                'help' => 'address book contact list',
                'focused_mapa' => array('contacts-table' => true),
        ) ,

);

// https://github.com/jeresig/jquery.hotkeys
// control jQuery.hotkeys.options.filterTextInputs
// control jQuery.hotkeys.options.filterInputAcceptingElements
$config['plugin.hotkeys.options_filter_input'] = false; 

// user managed commands
$config['plugin.hotkeys.custom_command_list'] = array(
        '#', // a place for 'new'
        'noop', // idle command
        'test', // command testing
        // mail list
        'reload', // reload page in browser
        'select:all', // global list selection
        'select:page', // limited page selection
        '#mailboxlist', // focus/blur mailbox list table
        '#messagelist', // focus/blur message list table
        '#quicksearchbox', // focus/blur type-in search input
        '#messagessearchfilter', // focus/blur message list filter
        // mail compose
        'edit:html', // switch editor to html
        'edit:text', // switch editor to text
        '#contactsearchbox', // focus/blur contact finder
        '#_from', // focus/blur "from" input
        '#_to', // focus/blur "to" input
        '#compose-subject', // focus/blur "subject" input
        '#composebody', // edit area, text mode
        '#composebody_ifr', // edit area, html mode
        // address book
        '#contacts-table', // focus/blur book contact list
        '#contacttabs-1', // switch to contact form tab
        '#contacttabs-2', // switch to contact form tab
        '#contacttabs-3', // switch to contact form tab
);

// known built-ins: see program/js/app.js rcube_webmail.command()
$config['plugin.hotkeys.internal_command_list'] = array(

        'login',
        'logout',
        'mail',
        'addressbook',
        'settings',
        'about',

        'permaurl',
        'extwin',
        'change-format',

        'menu-open',
        'menu-close',
        'menu-save',

        'open',
        'close',
        'list',
        'set-listmode',
        'sort',

        'nextpage',
        'lastpage',
        'previouspage',
        'firstpage',

        'expunge',
        'purge',

        'show',
        'add',
        'edit',
        'save',
        'delete',

        'move',
        'copy',
        'mark',
        'toggle_flag',
        'always-load',
        'load-images',
        'download-attachment',

        'select-all',
        'select-none',

        'expand-all',
        'expand-unread',
        'collapse-all',

        'nextmessage',
        'lastmessage',
        'previousmessage',
        'firstmessage',

        'compose',
        'spellcheck',
        'savedraft',
        'send',
        'send-attachment',
        'insert-sig',
        'list-addresses',
        'add-recipient',

        'reply-all',
        'reply-list',
        'reply',

        'forward-attachment',
        'forward-inline',
        'forward',

        'print',
        'viewsource',
        'download',

        'search',
        'reset-search',

        'pushgroup',
        'listgroup',
        'popgroup',

        'import-messages',
        'import',
        'export',
        'export-selected',

        'upload-photo',
        'delete-photo',

        'preferences',
        'identities',
        'responses',
        'folders',

        'undo',

        'checkmail',

);

///////

// expose these settings in user ui
$config['plugin.hotkeys.settings_checkbox_list'] = array(
        'activate_plugin',
        'enable_logging',
        'enable_button',
        'enable_prevent',
        // 'options_filter_input',
        'reset_to_default',
);

// expose these settings in user ui
$config['plugin.hotkeys.settings_select_list'] = array(
);

// expose these settings in user ui
$config['plugin.hotkeys.settings_area_list'] = array(
        'profile_list',
        'custom_command_list',
        // 'internal_command_list',
        'supported_meta_keys',
        // 'supported_base_keys',
        'prevent_default_keys',
);

// expose these settings in user ui
$config['plugin.hotkeys.settings_text_list'] = array(
        'plugin_hotkey',
        // 'plugin_icon_class',
);

///////////

// can not prevent/re-map:

// reserved by chromium: [Shift]Ctrl(Q|N|W|T|↹|{number}),
// https://support.google.com/chrome/answer/157179?hl=en

// reserved by firefox: TODO

// reserved by int exp: TODO

// TODO make browser/os dependent
// disable these default browser actions
$config['plugin.hotkeys.prevent_default_keys'] = array(
        'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10',
        'alt+1', 'alt+2', 'alt+3', 'alt+4', 'alt+5', 'alt+6', 'alt+7', 'alt+8', 'alt+9', 'alt+0',
        'ctrl+h', // history
        'ctrl+d', // bookmark
        'ctrl+e', // location
        'ctrl+k', // location
        'ctrl+l', // location
        'ctrl+g', // location
        'ctrl+j', // download
        'ctrl+f', // search
        'ctrl+p', // print
        'ctrl+s', // save
        'ctrl+r', // reload
        'ctrl+u', // view html
        'ctrl+o', // open file
);

// permitted alt/ctrl/shift prefix key combinations
$config['plugin.hotkeys.supported_meta_keys'] = array( // lower case
        'alt', 'ctrl', 'shift', 'alt+ctrl', 'alt+shift', 'ctrl+shift',
);

// permitted base keys, to use as-is and to combine with meta_keys
$config['plugin.hotkeys.supported_base_keys'] = array( // lower case
        'esc', 'tab', 'space', 'return', 'backspace', 'scroll', 'capslock', 'numlock', 
        'insert', 'home', 'del', 'end', 'pageup', 'pagedown', 'left', 'up', 'right', 'down', 
        'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 
        'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's',
        't', 'u', 'v', 'w', 'x', 'y', 'z',
);

?>
