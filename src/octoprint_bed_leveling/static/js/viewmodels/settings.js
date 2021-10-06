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
    }
}
