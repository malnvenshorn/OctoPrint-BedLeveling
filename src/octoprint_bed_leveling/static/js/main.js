import ControlTab from './viewmodels/control_tab';
import Settings from './viewmodels/settings';

class BedLevelingPlugin {
    constructor(dependencies) {
        this.core = { viewModels: {} };

        [
            this.core.viewModels.settings,
            this.core.viewModels.loginState,
            this.core.viewModels.access,
            this.core.viewModels.control,
        ] = dependencies;

        this.viewModels = {};
        this.viewModels.settings = new Settings();
        this.viewModels.controlTab = new ControlTab(this.core.viewModels, this.viewModels.settings);

        // All onEvent* callbacks must be an own property
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((name) => {
            if (name.startsWith('onEvent') && typeof this[name] === 'function') {
                this[name] = Object.getPrototypeOf(this)[name];
            }
        });
    }

    callOnAllViewModels(funcName, ...args) {
        Object.keys(this.viewModels).forEach((viewModel) => {
            this.viewModels[viewModel][funcName]?.(...args);
        });
    }

    // ViewModel callbacks

    onBeforeBinding() {
        // This is the earliest state where settingsViewModels.settings is defined
        this.viewModels.settings.initialize(this.core.viewModels.settings);
        this.callOnAllViewModels('onBeforeBinding');
    }

    onEventPositionUpdate(payload) {
        this.callOnAllViewModels('onEventPositionUpdate', payload);
    }
}

OCTOPRINT_VIEWMODELS.push({
    construct: BedLevelingPlugin,
    dependencies: [
        'settingsViewModel',
        'loginStateViewModel',
        'accessViewModel',
        'controlViewModel',
    ],
    elements: [
        '#settings_plugin_bed_leveling',
        '#control_plugin_bed_leveling',
    ],
});
