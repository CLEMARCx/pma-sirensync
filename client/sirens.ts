export const sirenConfig = [
    {
      name: 'default',
      sirens: [
        {
            soundName: "VEHICLES_HORNS_SIREN_1",
        }
      ],
      whitelist: []
    },
    {
      name: 'amr',
      sirens: [
        {
            soundName: "VEHICLES_HORNS_SIREN_1",
        },
        {
            soundName: "VEHICLES_HORNS_SIREN_2",
        },
        {
            soundName: "SIREN_ALPHA",
            soundPack: "DLC_WMSIRENS_SOUNDSET",
        }
      ],
      whitelist: ['ambulan']
    },
    {
      name: 'lapd',
      sirens: [
        {
            soundName: "SIREN_ALPHA",
            soundPack: "DLC_WMSIRENS_SOUNDSET",
        },
        {
            soundName: "VEHICLES_HORNS_SIREN_2",
        }    
      ],
      whitelist: ['police10', 'police11', 'fbi']
    }
]