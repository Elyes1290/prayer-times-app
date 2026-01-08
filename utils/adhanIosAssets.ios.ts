export const getAdhanIosSound = (soundName: string): any => {
  const soundObjects: Record<string, any> = {
    adhamalsharqawe: require("../assets/soundsComplete-ios/adhamalsharqawe.mp3"),
    adhanaljazaer: require("../assets/soundsComplete-ios/adhanaljazaer.mp3"),
    ahmadnafees: require("../assets/soundsComplete-ios/ahmadnafees.mp3"),
    ahmedelkourdi: require("../assets/soundsComplete-ios/ahmedelkourdi.mp3"),
    dubai: require("../assets/soundsComplete-ios/dubai.mp3"),
    karljenkins: require("../assets/soundsComplete-ios/karljenkins.mp3"),
    mansourzahrani: require("../assets/soundsComplete-ios/mansourzahrani.mp3"),
    misharyrachid: require("../assets/soundsComplete-ios/misharyrachid.mp3"),
    mustafaozcan: require("../assets/soundsComplete-ios/mustafaozcan.mp3"),
    masjidquba: require("../assets/soundsComplete-ios/masjidquba.mp3"),
    islamsobhi: require("../assets/soundsComplete-ios/islamsobhi.mp3"),
  };
  return soundObjects[soundName];
};
