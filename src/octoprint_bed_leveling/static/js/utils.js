/* eslint-disable import/prefer-default-export */

/**
 * When a function is called as a method of an object, 'this' is set to the object the method is
 * called on. This 'autobind' function is intended to be used within a class constructor to bind
 * all methods to the instance itself. This allows to pass methods as callback functions and be
 * sure that the callback will be invoked with the correct context.
 */
export function autobind() {
    const prototype = Object.getPrototypeOf(this);
    Object.getOwnPropertyNames(prototype).forEach((name) => {
        if (typeof this[name] === 'function' && name !== 'constructor') {
            this[name] = this[name].bind(this);
        }
    });
}
