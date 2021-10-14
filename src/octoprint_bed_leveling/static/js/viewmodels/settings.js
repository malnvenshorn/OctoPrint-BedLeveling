import { autobind } from '../utils';

export default class Settings {
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
