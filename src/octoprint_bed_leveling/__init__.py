import octoprint.plugin


class BedLevelingPlugin(
    octoprint.plugin.SettingsPlugin,
    octoprint.plugin.AssetPlugin,
    octoprint.plugin.TemplatePlugin,
):

    # Settings

    def get_settings_defaults(self):
        return dict(
            insertBeforeCustomControls=True,
            collapseByDefault=False,
            hideWarning=False,
            travelHight=5,
            probePoints=dict(
                frontLeft=dict(x=None, y=None),
                frontRight=dict(x=None, y=None),
                center=dict(x=None, y=None),
                backLeft=dict(x=None, y=None),
                backRight=dict(x=None, y=None),
            ),
        )

    # Assets

    def get_assets(self):
        return dict(
            js=["dist/bed_leveling.js"],
            css=["dist/bed_leveling.css"],
        )

    def get_template_configs(self):
        return [
            dict(type="settings", template="bed_leveling_settings.jinja2"),
            dict(type="generic", template="bed_leveling_control_tab.jinja2"),
        ]

    # SoftwareUpdate

    def get_update_information(self):
        return {
            "bed_leveling": {
                "displayName": f"{self._plugin_name} Plugin",
                "displayVersion": self._plugin_version,

                # version check: github repository
                "type": "github_release",
                "user": "malnvenshorn",
                "repo": "octoprint-bedleveling",
                "current": self._plugin_version,

                # update method: pip
                "pip": "https://github.com/malnvenshorn/octoprint-bedleveling/archive/{target_version}.zip",
            },
        }


__plugin_name__ = "Bed Leveling"

__plugin_pythoncompat__ = ">=3.7"

__plugin_implementation__ = BedLevelingPlugin()

__plugin_hooks__ = {
    "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
}
