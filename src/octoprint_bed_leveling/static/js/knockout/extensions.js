export default () => {
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
