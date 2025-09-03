-- ========================================
-- 📚 EXEMPLE DE CONTENU - NAISSANCE DU PROPHÈTE (PBUH)
-- ========================================
-- Cette histoire sera ajoutée à votre base de données comme exemple

INSERT INTO prophet_stories (
    id, title, title_arabic, introduction, conclusion, moral_lesson,
    category, difficulty, age_recommendation, reading_time, word_count,
    chronological_order, historical_period_start, historical_location, historical_context,
    is_premium, has_interactive_elements, created_at
) VALUES (
    'birth_of_prophet',
    'La Naissance du Prophète Mohammad',
    'ولادة النبي محمد صلى الله عليه وسلم',
    'L''année de l''éléphant, 570 après J.C., allait marquer l''histoire de l''humanité pour l''éternité. Dans la noble ville de La Mecque, au cœur de la péninsule arabique, naissait celui qui deviendrait le dernier des messagers de Dieu. Cette naissance était entourée de signes divins et de bénédictions qui annonçaient la venue d''une lumière pour toute l''humanité.',
    'Ainsi naquit Mohammad ibn Abdallah, que la paix et les bénédictions de Dieu soient sur lui. Sa naissance marqua le début d''une nouvelle ère pour l''humanité, une ère de guidance, de miséricorde et de justice. Les signes qui accompagnèrent sa venue au monde témoignaient déjà de la grandeur de sa mission future.',
    'La naissance du Prophète (ﷺ) nous enseigne que Dieu prépare Ses messagers dès leur plus jeune âge, et que même dans les moments les plus sombres de l''histoire, Il envoie Sa lumière pour guider l''humanité vers le droit chemin.',
    'childhood',
    'beginner',
    8,
    7,
    850,
    1,
    -53, -- 570 après J.C. = environ -53 de l'hégire
    'La Mecque',
    'Époque de l''ignorance (Jahiliyyah) en Arabie, domination des tribus, culte des idoles',
    FALSE, -- Gratuit pour commencer
    TRUE,
    NOW()
);

-- Chapitres de l'histoire
INSERT INTO prophet_story_chapters (id, story_id, title, content, chapter_order, reading_time) VALUES
('birth_chapter_1', 'birth_of_prophet', 'L''Année de l''Éléphant', 
'L''année qui vit naître le Prophète Mohammad (ﷺ) fut appelée "l''Année de l''Éléphant" (Am al-Fil). Cette année-là, Abraha al-Habashi, gouverneur du Yémen pour les Abyssiniens, avait tenté de détruire la Kaaba avec une grande armée comprenant des éléphants.

Abraha avait construit une magnifique cathédrale à Sana''a et voulait détourner les pèlerins arabes de La Mecque vers sa construction. Voyant que son plan échouait, il décida de détruire le sanctuaire sacré de La Mecque.

Mais Allah (سبحانه وتعالى) protégea Sa maison sacrée. Lorsque l''armée d''Abraha approcha de La Mecque, les éléphants refusèrent d''avancer vers la ville sainte. Puis, des nuées d''oiseaux (Ababil) apparurent dans le ciel, lançant sur l''armée des pierres d''argile durcie (sijjil), détruisant complètement les assaillants.

Le Coran immortalise cet événement dans la sourate Al-Fil : "N''as-tu pas vu comment ton Seigneur a agi envers les gens de l''Éléphant ? N''a-t-Il pas rendu leur ruse complètement vaine ? Et envoyé sur eux des oiseaux par volées, qui leur lançaient des pierres d''argile ? Et Il les a rendus semblables à de la paille mâchée."

Cette protection divine de la Kaaba préparait le terrain pour la naissance de celui qui allait purifier ce lieu saint et restaurer le culte du Dieu unique.', 1, 3),

('birth_chapter_2', 'birth_of_prophet', 'La Naissance Bénie',
'Quelques mois après les événements de l''Année de l''Éléphant, par une nuit bénie du mois de Rabi'' al-Awwal, naquit Mohammad ibn Abdallah (ﷺ).

Son père, Abdallah ibn Abd al-Muttalib, était décédé quelques mois avant sa naissance, laissant Aminah bint Wahb, sa mère, veuve et enceinte. Malgré cette épreuve, la naissance du futur Prophète fut accompagnée de signes extraordinaires.

Selon les récits authentiques, la mère du Prophète raconta : "Lorsque je l''ai mis au monde, une lumière sortit de moi qui illumina les châteaux de Bosra en Syrie." Cette lumière symbolisait la guidance que ce nouveau-né apporterait au monde entier.

D''autres signes accompagnèrent cette naissance bénie : les idoles du temple de la Kaaba se prosternèrent, le feu sacré des Perses, qui brûlait depuis mille ans, s''éteignit, et le lac de Sawah en Perse se dessécha.

Aminah (رضي الله عنها) ressentit une facilité extraordinaire pendant l''accouchement, et elle entendit une voix lui dire : "Tu viens de donner naissance au maître de cette communauté. Quand tu le mettras au monde, dis : ''Je le place sous la protection du Dieu Unique contre le mal de tout envieux'', puis nomme-le Mohammad."

Le nouveau-né vint au monde circoncis, le cordon ombilical déjà coupé, dans une parfaite pureté. Il naquit en se prosternant, les mains posées au sol et le visage levé vers le ciel, comme s''il rendait déjà grâce à son Créateur.', 2, 3),

('birth_chapter_3', 'birth_of_prophet', 'Les Premiers Jours',
'Les premiers jours qui suivirent la naissance du Prophète (ﷺ) furent marqués par la joie et les célébrations, malgré l''absence de son père.

Abd al-Muttalib, son grand-père paternel et chef de la tribu des Banou Hachim, fut le premier à tenir son petit-fils dans ses bras. Submergé par l''émotion et pressentant la grandeur de cet enfant, il le nomma Mohammad, un nom qui n''était pas courant à l''époque chez les Arabes.

Quand on lui demanda pourquoi il avait choisi ce nom, Abd al-Muttalib répondit avec une intuition prophétique : "Je veux qu''il soit loué dans les cieux et sur la terre." Le nom Mohammad signifie en effet "le très loué", et cette prophétie allait se réaliser au-delà de tout ce qu''il pouvait imaginer.

Selon la coutume des nobles familles de La Mecque, on chercha une nourrice bédouine pour allaiter l''enfant. Les femmes de la tribu des Banou Sa''d, réputées pour la pureté de leur langue arabe et la salubrité de leur environnement désertique, vinrent à La Mecque chercher des nourrissons.

Halimah as-Sa''diyyah (رضي الله عنها), accompagnée de son mari et de leur fils, était venue elle aussi chercher un enfant à nourrir. Elle était pauvre et son âne était si faible qu''elle arrivait toujours la dernière. Cette fois-là, toutes les autres femmes avaient choisi des enfants de familles riches, espérant des récompenses généreuses.

Il ne restait que Mohammad (ﷺ), l''orphelin de père. Halimah hésita d''abord, craignant que la famille ne puisse pas la payer convenablement. Mais son mari lui dit : "Prends-le quand même. Peut-être Allah nous bénira-t-Il à travers cet enfant."

Dès qu''Halimah prit Mohammad (ﷺ) dans ses bras, les bénédictions commencèrent à se manifester : son âne devint vigoureux, ses chamelles donnèrent plus de lait, et la prospérité s''installa dans sa maison.', 3, 2);

-- Références islamiques
INSERT INTO prophet_story_references (story_id, type, source, reference_text, authenticity, content, translation, relevance, reference_order) VALUES
('birth_of_prophet', 'quran', 'Sourate Al-Fil', 'Coran 105:1-5', 'sahih', 
'أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ. أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ. وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ. تَرْمِيهِم بِحِجَارَةٍ مِّن سِجِّيلٍ. فَجَعَلَهُمْ كَعَصْفٍ مَّأْكُولٍ',
'N''as-tu pas vu comment ton Seigneur a agi envers les gens de l''Éléphant ? N''a-t-Il pas rendu leur ruse complètement vaine ? Et envoyé sur eux des oiseaux par volées, qui leur lançaient des pierres d''argile ? Et Il les a rendus semblables à de la paille mâchée.',
'Cette sourate décrit les événements de l''Année de l''Éléphant, année de la naissance du Prophète', 1),

('birth_of_prophet', 'hadith', 'Sahih Muslim', 'Hadith rapporté par Aminah bint Wahb', 'sahih',
'عن أم رسول الله صلى الله عليه وسلم أنها قالت: لما ولدته خرج مني نور أضاء له قصور الشام',
'La mère du Messager d''Allah (ﷺ) a dit : "Quand je l''ai mis au monde, une lumière est sortie de moi qui a illuminé les châteaux de Syrie"',
'Témoigne des signes extraordinaires qui accompagnèrent la naissance du Prophète', 2),

('birth_of_prophet', 'sira', 'Sirat Ibn Hisham', 'Vol. 1, p. 158-162', 'sahih',
'فلما وضعته أمه أرسلت إلى جده عبد المطلب أن قد ولد لك غلام فائته فانظر إليه',
'Quand sa mère l''eut mis au monde, elle envoya dire à son grand-père Abd al-Muttalib : "Il t''est né un garçon, viens le voir"',
'Récit détaillé de la naissance et de la réaction du grand-père', 3),

('birth_of_prophet', 'historical', 'At-Tabari', 'Tarikh at-Tabari, Vol. 2', 'hasan',
'ولد رسول الله صلى الله عليه وسلم عام الفيل لاثنتي عشرة ليلة خلت من ربيع الأول',
'Le Messager d''Allah (ﷺ) naquit l''année de l''Éléphant, le douze du mois de Rabi'' al-Awwal',
'Précise la date traditionnelle de la naissance du Prophète', 4);

-- Glossaire des termes islamiques
INSERT INTO prophet_story_glossary (story_id, term, arabic_term, definition, pronunciation, category) VALUES
('birth_of_prophet', 'Jahiliyyah', 'الجاهلية', 'Époque de l''ignorance pré-islamique en Arabie, caractérisée par l''idolâtrie et l''absence de guidance divine révélée', 'ja-hi-li-yah', 'histoire'),
('birth_of_prophet', 'Kaaba', 'الكعبة', 'Construction sacrée cubique située au centre de la Grande Mosquée de La Mecque, première maison construite pour l''adoration d''Allah', 'ka-a-ba', 'lieux'),
('birth_of_prophet', 'Am al-Fil', 'عام الفيل', 'L''Année de l''Éléphant, année de la naissance du Prophète Mohammad (ﷺ), marquée par la tentative d''Abraha de détruire la Kaaba', 'am al-fil', 'histoire'),
('birth_of_prophet', 'Rabi'' al-Awwal', 'ربيع الأول', 'Troisième mois du calendrier lunaire islamique, mois traditionnel de la naissance du Prophète', 'ra-bi al-aw-wal', 'temps'),
('birth_of_prophet', 'Banou Hachim', 'بنو هاشم', 'Clan noble de la tribu de Quraych auquel appartenait le Prophète Mohammad (ﷺ)', 'ba-nou ha-chim', 'tribus'),
('birth_of_prophet', 'Halimah as-Sa''diyyah', 'حليمة السعدية', 'Nourrice bédouine du Prophète Mohammad (ﷺ) de la tribu des Banou Sa''d', 'ha-li-ma as-sa-di-yah', 'personnages'),
('birth_of_prophet', 'Sallallahu alayhi wa sallam', 'صلى الله عليه وسلم', 'Formule de respect signifiant "que la paix et les bénédictions d''Allah soient sur lui", utilisée après le nom du Prophète Mohammad', 'sal-lal-la-hou a-lay-hi wa sal-lam', 'expressions'),
('birth_of_prophet', 'Radiyallahu anha', 'رضي الله عنها', 'Formule signifiant "qu''Allah soit satisfait d''elle", utilisée pour les femmes compagnonnes du Prophète', 'ra-di-yal-la-hou an-ha', 'expressions');

-- Données d'exemple pour l'utilisateur de test (remplacez USER_ID par un ID réel)
-- INSERT INTO user_story_progress (user_id, story_id, current_chapter, current_position, completion_percentage, time_spent) VALUES
-- (1, 'birth_of_prophet', 0, 0, 0, 0);

-- INSERT INTO user_story_favorites (user_id, story_id) VALUES
-- (1, 'birth_of_prophet');
