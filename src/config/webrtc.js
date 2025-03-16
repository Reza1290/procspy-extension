export const videoParams = {
    encodings: [
        {
            rid: 'r0',
            maxBitrate: 100000,
            scalabilityMode: 'S1T3',
            dtx: true
        },
        {
            rid: 'r1',
            maxBitrate: 300000,
            scalabilityMode: 'S1T3',
            dtx: true

        },
        {
            rid: 'r2',
            maxBitrate: 900000,
            scalabilityMode: 'S1T3',
            dtx: true

        },
    ],
    codecOptions: {
        videoGoogleStartBitrate: 1000
    }
}