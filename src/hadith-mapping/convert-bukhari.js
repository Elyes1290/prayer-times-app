// mishkatChapters.js

const old = [
  {
    chapterNumber: 1,
    englishTitle: "The Book on Purification",
    arabicTitle: "كتاب الطهارة عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1, 148],
  },
  {
    chapterNumber: 2,
    englishTitle: "The Book on Salat (Prayer)",
    arabicTitle: "كتاب الصلاة",
    hadithRange: [149, 451],
  },
  {
    chapterNumber: 3,
    englishTitle: "The Book on Al-Witr",
    arabicTitle: "أَبْوَابُ الْوِتْرِ",
    hadithRange: [452, 487],
  },
  {
    chapterNumber: 4,
    englishTitle: "The Book on the Day of Friday",
    arabicTitle:
      "كِتَاب الْجُمُعَةِ عَنْ رَسُولِ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ",
    hadithRange: [488, 529],
  },
  {
    chapterNumber: 5,
    englishTitle: "The Book on the Two Eids",
    arabicTitle:
      "أَبْوَابُ الْعِيدَيْنِ عَنْ رَسُولِ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ",
    hadithRange: [530, 543],
  },
  {
    chapterNumber: 6,
    englishTitle: "The Book on Traveling",
    arabicTitle: "أَبْوَابُ السَّفَرِ",
    hadithRange: [544, 616],
  },
  {
    chapterNumber: 7,
    englishTitle: "The Book on Zakat",
    arabicTitle: "كتاب الزكاة عن رسول الله صلى الله عليه وسلم",
    hadithRange: [617, 681],
  },
  {
    chapterNumber: 8,
    englishTitle: "The Book on Fasting",
    arabicTitle: "كتاب الصوم عن رسول الله صلى الله عليه وسلم",
    hadithRange: [682, 808],
  },
  {
    chapterNumber: 9,
    englishTitle: "The Book on Hajj",
    arabicTitle: "كتاب الحج عن رسول الله صلى الله عليه وسلم",
    hadithRange: [809, 964],
  },
  {
    chapterNumber: 10,
    englishTitle: "The Book on Jana''iz (Funerals)",
    arabicTitle: "كتاب الجنائز عن رسول الله صلى الله عليه وسلم",
    hadithRange: [965, 1079],
  },
  {
    chapterNumber: 11,
    englishTitle: "The Book on Marriage",
    arabicTitle: "كتاب النكاح عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1080, 1145],
  },
  {
    chapterNumber: 12,
    englishTitle: "The Book on Suckling",
    arabicTitle: "كتاب الرضاع",
    hadithRange: [1146, 1174],
  },
  {
    chapterNumber: 13,
    englishTitle: "The Book on Divorce and Li'an",
    arabicTitle: "كتاب الطلاق واللعان عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1175, 1204],
  },
  {
    chapterNumber: 14,
    englishTitle: "The Book on Business",
    arabicTitle: "كتاب البيوع عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1205, 1321],
  },
  {
    chapterNumber: 15,
    englishTitle: "The Chapters On Judgements From The Messenger of Allah",
    arabicTitle: "كتاب الأحكام عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1322, 1385],
  },
  {
    chapterNumber: 16,
    englishTitle: "The Book on Blood Money",
    arabicTitle: "كتاب الديات عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1386, 1422],
  },
  {
    chapterNumber: 17,
    englishTitle: "The Book on Legal Punishments (Al-Hudud)",
    arabicTitle: "كتاب الحدود عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1423, 1463],
  },
  {
    chapterNumber: 18,
    englishTitle: "The Book on Hunting",
    arabicTitle: "كتاب الصيد والذبائح عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1464, 1492],
  },
  {
    chapterNumber: 19,
    englishTitle: "The Book on Sacrifices",
    arabicTitle: "كتاب الأضاحى عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1493, 1523],
  },
  {
    chapterNumber: 20,
    englishTitle: "The Book on Vows and Oaths",
    arabicTitle: "كتاب النذور والأيمان عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1524, 1547],
  },
  {
    chapterNumber: 21,
    englishTitle: "The Book on Military Expeditions",
    arabicTitle: "كتاب السير عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1548, 1618],
  },
  {
    chapterNumber: 22,
    englishTitle: "The Book on Virtues of Jihad",
    arabicTitle: "كتاب فضائل الجهاد عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1619, 1669],
  },
  {
    chapterNumber: 23,
    englishTitle: "The Book on Jihad",
    arabicTitle: "كتاب الجهاد عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1670, 1719],
  },
  {
    chapterNumber: 24,
    englishTitle: "The Book on Clothing",
    arabicTitle: "كتاب اللباس",
    hadithRange: [1720, 1787],
  },
  {
    chapterNumber: 25,
    englishTitle: "The Book on Food",
    arabicTitle: "كتاب الأطعمة عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1788, 1860],
  },
  {
    chapterNumber: 26,
    englishTitle: "The Book on Drinks",
    arabicTitle: "كتاب الأشربة عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1861, 1896],
  },
  {
    chapterNumber: 27,
    englishTitle:
      "Chapters on Righteousness And Maintaining Good Relations With Relatives",
    arabicTitle: "كتاب البر والصلة عن رسول الله صلى الله عليه وسلم",
    hadithRange: [1897, 2035],
  },
  {
    chapterNumber: 28,
    englishTitle: "Chapters on Medicine",
    arabicTitle: "كتاب الطب عن رسول اللَّهِ صلى الله عليه وسلم",
    hadithRange: [2036, 2088],
  },
  {
    chapterNumber: 29,
    englishTitle: "Chapters On Inheritance",
    arabicTitle: "كتاب الفرائض عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2090, 2115],
  },
  {
    chapterNumber: 30,
    englishTitle: "Chapters On Wasaya (Wills and Testament)",
    arabicTitle: "كتاب الوصايا عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2116, 2124],
  },
  {
    chapterNumber: 31,
    englishTitle: "Chapters On Wala' And Gifts",
    arabicTitle: "كتاب الولاء والهبة عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2125, 2132],
  },
  {
    chapterNumber: 32,
    englishTitle: "Chapters On Al-Qadar",
    arabicTitle: "كتاب القدر عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2133, 2157],
  },
  {
    chapterNumber: 33,
    englishTitle: "Chapters On Al-Fitan",
    arabicTitle: "كتاب الفتن عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2158, 2269],
  },
  {
    chapterNumber: 34,
    englishTitle: "Chapters On Dreams",
    arabicTitle: "كتاب الرؤيا عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2270, 2294],
  },
  {
    chapterNumber: 35,
    englishTitle: "Chapters On Witnesses",
    arabicTitle: "كتاب الشهادات عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2295, 2303],
  },
  {
    chapterNumber: 36,
    englishTitle: "Chapters On Zuhd",
    arabicTitle: "كتاب الزهد عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2304, 2414],
  },
  {
    chapterNumber: 37,
    englishTitle:
      "Chapters on the description of the Day of Judgement, Ar-Riqaq, and Al-Wara'",
    arabicTitle: "كتاب صفة القيامة والرقائق والورع عن رسول الله",
    hadithRange: [2415, 2522],
  },
  {
    chapterNumber: 38,
    englishTitle: "Chapters on the description of Paradise",
    arabicTitle: "كتاب صفة الجنة عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2523, 2735],
  },
  {
    chapterNumber: 39,
    englishTitle: "The Book on the Description of Hellfire",
    arabicTitle: "كتاب صفة جهنم عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2573, 2605],
  },
  {
    chapterNumber: 40,
    englishTitle: "The Book on Faith",
    arabicTitle: "كتاب الإيمان عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2606, 2644],
  },
  {
    chapterNumber: 41,
    englishTitle: "Chapters on Knowledge",
    arabicTitle: "كتاب العلم عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2645, 2687],
  },
  {
    chapterNumber: 42,
    englishTitle: "Chapters on Seeking Permission",
    arabicTitle: "كتاب الاستئذان والآداب عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2688, 2735],
  },
  {
    chapterNumber: 43,
    englishTitle: "Chapters on Manners",
    arabicTitle: "كتاب الأدب عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2736, 3093],
  },
  {
    chapterNumber: 44,
    englishTitle: "Chapters on Parables",
    arabicTitle: "كتاب الأمثال عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2859, 2874],
  },
  {
    chapterNumber: 45,
    englishTitle: "Chapters on The Virtues of the Qur'an",
    arabicTitle: "كتاب ثواب القرآن عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2875, 2926],
  },
  {
    chapterNumber: 46,
    englishTitle: "Chapters on Recitation",
    arabicTitle: "كتاب القراءات عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2927, 2949],
  },
  {
    chapterNumber: 47,
    englishTitle: "Chapters on Tafsir",
    arabicTitle: "كتاب تفسير القرآن عن رسول الله صلى الله عليه وسلم",
    hadithRange: [2950, 3723],
  },
  {
    chapterNumber: 48,
    englishTitle: "Chapters on Supplication",
    arabicTitle: "كتاب الدعوات عن رسول الله صلى الله عليه وسلم",
    hadithRange: [3370, 3604],
  },
  {
    chapterNumber: 49,
    englishTitle: "Chapters on Virtues",
    arabicTitle: "كتاب المناقب عن رسول الله صلى الله عليه وسلم",
    hadithRange: [3605, 3956],
  },
];

const fixed = old
  .map((ch) => {
    if (
      !ch.hadithRange ||
      !Array.isArray(ch.hadithRange) ||
      ch.hadithRange.length < 2
    ) {
      console.log("Problème sur le chapitre:", ch);
      return null;
    }
    return {
      number: ch.chapterNumber,
      english: ch.englishTitle,
      arabic: ch.arabicTitle,
      from: ch.hadithRange[0],
      to: ch.hadithRange[1],
    };
  })
  .filter(Boolean); // Pour retirer les "null"

console.log(JSON.stringify(fixed, null, 2));
