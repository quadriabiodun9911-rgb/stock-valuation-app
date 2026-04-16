import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import EnhancedChartingScreen from '../src/screens/EnhancedChartingScreen';

jest.mock('../src/services/api', () => ({
    API_URL: 'http://localhost:8000',
}));

describe('EnhancedChartingScreen', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('shows a friendly fallback when chart data is missing', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            json: async () => ({ symbol: 'AAPL', period: '1y' }),
        } as Response);

        const { getByText } = render(
            <EnhancedChartingScreen
                route={{ params: { symbol: 'AAPL' } }}
                navigation={{ canGoBack: () => false }}
            />
        );

        await waitFor(() => {
            expect(getByText(/Chart data is currently unavailable/i)).toBeTruthy();
        });
    });
});
