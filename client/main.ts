import { stateBagWrapper } from "./utils";
import { HornOverride, PrimarySirenOverride, AddonAudioBanks, Debug, debugLog } from "../shared/shared";
import { sirenConfig } from "./sirens";

const curSirenSound: Map<number, number> = new Map<number, number>();
const curSiren2Sound: Map<number, number> = new Map<number, number>();
const curHornSound: Map<number, number> = new Map<number, number>();

const exp = global.exports;

exp("getAddonAudioBanks", () => AddonAudioBanks);
exp("getCurSirenSound", () => curSirenSound);
exp("getCurSiren2Sound", () => curSiren2Sound);
exp("getCurHornSound", () => curHornSound);
exp("getDebug", () => Debug);

const getSoundBankForSound = (sound: string): string => {
  for (const [key, value] of AddonAudioBanks) {
    if (typeof value.sounds === "string") {
      if (value.sounds === sound) {
        return key;
      }
    } else {
      for (let i = 1; i < value.sounds.length; i++) {
        if (value.sounds[i] === sound) {
          return key;
        }
      }
    }
  }
  return "";
}

const isAllowedSirens = (veh: number, ped: number): boolean =>
  GetPedInVehicleSeat(veh, -1) === ped && GetVehicleClass(veh) === 18 && !IsPedInAnyHeli(ped) && !IsPedInAnyPlane(ped);

exp("isAllowedSirens", isAllowedSirens);

const releaseSirenSound = (veh: number, soundId: number, isCleanup = false): void => {
  if (isCleanup && (DoesEntityExist(veh) && !IsEntityDead(veh))) return;
  StopSound(soundId);
  ReleaseSoundId(soundId);
  curSirenSound.delete(veh);
}

exp("releaseSirenSound", releaseSirenSound);

const releaseSiren2Sound = (veh: number, soundId: number, isCleanup = false): void => {
  if (isCleanup && (DoesEntityExist(veh) && !IsEntityDead(veh))) return;
  StopSound(soundId);
  ReleaseSoundId(soundId);
  curSiren2Sound.delete(veh);
}

exp("releaseSiren2Sound", releaseSiren2Sound);

const releaseHornSound = (veh: number, soundId: number, isCleanup = false): void => {
  if (isCleanup && (DoesEntityExist(veh) && !IsEntityDead(veh))) return;
  StopSound(soundId);
  ReleaseSoundId(soundId);
  curHornSound.delete(veh);
}

exp("releaseHornSound", releaseHornSound);

let restoreSiren: number = 0;

RegisterCommand("+sirenModeHold", (): void => {
  const ped: number = PlayerPedId();
  const veh: number = GetVehiclePedIsIn(ped, false);

  if (!isAllowedSirens(veh, ped)) return;

  const ent: StateBagInterface = Entity(veh).state;

  if ((ent.sirenOn || ent.siren2On) && ent.lightsOn) return;

  ent.set("sirenMode", 1, true);
}, false);

RegisterCommand("-sirenModeHold", (): void => {
  const ped: number = PlayerPedId();
  const veh: number = GetVehiclePedIsIn(ped, false);

  if (!isAllowedSirens(veh, ped)) return;

  const ent: StateBagInterface = Entity(veh).state;

  ent.set("sirenMode", 0, true);
}, false);

RegisterKeyMapping("+sirenModeHold", "Hold this button to sound your emergency vehicle's siren", "keyboard", "R");

RegisterCommand("sirenSoundCycle", (): void => {
  const ped: number = PlayerPedId();
  const veh: number = GetVehiclePedIsIn(ped, false);
  const modelName = GetDisplayNameFromVehicleModel(GetEntityModel(veh)).toLowerCase();

  const sirenPack = getSirensForVehicle(modelName);

  if (!isAllowedSirens(veh, ped)) return;

  const ent: StateBagInterface = Entity(veh).state;

  if (!ent.lightsOn) return;

  let newSirenMode: number = (ent.sirenMode || 0) + 1;

  if (newSirenMode > sirenPack.sirens.length) {
    newSirenMode = 1;
  }

  PlaySoundFrontend(-1, "NAV_UP_DOWN", "HUD_FRONTEND_DEFAULT_SOUNDSET", true);

  ent.set("sirenOn", true, true);
  ent.set("sirenMode", newSirenMode, true);
}, false);

RegisterKeyMapping("sirenSoundCycle", "Cycle through your emergency vehicle's siren sounds whilst your emergency lights are on", "keyboard", "COMMA");

RegisterCommand("sirenSoundOff", (): void => {
  const ped: number = PlayerPedId();
  const veh: number = GetVehiclePedIsIn(ped, false);

  if (!isAllowedSirens(veh, ped)) return;

  const ent: StateBagInterface = Entity(veh).state;

  ent.set("sirenOn", false, true);
  ent.set("siren2On", false, true);
  ent.set("sirenMode", 0, true);
  ent.set("siren2Mode", 0, true);
}, false);

RegisterKeyMapping("sirenSoundOff", "Turn off your sirens after being toggled", "keyboard", "PERIOD");

RegisterCommand("+hornHold", (): void => {
  const ped: number = PlayerPedId();
  const veh: number = GetVehiclePedIsIn(ped, false);

  if (!isAllowedSirens(veh, ped)) return;

  const ent: StateBagInterface = Entity(veh).state;

  if (ent.horn) return;

  ent.set("horn", true, true);
  restoreSiren = ent.sirenMode;
  ent.set("sirenMode", 0, true);
}, false);

RegisterCommand("-hornHold", (): void => {
  const ped: number = PlayerPedId();
  const veh: number = GetVehiclePedIsIn(ped, false);

  if (!isAllowedSirens(veh, ped)) return;

  const ent: StateBagInterface = Entity(veh).state;

  if (!ent.horn) return;

  ent.set("horn", false, true);
  ent.set("sirenMode", ent.lightsOn ? restoreSiren : 0, true);
  restoreSiren = 0;
}, false);

RegisterKeyMapping("+hornHold", "Hold this button to sound your vehicle's horn", "keyboard", "E");

RegisterCommand("sirenSound2Cycle", (): void => {
  const ped: number = PlayerPedId();
  const veh: number = GetVehiclePedIsIn(ped, false);

  if (!isAllowedSirens(veh, ped)) return;

  const ent: StateBagInterface = Entity(veh).state;

  let newSirenMode: number = (ent.siren2Mode || 0) + 1;
  const sounds: string | string[] = PrimarySirenOverride.get(GetEntityModel(veh)) || "";
  if (sounds === "string") {
    newSirenMode = 1;
  } else {
    if (newSirenMode > sounds.length) {
      newSirenMode = 1;
    }
  }

  PlaySoundFrontend(-1, "NAV_UP_DOWN", "HUD_FRONTEND_DEFAULT_SOUNDSET", true);

  ent.set("siren2On", true, true);
  ent.set("siren2Mode", newSirenMode, true);
}, false);

RegisterKeyMapping("sirenSound2Cycle", "Cycle through your emergency vehicle's secondary siren sounds, this doesn't require your emergency lights to be on", "keyboard", "UP");

RegisterCommand("sirenLightsToggle", (): void => {
  const ped: number = PlayerPedId();
  const veh: number = GetVehiclePedIsIn(ped, false);

  if (!isAllowedSirens(veh, ped)) return;

  const ent: StateBagInterface = Entity(veh).state;

  PlaySoundFrontend(-1, "NAV_UP_DOWN", "HUD_FRONTEND_DEFAULT_SOUNDSET", true);
  const curMode: boolean = ent.lightsOn;
  ent.set("lightsOn", !curMode, true);

  if (!curMode) return;

  ent.set("siren2On", false, true);
  ent.set("sirenOn", false, true);
  ent.set("sirenMode", 0, true);
}, false);

RegisterKeyMapping("sirenLightsToggle", "Toggle your emergency vehicle's siren lights", "keyboard", "Q");

stateBagWrapper("horn", (ent: number, value: boolean): void => {
  const relHornId: number | undefined = curHornSound.get(ent);
  if (relHornId !== undefined) {
    releaseHornSound(ent, relHornId);
    debugLog(`[horn] ${ent} has sound, releasing sound id ${relHornId}`);
  };
  if (!value) return;
  const soundId: number = GetSoundId();
  debugLog(`[horn] Setting sound id ${soundId} for ${ent}`);
  curHornSound.set(ent, soundId);
  const soundName: string = HornOverride.get(GetEntityModel(ent)) || "SIRENS_AIRHORN";
  PlaySoundFromEntity(soundId, soundName, ent, 0 as any, false, 0);
});

stateBagWrapper("lightsOn", (ent: number, value: boolean): void => {
  SetVehicleHasMutedSirens(ent, true);
  SetVehicleSiren(ent, value);
  debugLog(`[lights] ${ent} has sirens ${value ? 'on' : 'off'}`);
});

stateBagWrapper("sirenMode", (ent: number, soundMode: number): void => {
  const modelName = GetDisplayNameFromVehicleModel(GetEntityModel(ent)).toLowerCase();

  const sirenPack = getSirensForVehicle(modelName);

  const relSoundId: number | undefined = curSirenSound.get(ent);
  if (relSoundId !== undefined) {
    releaseSirenSound(ent, relSoundId);
    debugLog(`[sirenMode] ${ent} has sound, releasing sound id ${relSoundId}`);
  };
  if (soundMode === 0) return;
  const soundId: number = GetSoundId();
  curSirenSound.set(ent, soundId);
  debugLog(`[sirenMode] Setting sound id ${soundId} for ${ent}`);

  const siren = sirenPack.sirens[soundMode - 1];
  if(siren) {
    PlaySoundFromEntity(soundId, siren.soundName, ent, siren.soundPack || 0 as any, false, 0);
    debugLog(`[sirenMode] playing sound ${siren.soundName} of pack ${sirenPack.name} for ${modelName} with sound id ${soundId}`);
  } else {
    releaseSirenSound(ent, soundId);
    debugLog(`[sirenMode] invalid soundMode sent to ${ent} with sound id ${soundId}, releasing sound`);    
  }
});

stateBagWrapper("siren2Mode", (ent: number, soundMode: number): void => {
  const relSoundId: number | undefined = curSiren2Sound.get(ent);
  if (relSoundId !== undefined) {
    releaseSiren2Sound(ent, relSoundId);
    debugLog(`[siren2Mode] ${ent} has sound, releasing sound id ${relSoundId}`);
  };
  if (soundMode === 0) return;
  const soundId: number = GetSoundId();
  curSiren2Sound.set(ent, soundId);
  debugLog(`[siren2Mode] Setting sound id ${soundId} for ${ent}`);
  const sounds: string | string[] = PrimarySirenOverride.get(GetEntityModel(ent)) || "VEHICLES_HORNS_SIREN_1";
  if (typeof sounds === "string") {
    const soundBank = getSoundBankForSound(sounds);
    PlaySoundFromEntity(soundId, sounds, ent, soundBank !== "" ? soundBank : 0 as any, false, 0);
    debugLog(`[siren2Mode] playing sound 1 for ${ent} with sound id ${soundId}`);
  } else {
    for (let i = 0; i < sounds.length; i++) {
      if ((soundMode - 1) === i) {
        const soundBank = getSoundBankForSound(sounds[i]);
        PlaySoundFromEntity(soundId, sounds[i], ent, soundBank !== "" ? soundBank : 0 as any, false, 0);
        debugLog(`[siren2Mode] playing sound ${i + 1} for ${ent} with sound id ${soundId}`);
        return;
      }
    }
    releaseSirenSound(ent, soundId);
    debugLog(`[siren2Mode] invalid soundMode sent to ${ent} with sound id ${soundId}, releasing sound`);
  }
});

const getSirensForVehicle = (modelName: string): any => {
  const sirenPack = sirenConfig.find((pack: any) => {
    const checkWhitelist = pack.whitelist.find((whitelist: any) => whitelist == modelName)

    return checkWhitelist !== undefined ? true : false;
  });

  return sirenPack !== undefined ? sirenPack : sirenConfig.find((pack: any) => pack.name == 'default');
}

// Blinker //
let leftIndicatorTick: any = null;
let leftIndicatorTimeout: any = null;

RegisterCommand("leftIndicatorToggle", (): void => {
  const ped: number = PlayerPedId();
  const veh: number = GetVehiclePedIsIn(ped, false);

  const ent: StateBagInterface = Entity(veh).state;

  const curMode: boolean = ent.leftIndicatorOn;
  ent.set("leftIndicatorOn", !curMode, true);

  leftIndicatorTick = setTick(() => {
    const speed = GetEntitySpeed(veh);
    if(speed > 10 && !leftIndicatorTimeout) {
      leftIndicatorTimeout = setTimeout(() => {
        ent.set("leftIndicatorOn", false, true);
        clearTick(leftIndicatorTick);
        leftIndicatorTick = null;
        leftIndicatorTimeout = null;
      }, 3000);
    }
  });
}, false);

RegisterKeyMapping("leftIndicatorToggle", "Toggle left indicator", "keyboard", "LEFT");

stateBagWrapper("leftIndicatorOn", (ent: number, mode: boolean): void => {
  SetVehicleIndicatorLights(ent, 1, mode);
});

let rightIndicatorTick: any = null;
let rightIndicatorTimeout: any = null;

RegisterCommand("rightIndicatorToggle", (): void => {
  const ped: number = PlayerPedId();
  const veh: number = GetVehiclePedIsIn(ped, false);

  const ent: StateBagInterface = Entity(veh).state;

  const curMode: boolean = ent.rightIndicatorOn;
  ent.set("rightIndicatorOn", !curMode, true);

  rightIndicatorTick = setTick(() => {
    const speed = GetEntitySpeed(veh);
    if(speed > 10 && !rightIndicatorTimeout) {
      rightIndicatorTimeout = setTimeout(() => {
        ent.set("rightIndicatorOn", false, true);
        clearTick(rightIndicatorTick);
        rightIndicatorTick = null;
        rightIndicatorTimeout = null;
      }, 3000);
    }
  });  
}, false);

RegisterKeyMapping("rightIndicatorToggle", "Toggle right indicator", "keyboard", "RIGHT");

stateBagWrapper("rightIndicatorOn", (ent: number, mode: boolean): void => {
  SetVehicleIndicatorLights(ent, 0, mode);
});