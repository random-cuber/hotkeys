Roundcube Hot Keys Plugin
=========================

Technical plugin name is [hotkeys][hotkeys_link].

| Main plugin dialog      | 
|:-----------------------:|
| ![][plugin_dialog_main] |

Manual Install
--------------
Installation can be done in two steps:
providing resources and activating configuration.

1) Provision plugin resources.
For example, for [roundcube on archlinux][roundcube_arch]:
```
cd /usr/share/webapps/roundcubemail/plugins

rm -r -f hotkeys
git clone https://github.com/random-cuber/hotkeys.git hotkeys
```

2) Activate plugin in `roundcube` configuration.
For example, for [roundcube on archlinux][roundcube_arch]:
```
cat /etc/webapps/roundcubemail/config/config.inc.php

$config['plugins'] = array(
    'jqueryui',  // dependency
    'hotkeys',   // plugin proper
);
```

Settings
--------

Navigate to:
```
Settings -> Preferences -> User Interface -> Hot Keys
```

Menu entries:
* `TODO` : TODO

Operation
---------

Main plugin dialog:

Navigate to:
```
[Anywhere] -> [Press plugin access key (default: F1)]
```

Dialog entries:
* `TODO` : TODO

[roundcube_arch]: https://wiki.archlinux.org/index.php/Roundcube
[hotkeys_link]: http://plugins.roundcube.net/packages/random-cuber/hotkeys
[plugin_dialog_main]:  https://raw.githubusercontent.com/random-cuber/hotkeys/master/build/plugin_dialog_main.png
