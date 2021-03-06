import { autobind } from '../utils';

export default class ControlTab {
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
            this.awaitingPositionUpdate = false;
            // Set topography value if we are at a probe point
            if (this.currentProbePoint === undefined) return;
            const expectedPosition = ko.mapping.toJS(this.settings.plugin.probePoints[this.currentProbePoint]);
            if (payload.x === expectedPosition.x && payload.y === expectedPosition.y) {
                this.zPositionForPoint[this.currentProbePoint](payload.z);
            }
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
        this.awaitingPositionUpdate = true;
        OctoPrint.control.sendGcode('M114');
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
