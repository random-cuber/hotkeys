<?php

class hotkeys extends rcube_plugin {

    public $task = '.*'; // supported tasks regex filter
    public $allowed_prefs = array(); // see: rcube_plugin->$allowed_prefs
    private $config_default = array(); // default plugin configuration
    private $rc; // controller singleton

    // early instace init
    function onload() {
        $this->provide_allowed_prefs();
    }

    // final instace init
    function init() {
        $this->require_plugin('jqueryui');
        $this->rc = rcmail::get_instance();
        
        $this->provide_config_default();
        
        $this->add_hook('config_get', array($this, 'hook_config_get'));
        $this->add_hook('preferences_update', array($this, 'hook_preferences_update'));
        
        $this->register_action($this->key('action_upload'), array($this, 'action_upload'));

        if ($this->rc->output->type == 'html') {
            $this->rc->output->include_script('list.js'); // global
            $this->include_script('assets/jquery.hotkeys.js');
            $this->include_script('hotkeys.js');
            $this->include_stylesheet( 'skins' . '/style.css');
            $this->include_stylesheet($this->local_skin_path() . '/style.css');
            $this->add_texts('localization', true);
            $this->provide_mapping_list();
            $this->provide_client_env_var();
        }

        if($this->config_get('enable_button')) {
            $this->add_button(array(
                    'domain'   => 'hotkeys', 
                    'id'       => $this->key('button'),
                    'type'     => 'link',
                    'label'    => 'button_text',
                    'title'    => 'button_title',
                    'command'  => $this->key('activate'), // see *.js
                    'class'    => 'button hotkeys download', // TODO icon
                ),'toolbar');
        }

        if($this->rc->task == 'mail') {
            //
        }

        if($this->rc->task == 'settings') {
            $this->add_hook('preferences_list', array($this, 'hook_preferences_list'));
            $this->add_hook('preferences_save', array($this, 'hook_preferences_save'));
        }
        
    }
    
    ////////////////////////////
    
    // plugin name space
    function key($name) {
        return 'plugin.hotkeys.' . $name; // keep in sync with *.js
    }

    // client environment variables
    function set_env($name, $value = null) {
        $key = $this->key($name);
        if(! isset($value)) {
            $value = $this->config_get($name);
        }
        $this->rc->output->set_env($key, $value);
    }
    
    // plugin server logger
    function log($line, $force = false) {
        if($this->config_get('enable_logging') || $force){
            $file = $this->key('log');
            $func = debug_backtrace()[1]['function'];
            $text = $func . ' : ' . $line;
            rcube::write_log($file, $text);
        }
    }
    
    // localized quoted text
    function quoted($name) {
        return rcube::Q($this->gettext($name));
    }
    
    // load plugin preferences
    function config_get($name) {
        $key = $this->key($name); 
        return $this->rc->config->get($key);
    }
    
    // save plugin preferences
    function config_put($name, $value) {
        $key = $this->key($name);
        $this->rc->user->save_prefs(array($key => $value));
    }

    // read client post result
    function input_value($name) {
        $name = str_replace('.', '_', $name); // PHP convention
        return rcube_utils::get_input_value($name, rcube_utils::INPUT_POST);
    }
    
    // load plugin default configuration file
    function provide_config_default($name = 'default.inc.php') {
        $config = null;
        $path = $this->home . '/' . $name;
        if ($path && is_file($path) && is_readable($path)) {
            ob_start();
            include($path);
            ob_end_clean();
        }
        if (is_array($config)) {
            $this->config_default = $config;
        }
    }
    
    // process default mapping setup
    function provide_mapping_list() {
        $reset_to_default = $this->config_get('reset_to_default');
        if($reset_to_default) {
            $json_list = $this->json_default(); // default.json
            $iphp_list = $this->config_get('default_mapping_list'); // default.inc.php
            $mapping_list = array_merge($json_list, $iphp_list);
            $this->config_put('mapping_list', $mapping_list);
            $this->config_put('reset_to_default', false); // one time
            $this->log(print_r($mapping_list, true));
        }
    }
    
    // environment variables
    function provide_client_env_var() {
       $name_list = array(
           'activate_plugin', 
           'enable_logging',
           'enable_event_order',
           'plugin_hotkey',
           'export_prefix',
           'export_extension',
           'import_local',
           'context_mapa',
           'mapping_list',
           'profile',
           'profile_list',
           'custom_command_list',
           'internal_command_list',
           'supported_meta_keys',
           'supported_base_keys',
           'options_filter_input',
       );
       foreach($name_list as $name) {
           $this->set_env($name);
       }
    }
    
    // inject plugin default config
    function hook_config_get($args){
        $name = $args['name'];
        $result = $args['result'];
        $default = $this->config_default[$name];
        if(! isset($result) && isset($default)) {
            $args['result'] = $default;
        }
        return $args;
    }

    // inspect prefs values, see rcube_user.php
    function hook_preferences_update($args){
        // $this->log(print_r($args, true));
        return $args;
    }

    // convert json file to array
    function json_load($path) {
        $text = file_get_contents($path);
        $json = json_decode($text, true);
        return $json;
    }

    // default plugin mappings
    function json_default() {
        $prefix = $this->config_get('export_prefix');
        $extension = $this->config_get('export_extension');
        $name = $prefix .  '.' . $extension;
        $path = $this->home . '/' . $name;
        return $this->json_load($path);
    }

    // allow to save these prefs on demand, see util/save_pref.inc
    function provide_allowed_prefs() {
        $this->allowed_prefs = array(
            $this->key('profile'),
            $this->key('mapping_list'),
        );
    }
    
    // rotate table
    function transpose($matrix) {
        $result = array(); 
        foreach($matrix as $key1 => $value1) {
            foreach($value1 as $key2 => $value2){
                $result[$key2][$key1] = $value2; 
            }
        }
        return $result;
    }
    
    // mapping identity
    function guid($mapping) {
        return $mapping['profile'] . '/' . $mapping['command'] . '/' . $mapping['context'];
    }

    // mapping identity
    function has_guid($mapping) {
        return $mapping && $mapping['profile'] && $mapping['command'] && $mapping['context'];
    }
    
    // keep entries with guid
    function mapping_clean($mapping_list) {
        return array_filter($mapping_list, array($this, 'has_guid'));
    }
    
    // use source over target by identity
    function mapping_override($source_list, $target_list, & $result_list) {
        foreach($target_list as $target_mapping) {
            $target_guid = $this->guid($target_mapping);
            $found = false;
            foreach($source_list as $source_mapping) {
                $source_guid = $this->guid($source_mapping);
                if( $source_guid == $target_guid ) {
                    $result_list[] = $source_mapping;
                    $found = true; break;
                }
            }
            if(! $found) {
                $result_list[] = $target_mapping;
            }
        }
    }
    
    // override current
    function mapping_merge($source_list) {
        $result_list = array();
        $target_list = $this->config_get('mapping_list');
        $this->mapping_override($source_list, $target_list, $result_list);
        // $this->config_put('mapping_list', $result_list); // FIXME
        return true;
    }
    
    // apply upload
    function mapping_import(& $file) {
        $type = $file['type']; $name = $file['name'];
        $size = $file['size']; $path = $file['tmp_name'];
        $error = $file['error'];
        if( $error != 0 || $size == 0 || ! is_file($path) ) {
            $file['state'] = 1; $file['method'] = 'validate'; $file['message'] = 'failure';
            return false;
        }
        $text = file_get_contents($path);
        if(!$text) {
            $file['state'] = 2; $file['method'] = 'file_get_contents'; $file['message'] = 'failure';
            return false;
        }
        $json = json_decode($text, true);
        if(!$json) {
            $file['state'] = 3; $file['method'] = 'json_decode'; $file['message'] = json_last_error_msg();
            return false;
        }
        $done = $this->mapping_merge(json);
        if(!$done) {
            $file['state'] = 4; $file['method'] = 'mapping_merge'; $file['message'] = 'failure';
            return false;
        }
        $file['state'] = 0; $file['method'] = 'mapping_import'; $file['message'] = 'success';
        return true;
    }

    // ajax post
    public function action_upload() {
        $result = array();
        $file_list = $_FILES['_file'];
        if (is_array($file_list)) {
            $file_list = $this->transpose($file_list);
            foreach($file_list as $file){
                $this->log('$file: ' . print_r($file, true));
                $this->mapping_import($file);
                $result[] = $file;
            }
        } else {
            $this->log('invalid $file_list', true);
        }
        $this->log(print_r($result, true));
        $output = $this->rc->output;
        $output->command($this->key('action_upload'), array('result' => $result));
        $output->send('iframe');
    }

    ////////////////////////////
    
    // plugin settings section
    function is_plugin_section($args) {
        return $args['section'] == 'general';
    }
    
    // settings exposed to user
    function settings_checkbox_list() {
        return $this->config_get('settings_checkbox_list');
    }

    // settings exposed to user
    function settings_select_list() {
        return $this->config_get('settings_select_list');
    }

    // settings exposed to user
    function settings_area_list() {
        return $this->config_get('settings_area_list');
    }

    // settings exposed to user
    function settings_text_list() {
        return $this->config_get('settings_text_list');
    }

    // settings checkbox
    function build_checkbox(& $entry, $name) {
        $key = $this->key($name);
        $checkbox = new html_checkbox(array(
             'id' => $key, 'name' => $key, 'value' => 1,
        ));
        $entry['options'][$name] = array(
            'title' => html::label($key, $this->quoted($name)),
            'content' => $checkbox->show($this->config_get($name)),
        );
    }

    // settings multi select
    function build_select(& $entry, $name, $option_list) {
        $key = $this->key($name);
        $select = new html_select(array(
             'id' => $key, 'name' => $key . '[]', // use array 
             'multiple' => true, 'size' => 5,
        ));
        $select->add($option_list, $option_list); // value => content
        $entry['options'][$name] = array(
            'title' => html::label($key, $this->quoted($name)),
            'content' => $select->show($this->config_get($name)),
        );
    }
    
    // settings multi line text area
    function build_textarea(& $entry, $name) {
        $key = $this->key($name);
        $textarea = new html_textarea(array(
             'id' => $key, 'name' => $key, 'rows' => 5, 'cols' => 45,
        ));
        $entry['options'][$name] = array(
            'title' => html::label($key, $this->quoted($name)),
            'content' => $textarea->show(implode(PHP_EOL, $this->config_get($name))),
        );
    }
    
    // settings single line text input
    function build_text(& $entry, $name) {
        $key = $this->key($name);
        $input = new html_inputfield(array(
             'id' => $key, 'name' => $key, 'value' => 1,
        ));
        $entry['options'][$name] = array(
            'title' => html::label($key, $this->quoted($name)),
            'content' => $input->show($this->config_get($name)),
        );
    }
    
    // build settings ui
    function hook_preferences_list($args) {
        if ($this->is_plugin_section($args)) {
            $blocks = & $args['blocks'];
            $section = $this->key('section');
            $blocks[$section] = array(); $entry = & $blocks[$section];
            $entry['name'] = $this->quoted('hotkeys');
            foreach($this->settings_checkbox_list() as $name) {
                $this->build_checkbox($entry, $name);
            }
            foreach($this->settings_select_list() as $name) {
                $this->build_select($entry, $name, self::$filter_type_list);
            }
            foreach($this->settings_area_list() as $name) {
                $this->build_textarea($entry, $name);
            }
            foreach($this->settings_text_list() as $name) {
                $this->build_text($entry, $name);
            }
        }
        return $args;
    }
    
    // settings checkbox
    function persist_checkbox(& $prefs, $name) {
        $key = $this->key($name); $value = $this->input_value($key);
        $prefs[$key] =  $value ? true : false;
    }
  
    // settings multi select
    function persist_select(& $prefs, $name) {
        $key = $this->key($name); $value = $this->input_value($key);
        $prefs[$key] = $value;
    }
  
    // settings multi line text area
    function persist_textarea(& $prefs, $name) {
        $key = $this->key($name); $value = $this->input_value($key);
        $value = explode(PHP_EOL, $value); // array from text
        $value = array_map('trim', $value); // no spaces
        $value = array_filter($value); // no empty lines
        // sort($value); // alpha sorted
        $prefs[$key] = $value;
    }

    // settings single line text
    function persist_text(& $prefs, $name) {
        $key = $this->key($name); $value = $this->input_value($key);
        $prefs[$key] = trim($value);
    }

    // persist user settings
    function hook_preferences_save($args) {
        if ($this->is_plugin_section($args)) {
            $prefs = & $args['prefs'];
            foreach($this->settings_checkbox_list() as $name) {
                $this->persist_checkbox($prefs, $name);
            }
            foreach($this->settings_select_list() as $name) {
                $this->persist_select($prefs, $name);
            }
            foreach($this->settings_area_list() as $name) {
                $this->persist_textarea($prefs, $name);
            }
            foreach($this->settings_area_list() as $name) {
                $this->persist_textarea($prefs, $name);
            }
            foreach($this->settings_text_list() as $name) {
                $this->persist_text($prefs, $name);
            }
        }
        return $args;
    }

}

?>
