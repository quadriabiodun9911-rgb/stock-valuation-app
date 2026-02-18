import '@testing-library/jest-native/extend-expect';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

const originalConsoleError = console.error;
console.error = (...args) => {
    const firstArg = args[0];
    if (typeof firstArg === 'string' && firstArg.includes('not wrapped in act')) {
        return;
    }

    originalConsoleError(...args);
};
