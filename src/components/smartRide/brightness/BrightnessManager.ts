/**
 * Smart Auto Brightness System - BrightnessManager
 * Automatically calculates screen brightness based on diurnal cycles,
 * passenger overrides, and driver manual/day/night presets.
 */

export type BrightnessMode = 'AUTO' | 'BOOST' | 'NIGHT' | 'MANUAL';

export interface BrightnessProfile {
  level: number; // 10 to 100 %
  label: string; // Description of active rule
  isComfortEnabled: boolean;
  reducedGlow: boolean;
  reducedAnimations: boolean;
  reducedContrast: boolean;
  isManualOverride: boolean;
  // Prepared architecture for ESP32/LDR sensor inputs
  simulatedLux: number;
}

export class BrightnessManager {
  private static DEFAULT_BRIGHTNESS = 75; // Safe fallback standard

  /**
   * Computes the final target display brightness and active modifiers
   * 
   * @param mode Selected Brightness Mode ('AUTO' | 'BOOST' | 'NIGHT' | 'MANUAL')
   * @param manualLevel Driver custom manual slide setting (10 to 100)
   * @param ridePref Active ride audience settings from Firestore (Kids/Family/Quiet/Night overrides)
   * @param customTime Optional date override for testing/demo timelines
   */
  static calculateBrightness(
    mode: BrightnessMode = 'AUTO',
    manualLevel: number = 75,
    ridePref: any = null,
    customTime: Date = new Date()
  ): BrightnessProfile {
    try {
      const simulatedLux = this.getSimulatedAmbientLux(customTime);
      
      // Feature check: Manual override from driver
      if (mode === 'MANUAL') {
        const clampLevel = Math.max(10, Math.min(100, manualLevel));
        return {
          level: clampLevel,
          label: `Manual Override (${clampLevel}%)`,
          isComfortEnabled: clampLevel < 40,
          reducedGlow: clampLevel < 40,
          reducedAnimations: clampLevel < 30,
          reducedContrast: clampLevel < 30,
          isManualOverride: true,
          simulatedLux
        };
      }

      // Feature check: Day Boost (forced maximum solar visibility for high sunlight)
      if (mode === 'BOOST') {
        return {
          level: 100,
          label: "Daylight Visibility Boost",
          isComfortEnabled: false,
          reducedGlow: false,
          reducedAnimations: false,
          reducedContrast: false,
          isManualOverride: true,
          simulatedLux
        };
      }

      // Feature check: Night Preset (fixed dark comfort override)
      if (mode === 'NIGHT') {
        return {
          level: 30,
          label: "Driver Forced Night Shield",
          isComfortEnabled: true,
          reducedGlow: true,
          reducedAnimations: true,
          reducedContrast: true,
          isManualOverride: true,
          simulatedLux
        };
      }

      // Check current passenger context (e.g., active user selects Kids/Night/Quiet modes)
      const forceNightComfort = ridePref?.nightMode || ridePref?.driverOverrideMode === 'NIGHT' || ridePref?.driverOverrideMode === 'NIGHT_COMFORT';
      const forceQuietMode = ridePref?.muteAds || ridePref?.driverOverrideMode === 'SILENT' || ridePref?.driverOverrideMode === 'QUIET';

      if (forceNightComfort) {
        return {
          level: 30, // 25%-35% Night comfort default
          label: "🌙 Passenger Night Comfort",
          isComfortEnabled: true,
          reducedGlow: true,
          reducedAnimations: true,
          reducedContrast: true,
          isManualOverride: false,
          simulatedLux
        };
      }

      // Time-Based Auto Calculation logic (Diurnal Schedules)
      const hour = customTime.getHours();
      const minute = customTime.getMinutes();
      const timeInMinutes = hour * 60 + minute;

      let calculatedLevel = this.DEFAULT_BRIGHTNESS;
      let calculatedLabel = "Auto Schedule State";
      let comfort = false;
      let glow = false;
      let anim = false;
      let contrast = false;

      // 1. MORNING (06:00 AM - 10:00 AM) -> 90% - 100%
      if (timeInMinutes >= 360 && timeInMinutes < 600) {
        // Linear fade transition from 90% at 6am to 100% at 10am
        const progress = (timeInMinutes - 360) / 240;
        calculatedLevel = Math.round(90 + progress * 10);
        calculatedLabel = "Morning Solar Transition";
      }
      // 2. DAY (10:00 AM - 05:00 PM) -> 100%
      else if (timeInMinutes >= 600 && timeInMinutes < 1020) {
        calculatedLevel = 100;
        calculatedLabel = "Daylight Maximum Luminance";
      }
      // 3. EVENING (05:00 PM - 07:00 PM) -> 70%
      else if (timeInMinutes >= 1020 && timeInMinutes < 1140) {
        calculatedLevel = 70;
        calculatedLabel = "Sunset Dusk Adaptation";
      }
      // 4. NIGHT (07:00 PM - 11:00 PM) -> 40% - 50%
      else if (timeInMinutes >= 1140 && timeInMinutes < 1380) {
        calculatedLevel = 45;
        calculatedLabel = "Night Ambient Dimming";
        comfort = true;
        glow = true;
      }
      // 5. LATE NIGHT (11:00 PM - 05:00 AM next day) -> 20% - 30%
      else {
        calculatedLevel = 25;
        calculatedLabel = "Late Night Energy Conservation";
        comfort = true;
        glow = true;
        anim = true;
        contrast = true;
      }

      // Quiet mode dimmer correction
      if (forceQuietMode) {
        // Reduce brightness by additional 15% for cozy silence, or clamp to safe low minimums
        calculatedLevel = Math.max(15, calculatedLevel - 15);
        calculatedLabel += " (Quiet Dampened)";
        comfort = true;
        glow = true;
      }

      return {
        level: calculatedLevel,
        label: calculatedLabel,
        isComfortEnabled: comfort,
        reducedGlow: glow,
        reducedAnimations: anim,
        reducedContrast: contrast,
        isManualOverride: false,
        simulatedLux
      };
    } catch (e) {
      console.error("[BrightnessManager] Calculation error, routing fallback:", e);
      return {
        level: this.DEFAULT_BRIGHTNESS,
        label: "Failsafe Active (75%)",
        isComfortEnabled: false,
        reducedGlow: false,
        reducedAnimations: false,
        reducedContrast: false,
        isManualOverride: false,
        simulatedLux: 250 // Typical safe indoor lux value
      };
    }
  }

  /**
   * Prepared architecture for ESP32 LDR ambient sensor integration.
   * Calculates simulated physical LUX values based on local solar positions.
   */
  static getSimulatedAmbientLux(time: Date): number {
    const hour = time.getHours();
    // Lux cycles from ~2 lux in pitch black to ~10000 lux in direct sunlight
    if (hour >= 10 && hour <= 16) {
      return 10000; // Bright solar zenith
    }
    if (hour >= 6 && hour < 10) {
      return 1500; // Soft morning
    }
    if (hour > 16 && hour <= 19) {
      return 400; // Twilight glow
    }
    return 15; // Simulated dark street cabin light readings
  }
}
