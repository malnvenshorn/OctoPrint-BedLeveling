/* eslint-disable import/prefer-default-export */

/**
 * When a function is called as a method of an object, 'this' is set to the object the method is
 * called on. This 'autobind' function is intended to be used within a class constructor to bind
 * all methods to the instance itself. This allows to pass methods as callback functions and be
 * sure that the callback will be invoked with the correct context.
 */
function autobind() {
    const prototype = Object.getPrototypeOf(this);
    Object.getOwnPropertyNames(prototype).forEach((name) => {
        if (typeof this[name] === 'function' && name !== 'constructor') {
            this[name] = this[name].bind(this);
        }
    });
}

class ControlTab {
    constructor(core, settings) {
        autobind.call(this);

        this.core = core;
        this.settings = settings;

        this.currentProbePoint = undefined;
        this.awaitingPositionUpdate = false;

        this.topographyRelativeToCenter = ko.observable(false);

        // Holds the Z position for each probe point
        this.zPositionForPoint = {};
        // Computed values for the print bed topography. The values are either absolut or relativ to the center
        this.bedTopography = {};

        const probePoints = ['frontLeft', 'frontRight', 'center', 'backLeft', 'backRight'];

        probePoints.forEach((point) => {
            this.zPositionForPoint[point] = ko.observable();
            this.bedTopography[point] = ko.pureComputed(() => {
                let value;
                if (this.topographyRelativeToCenter()
                        && this.zPositionForPoint[point]() !== undefined
                        && this.zPositionForPoint.center() !== undefined) {
                    value = Number.parseFloat(this.zPositionForPoint[point]() - this.zPositionForPoint.center());
                } else {
                    value = Number.parseFloat(this.zPositionForPoint[point]());
                }
                return Number.isNaN(value) ? undefined : value.toFixed(1);
            });
        });

        // Enable control for probe points
        this.controlEnabled = ko.pureComputed(() => (
            this.core.control.isOperational() && !this.core.control.isPrinting()
        ));

        // Check for control permission. If not granted the view is hidden
        this.hasPermission = ko.pureComputed(() => (
            this.core.control.loginState.hasAnyPermissionKo(this.core.control.access.permissions.CONTROL)()
        ));

        // Hide warning message, either temporarily or if disabled in the settings
        this.hideWarningTemporarily = ko.observable(false).toggleable();
        this.hideWarning = ko.pureComputed(() => (
            this.settings.plugin.hideWarning() || this.hideWarningTemporarily()
        ));
    }

    // ViewModel callbacks

    onBeforeBinding() {
        const { insertBeforeCustomControls, collapseByDefault } = this.settings.plugin;
        insertBeforeCustomControls.subscribe(ControlTab.insertView);

        ControlTab.collapseView(collapseByDefault());
        ControlTab.insertView(insertBeforeCustomControls());
    }

    onEventPositionUpdate(payload) {
        if (this.awaitingPositionUpdate) {
            this.zPositionForPoint[this.currentProbePoint](payload.z);
            this.awaitingPositionUpdate = false;
        }
    }

    // Class methods

    moveTo(point) {
        this.currentProbePoint = point;
        const position = ko.mapping.toJS(this.settings.plugin.probePoints[point]);
        const travelHight = this.settings.plugin.travelHight();
        const printerProfile = this.settings.global.printerProfiles.currentProfileData();
        const speed = {
            xy: Math.min(printerProfile.axes.x.speed(), printerProfile.axes.y.speed()),
            z: printerProfile.axes.z.speed(),
        };
        OctoPrint.control.sendGcode([
            'G90',
            `G1 Z${travelHight} F${speed.z}`,
            `G1 X${position.x} Y${position.y} F${speed.xy}`,
            'G91',
        ]);
    }

    requestPosition() {
        if (this.currentProbePoint !== undefined) {
            this.awaitingPositionUpdate = true;
            OctoPrint.control.sendGcode('M114');
        }
    }

    resetBedTopography() {
        Object.keys(this.zPositionForPoint).forEach((point) => {
            this.zPositionForPoint[point](undefined);
        });
    }

    static insertView(insertBeforeCustom) {
        document.getElementById('control').insertBefore(
            document.getElementById('control_plugin_bed_leveling'),
            insertBeforeCustom ? document.getElementById('control-jog-custom') : null,
        );
    }

    static collapseView(collapse) {
        const parentNode = document.querySelector('#control_plugin_bed_leveling .custom_section');
        const containerNode = parentNode.querySelector(':scope > div');
        const isCollapsed = containerNode.style.display === 'none';
        if (isCollapsed !== collapse) {
            const headerNode = parentNode.querySelector(':scope > h1');
            const iconNode = headerNode.querySelector(':scope > i');
            iconNode.classList.toggle('fa-caret-down');
            iconNode.classList.toggle('fa-caret-right');
            containerNode.style.display = collapse ? 'none' : null;
        }
    }
}

class Settings {
    constructor() {
        autobind.call(this);

        this.global = undefined;
        this.plugin = undefined;
    }

    initialize(settings) {
        this.global = settings;
        this.plugin = this.global.settings.plugins.bed_leveling;

        // Ensure these settings are of integer type
        this.plugin.travelHight = this.plugin.travelHight.extend({ integer: 0 });
        Object.keys(this.plugin.probePoints).forEach((point) => {
            this.plugin.probePoints[point].x = this.plugin.probePoints[point].x.extend({ integer: 0 });
            this.plugin.probePoints[point].y = this.plugin.probePoints[point].y.extend({ integer: 0 });
        });
    }
}

var registerKnockoutExtensions = () => {
    /**
     * Adds a toggle() method to an observable.
     * Calling toggle() will negate the current value.
     */
    ko.observable.fn.toggleable = function koObservableExtensionToggleable() {
        this.toggle = () => {
            this(!this());
        };
        return this;
    };

    /**
     * Convert observable to integer type.
     */
    ko.extenders.integer = function koObservableInteger(target, defaultValue) {
        const result = ko.pureComputed({
            read: target,
            write: (newValue) => {
                const newVaueInteger = Number.parseInt(newValue, 10);
                const defaultValueInteger = Number.parseInt(defaultValue, 10);
                if (Number.isNaN(newVaueInteger)) {
                    target(Number.isNaN(defaultValueInteger) ? 0 : defaultValueInteger);
                } else {
                    target(newVaueInteger);
                }
            },
        });
        result(target());
        return result;
    };
};

class BedLevelingPlugin {
    constructor(dependencies) {
        registerKnockoutExtensions();

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
