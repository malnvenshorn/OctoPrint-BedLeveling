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
};
