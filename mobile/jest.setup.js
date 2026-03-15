import 'react-native-gesture-handler/jestSetup';
import '@testing-library/jest-native/extend-expect';

jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => { };
    return Reanimated;
});

jest.mock('react-native-gesture-handler/lib/commonjs/RNGestureHandlerModule', () => ({
    default: {
        install: jest.fn(),
        flushOperations: jest.fn(),
    },
}));

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('@react-native-async-storage/async-storage', () => {
    const store = {};
    return {
        getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
        setItem: jest.fn((key, value) => {
            store[key] = value;
            return Promise.resolve(true);
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
            return Promise.resolve();
        }),
        clear: jest.fn(() => {
            Object.keys(store).forEach((key) => delete store[key]);
            return Promise.resolve();
        }),
    };
});

const originalConsoleError = console.error;
console.error = (...args) => {
    const firstArg = args[0];
    if (typeof firstArg === 'string' && firstArg.includes('not wrapped in act')) {
        return;
    }

    originalConsoleError(...args);
};

// Mock expo native modules that Jest environment doesn't provide
jest.mock('expo-modules-core', () => {
    class EventEmitter {
        addListener() { }
        removeAllListeners() { }
        removeSubscription() { }
    }

    // requireNativeViewManager/requireNativeModule are used by some native libraries
    const requireNativeViewManager = () => () => null;
    const requireNativeModule = () => ({});

    return {
        EventEmitter,
        NativeModulesProxy: {},
        CodedError: Error,
        requireNativeViewManager,
        requireNativeModule,
    };
});

// Mock expo-font to avoid native font loading during tests
jest.mock('expo-font', () => ({
    loadAsync: jest.fn(() => Promise.resolve()),
}));

// Mock vector-icons to a simple React component
jest.mock('@expo/vector-icons', () => {
    const React = require('react');
    const MockIcon = (props) => React.createElement('Text', props, props.name || 'icon');
    return {
        Ionicons: MockIcon,
        AntDesign: MockIcon,
        MaterialIcons: MockIcon,
        default: MockIcon,
    };
});
